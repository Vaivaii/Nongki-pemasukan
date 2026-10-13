/*
 * Nongki Google Sheets bridge (OAuth client-side).
 * Only a Google OAuth Client ID is public configuration; never place a client secret here.
 * The spreadsheet must be shared with / owned by the authenticated Google account.
 */
const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const USERINFO_API = 'https://openidconnect.googleapis.com/v1/userinfo';

let gisPromise;
let tokenClient;
let activeAccessToken = null;
let activeEmail = null;

function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => window.google?.accounts?.oauth2
      ? resolve()
      : reject(new Error('Google Identity Services tidak tersedia.'));
    script.onerror = () => reject(new Error('Gagal memuat layanan login Google.'));
    document.head.appendChild(script);
  });
  return gisPromise;
}

export async function connectGoogleSheets({ clientId, allowedEmail }) {
  if (!clientId || clientId.includes('GANTI_DENGAN')) {
    throw new Error('Google OAuth Client ID belum dikonfigurasi.');
  }
  if (!allowedEmail || allowedEmail.includes('GANTI_DENGAN')) {
    throw new Error('Email pemilik belum dikonfigurasi.');
  }
  await loadGoogleIdentity();

  const token = await new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email https://www.googleapis.com/auth/spreadsheets',
      include_granted_scopes: true,
      callback: response => {
        if (response?.error || !response?.access_token) {
          reject(new Error(response?.error_description || response?.error || 'Login Google dibatalkan.'));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: error => reject(new Error(error?.message || 'Login Google gagal.'))
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });

  activeAccessToken = token;
  const profileResponse = await fetch(USERINFO_API, {
    headers: { Authorization: 'Bearer ' + activeAccessToken }
  });
  if (!profileResponse.ok) {
    activeAccessToken = null;
    throw new Error('Tidak dapat memverifikasi akun Google.');
  }
  const profile = await profileResponse.json();
  activeEmail = String(profile.email || '').toLowerCase();
  if (!profile.email_verified || activeEmail !== allowedEmail.toLowerCase()) {
    activeAccessToken = null;
    activeEmail = null;
    throw new Error('Akun Google ini tidak diizinkan untuk aplikasi Nongki.');
  }
  return { email: activeEmail };
}

export function getGoogleSheetsConnection() {
  return activeAccessToken && activeEmail ? { email: activeEmail } : null;
}

export function disconnectGoogleSheets() {
  if (activeAccessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(activeAccessToken, () => {});
  }
  activeAccessToken = null;
  activeEmail = null;
}

async function sheetsRequest(url, options = {}) {
  if (!activeAccessToken) throw new Error('Hubungkan akun Google terlebih dahulu.');
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + activeAccessToken,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) activeAccessToken = null;
    throw new Error(body?.error?.message || 'Google Sheets API gagal (HTTP ' + response.status + ').');
  }
  return body;
}

/*
 * Expected sheet columns (row 1 headers):
 * A: Tanggal (YYYY-MM-DD), B: Kategori, C: Total, D: Diperbarui
 * This function updates the existing matching date/category row or appends one.
 */
export async function upsertDailyIncome({ spreadsheetId, sheetName = 'INCOME LOG', date, amount, category = 'Penjualan global' }) {
  if (!spreadsheetId || spreadsheetId.includes('GANTI_DENGAN')) {
    throw new Error('Spreadsheet ID belum dikonfigurasi.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Format tanggal harus YYYY-MM-DD.');
  if (!Number.isFinite(Number(amount)) || Number(amount) < 0) throw new Error('Total pemasukan tidak valid.');

  const encodedSheet = "'" + sheetName.replace(/'/g, "''") + "'";
  const range = encodeURIComponent(encodedSheet + '!A:D');
  const base = SHEETS_API + '/' + encodeURIComponent(spreadsheetId);
  const result = await sheetsRequest(base + '/values/' + range + '?majorDimension=ROWS');
  const rows = Array.isArray(result.values) ? result.values : [];
  let matchRow = -1;
  for (let i = 1; i < rows.length; i += 1) {
    if (String(rows[i][0] || '').trim() === date &&
        String(rows[i][1] || '').trim().toLowerCase() === category.toLowerCase()) {
      matchRow = i + 1;
      break;
    }
  }

  const rowValues = [[date, category, Number(amount), new Date().toISOString()]];
  if (matchRow >= 2) {
    const updateRange = encodeURIComponent(encodedSheet + '!A' + matchRow + ':D' + matchRow);
    return sheetsRequest(base + '/values/' + updateRange + '?valueInputOption=RAW', {
      method: 'PUT',
      body: JSON.stringify({ range: encodedSheet + '!A' + matchRow + ':D' + matchRow, majorDimension: 'ROWS', values: rowValues })
    });
  }
  return sheetsRequest(base + '/values/' + range + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', {
    method: 'POST',
    body: JSON.stringify({ majorDimension: 'ROWS', values: rowValues })
  });
}
