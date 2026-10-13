# Nongki PWA Rebuild — Implementation Plan

## Status
- Working branch: `rebuild/pwa-foundation`
- The existing `main` branch is left untouched while the rebuild is developed and tested.
- Keep the approved UI reference: forest-green/gold header, fixed header with safe spacing, light product cards, floating bottom navigation, history with local/cloud status, and reports for product units plus daily/weekly/monthly summaries.

## Architecture decisions
1. **Canonical data source:** backend database/API is the source of truth. Google Sheets is a reporting/archive integration, not the transaction database.
2. **Offline-first:** persist transactions and the outgoing queue in IndexedDB (not only localStorage). Each transaction receives a stable UUID on the device.
3. **Idempotent sync:** the server must enforce uniqueness on transaction UUID. Retrying a request must never create a duplicate.
4. **Transactions are append-only:** cancel by recording a cancellation event/status with actor, timestamp, and reason. Do not hard-delete a transaction from history.
5. **Reports:** calculate from canonical transaction details; canceled transactions remain visible but are excluded from net revenue and active product counts.
6. **Authentication:** validate user identity, role, and PIN on the server. Do not put a shared secret/token in public client JavaScript.
7. **Google Sheets:** sync through a server-side integration using protected credentials. Client requests must not contain a reusable secret.
8. **PWA limitations:** offline records can be queued locally and synced when the app runs online again. Browser background sync is best-effort, not guaranteed when the browser is fully closed.

## Initial data model
- `users`: id, display_name, role, pin_hash, active
- `products`: id, name, category, price, active, updated_at
- `transactions`: id (UUID), created_at, business_date, user_id, device_id, status, canceled_at, canceled_by, cancel_reason, sync metadata
- `transaction_items`: id, transaction_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, line_total
- `sessions`: id, user_id, device_id, started_at, last_seen_at, ended_at
- `sync_events`: id, entity_id, event_type, created_at, result, error_code

## Acceptance tests before replacing the deployed app
- Record a transaction online and offline.
- Reconnect and retry the same transaction several times; server still contains exactly one transaction.
- Cancel a transaction online and offline; cancellation remains in history and is synced once.
- Confirm canceled transactions are excluded from net revenue.
- Compare product units and daily, weekly, monthly totals with the canonical data and Google Sheets.
- Confirm there are no secrets or reusable tokens in public client files.
- Confirm existing production `main` remains unchanged until the rebuild is reviewed.
