# Nongki — Project Checklist & Handoff

Last updated: 31 October 2026  
Repository: `Vaivaii/Nongki-pemasukan`  
Active working branch: `feature/search-focus-overlay`  
Base branch: `feature/product-search`

## Active task — Google-style focused product search

### Implemented
- [x] Preserve the existing product-search logic, live filtering, category grouping, clear button, and product-card click behavior.
- [x] When the search input receives focus, activate a dedicated focused-search mode.
- [x] Portal the search bar, result count, and results list directly under `body` so they cannot be trapped behind the sales screen's stacking context.
- [x] Activate the portal on pointer-down before the native Android keyboard takes focus, with focus-in as a fallback.
- [x] Hide the bottom navigation and staff sync floating control during focused search.
- [x] Keep the focused search bar minimal: one rounded field with a magnifying-glass icon and the placeholder `Cari produk`.
- [x] Show no product results/cards while the focused search field is empty.
- [x] Render matches as plain text rows containing only the product icon and product name (no tile cards, price, sold-count badge, or quantity badge).
- [x] Tap a matching row to call the existing `record(productId)` action, then close search and return to the normal sales screen.
- [x] Use a dark, dimmed blur backdrop instead of the earlier bright/white tint.
- [x] Keep product badges and cancel/tap feedback selectors working for cards temporarily moved into the search portal.
- [x] Move the search field to a fixed position near the top of the visible screen using a smooth entrance animation.
- [x] Blur and dim the underlying sales screen with a translucent backdrop.
- [x] Keep the search result area directly below the field and independently scrollable.
- [x] Read Android/browser `visualViewport` dimensions so the results area ends above the on-screen keyboard.
- [x] Preserve the sales-page scroll position and restore it when the backdrop is tapped or Escape closes focused-search mode.
- [x] Keep the focused field visually minimal: hide the separate clear button and native search-cancel decoration; users can edit/erase text with the keyboard.
- [x] Add dark-mode styling for the backdrop and results surface.
- [x] Add the focused-search branch to the Android APK workflow trigger.
- [x] Record this implementation in this project checklist.

### Files changed in this task
- `index.html`
  - Added `product-search-focus-overlay-styles`.
  - Added viewport-aware focused-search open/close behavior.
  - Focused mode shows no items until the user types; matches become simple icon/name rows with no price or badge.
  - Tapping a result reuses `record(productId)` to add it to the existing local cart.
- `.github/workflows/android-apk.yml`
  - Added `feature/search-focus-overlay` to the push branch allowlist so this branch can build a debug APK.
- `docs/PROJECT-CHECKLIST.md`
  - This handoff checklist and change record.

### Verification still required
- [x] Initial APK build #285 / ID `41164373780` succeeded, but it contains the first focus implementation and is superseded; do not use that APK for retesting.
- [x] Corrected portal APK build #287 / ID `41164895245` succeeded.
- [x] Build #288 / ID `41165069061` succeeded for the prior portal version.
- [x] Build #290 / ID `41166076311` built the simple search list before the last small input decoration tweak.
- [ ] Confirm final simple-search APK build succeeds. Run #291 / ID `41166145410`: https://github.com/Vaivaii/Nongki-pemasukan/actions/runs/41166145410 (latest build including hidden native clear decoration).
- [x] JavaScript syntax check: all 5 inline script blocks in `index.html` parse successfully after the portal correction.
- [x] Static checks confirm the portal, dark backdrop, bottom-nav hiding, and portal-aware product-card selectors are present; no old sales-view-only product-card selector remains.
- [x] Static checks confirm empty focused search hides the results region, search rows contain only icon/name, no badge or price is rendered in the focused results, and a tap calls the pre-existing `record(productId)` action.
- [x] All 5 inline JavaScript blocks pass syntax parsing after the simple-search change.
- [ ] Install the newly built APK on Android and test focus mode with SwiftKey/Gboard.
- [ ] Confirm search input moves above the keyboard and stays visible.
- [ ] Confirm the blur backdrop covers the header, payment cards, category tabs, and bottom navigation.
- [ ] Confirm result scrolling works while the keyboard is open and does not scroll the page underneath.
- [ ] Confirm tapping the backdrop closes focus mode and restores the previous page scroll position.
- [ ] Confirm keyboard Backspace/Delete updates and clears suggestions correctly.
- [ ] Confirm selecting a product still adds it to the local cart exactly as before.
- [ ] Repeat the visual checks in Dark Mode.
- [ ] Run a regression check for transaction save/cancel and payment flows before treating the APK as final.

## Existing product-search foundation
- [x] Product search is available below the product category tabs.
- [x] Live filtering searches product names and categories.
- [x] Results are grouped by product category.
- [x] Category tabs can narrow search results.
- [x] Editing or deleting the typed query refreshes the matches; no separate X button is displayed in the focused search mode.
- [x] Product result cards preserve the existing click action and sold-count badge.
- [x] Search input is not rebuilt for each keystroke, preserving mobile keyboard focus.
- [x] Native search input cancel decoration is hidden so the field remains icon + text only.

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
- Screenshot feedback exposed that the first implementation left search UI inside the sales page stacking context; it was corrected by portaling the search controls/results to a body-level overlay.
- The corrected overlay now hides the bottom navigation and uses a darker blurred backdrop.
- Reworked search to a compact icon + `Cari produk` field. Focused search is empty until the user types; results are plain icon/name rows with no product card, price, or badges.
- Selecting a result reuses the existing `record(productId)` cart path and closes search.
- Added viewport-aware sizing so the results list can fit in the visible area above the Android keyboard.
- Added Android APK workflow support for this branch.
- Code commit (initial): `5d43f49f4713f23062194a99a9b879afda3c184d`
- Corrective commits: `80932b5852c286edeb006e7d9c104ff1befd61b9`, `0c163461496856ba5d9dcee622a24c636da146a4`, `c7335fedc38021d7ecbfd561c65c5b2e16e8f27a`.
- Simple-search commits: `c413ff5d8157b785bc8f54e1d6ec1629ec0b0804`, `78584cc6640fc0d634c9d976deea696f1cef59e6`, `333f0d2557e0a0011c396c86c73a9c884e3eaa2f`.
- Workflow commit: `a87a561d1beb2f67d63634a4529f38e888e64c71`
- Corrected APK build and real-device verification are pending; do not mark the task complete until those checks pass.

## Handoff note for a new chat
Continue from branch `feature/search-focus-overlay`, not from `main` or an Android native branch. Read this file first. The current task is focused-search overlay; the implementation is committed but still needs a successful APK build and real-device regression testing. Keep all protected project boundaries above.
