# Nongki — Project Checklist & Handoff

Last updated: 31 October 2026  
Repository: `Vaivaii/Nongki-pemasukan`  
Active working branch: `feature/search-focus-overlay`  
Base branch: `feature/product-search`

## Active task — Google-style focused product search

### Implemented
- [x] Preserve the existing product-search logic, live filtering, category grouping, clear button, and product-card click behavior.
- [x] When the search input receives focus, activate a dedicated focused-search mode.
- [x] Move the search field to a fixed position near the top of the visible screen using a smooth entrance animation.
- [x] Blur and dim the underlying sales screen with a translucent backdrop.
- [x] Keep the search result area directly below the field and independently scrollable.
- [x] Read Android/browser `visualViewport` dimensions so the results area ends above the on-screen keyboard.
- [x] Preserve the sales-page scroll position and restore it when the backdrop is tapped or Escape closes focused-search mode.
- [x] Keep the clear (×) button working without closing focused-search mode.
- [x] Add dark-mode styling for the backdrop and results surface.
- [x] Add the focused-search branch to the Android APK workflow trigger.
- [x] Record this implementation in this project checklist.

### Files changed in this task
- `index.html`
  - Added `product-search-focus-overlay-styles`.
  - Added viewport-aware focused-search open/close behavior.
  - Did not replace the search matching/grouping logic or product-selection handler.
- `.github/workflows/android-apk.yml`
  - Added `feature/search-focus-overlay` to the push branch allowlist so this branch can build a debug APK.
- `docs/PROJECT-CHECKLIST.md`
  - This handoff checklist and change record.

### Verification still required
- [ ] Confirm GitHub Actions Android APK build succeeds for this branch.
- [ ] Install the newly built APK on Android and test focus mode with SwiftKey/Gboard.
- [ ] Confirm search input moves above the keyboard and stays visible.
- [ ] Confirm the blur backdrop covers the header, payment cards, category tabs, and bottom navigation.
- [ ] Confirm result scrolling works while the keyboard is open and does not scroll the page underneath.
- [ ] Confirm tapping the backdrop closes focus mode and restores the previous page scroll position.
- [ ] Confirm the clear (×) button clears the query but keeps the search field focused.
- [ ] Confirm selecting a product still adds it to the local cart exactly as before.
- [ ] Repeat the visual checks in Dark Mode.
- [ ] Run a regression check for transaction save/cancel and payment flows before treating the APK as final.

## Existing product-search foundation
- [x] Product search is available below the product category tabs.
- [x] Live filtering searches product names and categories.
- [x] Results are grouped by product category.
- [x] Category tabs can narrow search results.
- [x] Clear button resets the query.
- [x] Product result cards preserve the existing click action and sold-count badge.
- [x] Search input is not rebuilt for each keystroke, preserving mobile keyboard focus.

## Protected project boundaries — must remain unchanged
- [ ] Never modify Apps Script `Code.gs` unless explicitly instructed.
- [ ] Never break the transaction save/cancel flow.
- [ ] Never change the login/session or local profile system:
  - Owner (Suami)
  - Owner (Istri)
  - Pegawai
- [ ] Do not modify `main` or Android branches unless explicitly instructed.
- [ ] Do not alter successful features while fixing unrelated UI.
- [ ] Preserve existing cash/QRIS payment behavior, local cart, sync queue, and thermal printing.
- [x] This task is isolated on `feature/search-focus-overlay`; `main`, `android/ui-dynamic-icons`, and Android native branches were not edited.
- [x] Apps Script `Code.gs` was not edited.

## Change log

### 31 October 2026 — Focused product-search overlay
- Created branch `feature/search-focus-overlay` from `feature/product-search`.
- Implemented a Google-style focus treatment for product search in `index.html`.
- Added viewport-aware sizing so the results list can fit in the visible area above the Android keyboard.
- Added Android APK workflow support for this branch.
- Code commit: `5d43f49f4713f23062194a99a9b879afda3c184d`
- Workflow commit: `a87a561d1beb2f67d63634a4529f38e888e64c71`
- Device verification and APK build are pending; do not mark the task complete until those checks pass.

## Handoff note for a new chat
Continue from branch `feature/search-focus-overlay`, not from `main` or an Android native branch. Read this file first. The current task is focused-search overlay; the implementation is committed but still needs a successful APK build and real-device regression testing. Keep all protected project boundaries above.
