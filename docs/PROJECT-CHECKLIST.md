# Nongki — Project Checklist & Handoff

Last updated: 31 October 2026  
Repository: `Vaivaii/Nongki-pemasukan`  
Active working branch: `feature/search-focus-overlay`  
Base branch: `feature/product-search`

## LATEST HANDOFF — Focused Search / POS Quick Entry (31 October 2026)

> This section is the current source of truth for the focused-search implementation. Earlier notes below describe the initial prototype and are historical; where they conflict, follow this latest handoff.

**Current branch:** `feature/search-focus-overlay`  
**Latest code commit:** `2a40f6b8c52c91d4a7fd90adf2df16265a69ce76`  
**Latest APK workflow:** [Run #41177509932](https://github.com/Vaivaii/Nongki-pemasukan/actions/runs/41177509932) — **success**  
**Current test status:** Waiting for user real-device stability testing. Do not mark the search task fully verified until the user reports the test result.

### Implemented in the latest search flow
- [x] Search bar expands from its dashboard position and returns to the same position.
- [x] Dashboard product cards remain mounted; opening/closing search does not rebuild the product-card grid.
- [x] Search suggestions use a separate overlay results container.
- [x] Search history stores the selected product's actual name, not the partial typed query.
- [x] Search history is stored locally (maximum 6 unique recent product names) and can be cleared.
- [x] Quick access shows up to 6 top-selling products for the day, with a fallback to active products when there are no sales yet.
- [x] Selecting a product from live results or quick access adds it through the existing `record(productId)` / `addCartProduct` flow and keeps the search overlay open for repeated selection.
- [x] Cart badges beside search-result/quick-access product names reflect the current unpaid `paymentCart` quantity only, not accumulated daily sales.
- [x] Cart badges update after each added item and reset after successful payment or clearing the cart.
- [x] Search-history and quick-access content enters after the search-bar animation, using a panel fade and staggered section motion.
- [x] Android keyboard stays available when a product is selected; pointer focus transfer to result buttons is prevented so the search input retains focus. Keyboard should dismiss with Android Back.
- [x] Search UI includes Dark Mode styling and respects reduced-motion settings.
- [x] Latest APK build for commit `2a40f6b8` completed successfully.

### User device-test checklist — pending
- [ ] Open search from Catat dashboard; confirm the bar moves smoothly and dashboard cards remain visible underneath without flicker.
- [ ] Confirm history and quick-access sections appear smoothly after the bar movement, without a sudden jump or flash.
- [ ] Type a partial query (for example, `K`) and select a product; confirm history stores the full selected product name.
- [ ] Select the same product repeatedly; confirm the cart badge increments (1, 2, 3…) and the overlay remains open.
- [ ] Select different products consecutively; confirm the keyboard remains visible and the input can be used immediately for the next search.
- [ ] Press Android Back once; confirm the keyboard hides while the search overlay remains open.
- [ ] Press Android Back again; confirm search returns to the dashboard and the search bar animates back down.
- [ ] Confirm dashboard product cards are still present immediately after leaving search, without tapping a category.
- [ ] Confirm cart badges clear after successful Tunai payment and after successful QRIS payment.
- [ ] Confirm cart badges clear when the explicit “Kosongkan Keranjang” action is used.
- [ ] Confirm a failed/unsuccessful payment does not clear the cart quantity badges.
- [ ] Repeat key checks in Dark Mode and with the device keyboard used in normal operation.

### Regression boundaries
- [x] Changes remain isolated to `feature/search-focus-overlay`.
- [x] `main` and Android native branches remain untouched.
- [x] Apps Script `Code.gs` remains untouched.
- [x] Existing transaction save/cancel, login/session, Owner (Suami), Owner (Istri), Pegawai, payment, sync, and thermal-print code paths were not intentionally changed by this search UI work.
- [ ] After user testing, run a final transaction save/cancel and Tunai/QRIS regression test before considering the work stable.

### Latest commits
- Search history, persistent selection, cart badges: `98e46d31`
- Fluid history/quick-access entrance animation: `ea0bd4ce`
- Keep Android keyboard open when selecting results: `2a40f6b8`

### Handoff instruction
Pause further UI changes while the user tests the current APK. Treat the latest build as a test candidate, not as proven stable. Continue only from `feature/search-focus-overlay`, first record the user's test findings in this checklist, then make narrowly scoped corrections. Preserve all project boundaries above.

## Active task — Google-style focused product search and Android Back navigation

### Implemented
- [x] Preserve the existing product-search logic, live filtering, category grouping, clear button, and product-card click behavior.
- [x] When the search input receives focus, activate a dedicated focused-search mode.
- [x] Portal the search bar, result count, and results list directly under `body` so they cannot be trapped behind the sales screen's stacking context.
- [x] Avoid moving the source input during `pointerdown`; build a focus-only cloned input in the body-level portal after the original input receives focus.
- [x] Transfer focus immediately to the portal input while syncing its value with the source search input, so a normal first tap can open Android's keyboard.
- [x] Hide the bottom navigation and staff sync floating control during focused search.
- [x] Keep the focused search bar minimal: one rounded field with a magnifying-glass icon and the placeholder `Cari produk`.
- [x] Show no product results/cards while the focused search field is empty.
- [x] Render matches as plain text rows containing only the product icon and product name (no tile cards, price, sold-count badge, or quantity badge).
- [x] Tap a matching row to call the existing `record(productId)` action, then close search and return to the normal sales screen.
- [x] Add a WebView history sentinel for Android Back: close search first, close the cash modal/profile dropdown when open, or return from another view to the main Catat dashboard before app exit.
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
- [x] Build #291 / ID `41166145410` succeeded for the simple-search version before the first-tap/back-navigation correction.
- [x] Build #292 / ID `41166892503` succeeded with cloned-input one-tap focus and Android Back handling.
- [ ] Confirm latest APK build with final Back-stack behavior succeeds. Run #293 / ID `41167032912`: https://github.com/Vaivaii/Nongki-pemasukan/actions/runs/41167032912 (status: in progress; compiling APK).
- [x] JavaScript syntax check: all 5 inline script blocks in `index.html` parse successfully after the portal correction.
- [x] Static checks confirm the portal, dark backdrop, bottom-nav hiding, and portal-aware product-card selectors are present; no old sales-view-only product-card selector remains.
- [x] Static checks confirm empty focused search hides the results region, search rows contain only icon/name, no badge or price is rendered in the focused results, and a tap calls the pre-existing `record(productId)` action.
- [x] All 5 inline JavaScript blocks pass syntax parsing after the simple-search change.
- [x] All 5 inline JavaScript blocks also pass syntax parsing after the one-tap focus and Android Back correction.
- [x] Static checks confirm the original tapped input is no longer moved; a portal clone receives focus and both inputs sync.
- [x] Static checks confirm the Back sentinel can close search/cash modal/profile menu and return non-home tabs to Catat.
- [ ] Install the newly built APK on Android and test focus mode with SwiftKey/Gboard.
- [ ] Confirm search input moves above the keyboard and stays visible.
- [ ] Confirm the blur backdrop covers the header, payment cards, category tabs, and bottom navigation.
- [ ] Confirm result scrolling works while the keyboard is open and does not scroll the page underneath.
- [ ] Confirm tapping the backdrop closes focus mode and restores the previous page scroll position.
- [ ] Confirm keyboard Backspace/Delete updates and clears suggestions correctly.
- [ ] Confirm a single tap on the original search field immediately opens the cloned focused input and keyboard without long-press.
- [ ] Confirm Android hardware Back closes search first; from another tab it returns to Catat; Back on Catat can then exit the app.
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
- Added a cloned focused input so the touch-target input does not get reparented during pointerdown.
- Added Android Back history handling to close focused search/transient UI or navigate back to Catat before exit.
- Added Android APK workflow support for this branch.
- Code commit (initial): `5d43f49f4713f23062194a99a9b879afda3c184d`
- Corrective commits: `80932b5852c286edeb006e7d9c104ff1befd61b9`, `0c163461496856ba5d9dcee622a24c636da146a4`, `c7335fedc38021d7ecbfd561c65c5b2e16e8f27a`.
- Simple-search commits: `c413ff5d8157b785bc8f54e1d6ec1629ec0b0804`, `78584cc6640fc0d634c9d976deea696f1cef59e6`, `333f0d2557e0a0011c396c86c73a9c884e3eaa2f`.
- Latest interaction/navigation commits: `5959492c99d6e5d69a799933daa2309df831ec4f` (cloned input + back handling), `f24d9cb9bb82fe0a84632d45597e2c06e79deb86` (return-home Back then allow exit on the next Back).
- Checklist commit for this update: pending.
- Workflow commit: `a87a561d1beb2f67d63634a4529f38e888e64c71`
- Corrected APK build and real-device verification are pending; do not mark the task complete until those checks pass.

## Handoff note for a new chat
Continue from branch `feature/search-focus-overlay`, not from `main` or an Android native branch. Read this file first. The current task is focused-search overlay; the implementation is committed but still needs a successful APK build and real-device regression testing. Keep all protected project boundaries above.
