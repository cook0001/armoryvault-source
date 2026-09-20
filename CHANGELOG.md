# Changelog

## [Unreleased]

## [3.1.0] - 2026-09-20

### Added
- **Custom Application & Taskbar Icon Suite (`app-icon.png`, `src-tauri/icons/`)**:
  - Implemented high-definition Heavy Vault Door & Biometric Cipher icon (Concept A) featuring circular geared locking lugs, heavy vault safe door, illuminated emerald green security ring, and central tactical defense shield.
  - Generated complete cross-platform icon assets for macOS (`icon.icns`), Windows (`icon.ico`, `Square*Logo.png`), and Linux (`32x32.png`, `64x64.png`, `128x128.png`, `icon.png`).
- **Tauri Minisign (Ed25519) Release Signing (`tauri.conf.json`, `build-all.yml`)**:
  - Configured Tauri v2 Minisign public key and updater artifacts generation (`createUpdaterArtifacts: true`).
  - Integrated `TAURI_SIGNING_PRIVATE_KEY` into GitHub Actions release workflow for automated cross-platform binary signing.
- **In-App OTA Software Updater (`src/components/modals/UpdateModal.tsx`, `SettingsModal.tsx`, `AboutLicenseSettingsSection.tsx`, `tauri-plugin-updater`)**:
  - Integrated `@tauri-apps/plugin-updater` and `tauri-plugin-updater = "2"` with GitHub Releases endpoint.
  - Implemented `UpdateModal` dialog with release notes rendering, live download progress tracking, and seamless application restart via `relaunch()`.
  - Added "Check for Software Updates" trigger inside Settings Legal & Licensing section.

## [3.0.0] - 2026-09-19

### Official Tauri v2 Production Release & Final Electron Build Certification

- **ArmoryVault Tauri v2 Stable Production Release (`v3.0.0`)**:
  - Official elevation of the lightweight, native Rust-powered Tauri v2 desktop application to the primary, stable production release channel.
  - Symmetrical cross-platform support across macOS (Apple Silicon aarch64 & Intel x86_64), Windows (x64 NSIS), and Linux (AppImage & DEB).
  - High-performance in-memory SQLite runtime with pure-Rust AES-256-GCM authenticated encryption and zero plaintext at rest.
- **Final Official Electron Release Certification (`v3.0.0-Electron`)**:
  - Formally certifies **`v3.0.0-Electron` (commit `581ff1a`) as the final release of the legacy Electron architecture**.
  - All future active desktop development, security patches, compliance toolkits, and ecosystem integrations are exclusively maintained on the native Tauri v2 engine.

### Added

- **Bluetooth Low Energy (BLE) Zero-Trust Pairing Engine & Extensible Telemetry Foundation (`src-tauri/Cargo.toml`, `src-tauri/Info.plist`, `src-tauri/src/bluetooth/mod.rs`, `src-tauri/src/commands/bluetooth_commands.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/lib.rs`, `src/types/index.ts`, `src/bridge/tauriBridge.ts`, `src/index.css`, `src/components/sync/modals/BlePairingModal.tsx`, `src/components/sync/modals/BlePairingModal.test.tsx`, `src/pages/SyncInbox.tsx`)**:
  - Integrated `btleplug = "0.11"` cross-platform BLE client/central runtime and added `NSBluetoothAlwaysUsageDescription` in `Info.plist` for CoreBluetooth entitlement.
  - Implemented `BleCentralManager` in `src-tauri/src/bluetooth/mod.rs` supporting active scanning for ArmoryVault companion peripherals advertising custom Service UUID (`0000av01-0000-1000-8000-00805f9b34fb`).
  - Active Pairing Handshake GATT Characteristic (`0000av02-0000-1000-8000-00805f9b34fb`): connects, executes zero-trust numeric comparison PIN handshake, encrypts pairing credentials using AES-256-GCM (12-byte nonce, 16-byte authentication tag) with key derivation from `SHA-256("ArmoryVault-BLE-PIN-Salt-v1:" + pin)`.
  - Reserved Telemetry Sync GATT Characteristic (`0000av03-0000-1000-8000-00805f9b34fb`): defined extensible chunking protocol (`[seq, total, data, crc]`) for future small offline telemetry sync (ammo depletion, range strings, chronograph logs) without re-architecting the BLE stack.
  - Added Tauri IPC commands: `is_bluetooth_available`, `scan_ble_companions`, and `pair_ble_companion`. Automatically upserts paired device metadata into SQLite `paired_devices` and broadcasts `device-paired` event to the desktop frontend.
  - Created `BlePairingModal.tsx` (< 350 lines, vector icons from `lucide-react`, zero raw inline styles, vendor-prefixed glassmorphism): features tactical radar scan visualization, real-time RSSI signal quality badges, 6-digit numeric comparison PIN verification, and one-shot 60-second scanning timeout.
  - Integrated "Pair via Bluetooth" launch action into `SyncInbox.tsx` top navigation header alongside QR pairing.
  - Added comprehensive test suites: Rust unit tests in `src-tauri/src/bluetooth/mod.rs` (`test_pin_encryption_decryption_roundtrip`, `test_wrong_pin_fails_decryption`, `test_tampered_ciphertext_fails_decryption`) and React unit tests in `BlePairingModal.test.tsx` (5 tests) with 100% pass rate.

- **Universal Companion Payload Unwrapping, Zero-Data-Loss Ingestion & SKU Engine (`src-tauri/src/server/mod.rs`, `src/utils/payloadIngestionEngine.ts`, `src/utils/skuEngine.ts`, `src/pages/SyncInbox.tsx`, `src/components/sync/cards/SyncInboxItemCard.tsx`, `src/components/sync/cards/SyncItemOpticZeroCard.tsx`, `src/types/index.ts`, `src/index.css`)**:
  - Built universal unwrap pipeline in Rust LAN sync server (`handle_sync_payloads`): automatically decrypts incoming `.av*` container envelopes using candidate keys (client token, server pairing token, and paired device keys), unpacking all 16 native sync types directly into `sync_queue`.
  - Expanded Axum request body limit (`DefaultBodyLimit::max(100 * 1024 * 1024)`): eliminated HTTP 413 "Payload Too Large" rejections when mobile companions transmit firearm updates containing multi-photo Base64 documentation (100 MB max request envelope).
  - Hardened auto-shred confirmation protocol: `handle_sync_payloads` now strictly appends filenames to `processed_filenames` only when payload unwrapping succeeds (`was_unwrapped == true`), preventing mobile companions from premature auto-shredding on decryption failures.
  - Enhanced candidate key discovery (`InventoryStore::get_all_paired_decryption_keys`): derives candidate decryption keys from both `device_token` and `device_key` in SQLite `paired_devices`.
  - Added diagnostic `GET /api/sync/queue` endpoint for live queue inspection.
  - Zero-Data-Loss guarantee: existing firearms, ammo, components, and accessories are updated strictly in-place via `updateFirearm`, `updateAmmo`, `updateComponent`, and `updateAccessory`. Existing IDs are preserved, photos are deduplicated, documents and logs are retained, and records are never deleted or duplicated.
  - Symmetrical identifier resolution hierarchy: matches records by `serial_number`, `upc` / `upc_code`, or `sku`.
  - Automated SKU Engine (`src/utils/skuEngine.ts`): for items lacking identifiers, auto-generates standardized SKUs (`AV-AMMO-*`, `AV-COMP-*`, `AV-ACC-*`) and registers them directly into the SKU Manager database (`skus` table in memory which flushes to encrypted `skus_database.enc`).
  - Base64 photo extraction: extracts mobile photo blobs to disk via `saveBase64Photo()` and strips Base64 fields before database mutation, preserving database performance and keeping `.enc` files compact.
  - Added full support and dedicated UI card for `optic_zero_update` sync items (`SyncItemOpticZeroCard.tsx`), displaying zero distance, click value, elevation/windage turret adjustments, firearm linkage, and approval action with zero inline styles and zero emojis.
  - Added comprehensive test suites: `skuEngine.test.ts` (10 tests) and expanded `payloadIngestionEngine.test.ts` (8 tests) with 100% pass rate (35 test suites, 229/229 tests passing).

- **Transition to Proprietary Free-to-Use (Freeware) Model, Public Release Repository & Ecosystem Alignment (`LICENSE`, `package.json`, `README.md`, `CONTRIBUTING.md`, `src/bridge/tauriBridge.ts`, `website/index.html`, `website/privacy.html`, `website/app.js`, `src/constants/eula.ts`, `src/components/modals/LicenseModal.tsx`, `src/components/settings/AboutLicenseSettingsSection.tsx`, `src/components/modals/SettingsModal.tsx`)**:
  - Transitioned from open-source ISC license to the official **ArmoryVault Proprietary Free-to-Use End User License Agreement (EULA)** (All Rights Reserved, free for personal non-commercial use, reverse engineering and unauthorized redistribution prohibited).
  - Locked down and renamed private core source repository to [`cook0001/armoryvault-source`](https://github.com/cook0001/armoryvault-source) (matching `wildcat-studio-source`, `loadbench-source`, `rangestudio-source`).
  - Established dedicated public binary release repository at [`cook0001/armoryvault`](https://github.com/cook0001/armoryvault) for pre-compiled standalone installers (`.dmg`, `.exe`, `.AppImage`), SHA-256 checksums, and CI release verification.
  - Clarified across documentation and ecosystem manifests that **ArmsTrader (`armstrader.store`) is NOT a marketplace, broker, or dealer**, but an independent free digital utility suite for firearm owners.
  - Migrated modular extensions to an **In-App Only** distribution architecture: updated `src/bridge/tauriBridge.ts` to query `https://armstrader.store/armoryvault/modules/modules-index.json` as the primary catalog endpoint, enabling 1-click in-app installation without requiring public GitHub releases or web download links.
  - Implemented dual-hosting for standalone desktop installers (`.dmg`, `.exe`, `.AppImage`) on `https://armstrader.store/downloads/desktop/` and GitHub Releases.
  - Fully purged all legacy open-source references across static website mirrors (`website/index.html`, `website/privacy.html`, `website/app.js`) and contributor guidelines (`CONTRIBUTING.md`).
  - Updated `package.json` to `"license": "SEE LICENSE IN LICENSE"` and `"private": true`.
  - Embedded dedicated `AboutLicenseSettingsSection` in Settings dialog displaying license model, version, zero-cloud privacy guarantee, and 1-click launcher for `LicenseModal`.
  - Built comprehensive `LicenseModal.tsx` modal with scrollable EULA sections and 1-tap clipboard agreement copying.

- **Full Vault Lifecycle SQLite Encryption & Zero-Plaintext at Rest (`src-tauri/src/storage/db.rs`, `src-tauri/src/storage/inventory.rs`, `src-tauri/src/storage/importers.rs`, `src-tauri/src/commands/vault_commands.rs`, `src-tauri/src/server/mod.rs`)**:
  - Ensured persistent tables `kv_meta` (including `'vault_pairing_token'`), `paired_devices` (including `device_token` and `device_key`), and `sync_queue` are serialized into the root encrypted JSON payload within `firearms_inventory.enc` and restored strictly into in-memory SQLite on vault unlock.
  - Hardened vault locking: zeroes in-memory SQLite instances, locks the memory container, and resets active runtime pairing tokens to `None`.
  - Updated `/api/pair` and `maybe_decrypt_request_payload` to receive and persist `deviceKey` and custom `passphrase`, enabling zero-click automatic decryption of all incoming companion payloads and outbox items using paired device keys.

- **Mobile Sync Inbox Badge Desynchronization Fix (`src/pages/SyncInbox.tsx`, `src/bridge/tauriBridge.ts`, `src/components/Layout.tsx`, `src-tauri/src/commands/inventory_commands.rs`)**:
  - Resolved persistent "phantom" sync notification badge where sidebar indicated pending items when inbox was empty.
  - Fixed hex ID type coercion: preserved 16-character hex strings (`target.id`) without numeric truncation (`Number(id)` -> `NaN`), ensuring SQLite successfully executes item removal.
  - Corrected IPC parameter mapping in `reject_sync_item` to send `{ id, deleteFromMobile }`.
  - Added live `sync-queue-changed` event emission across all queue modifications (`remove_sync_item`, `reject_sync_item`, `clear_sync_queue`), updating sidebar badges in real time across page transitions.

- **Persistent Paired Devices Registry & Management Tab (`src-tauri/src/storage/db.rs`, `src-tauri/src/storage/inventory.rs`, `src-tauri/src/commands/inventory_commands.rs`, `src-tauri/src/server/mod.rs`, `src/components/sync/cards/PairedDevicesTab.tsx`, `src/pages/SyncInbox.tsx`)**:
  - Implemented persistent SQLite registry for mobile companion devices in `paired_devices` table tracking device ID, name, platform type (iOS, Android, etc.), IP address, pairing timestamp, last activity timestamp, and active status.
  - Added Rust store operations (`upsert_paired_device`, `update_paired_device_activity`, `get_paired_devices`, `remove_paired_device`, `unpair_all_devices`) with full unit test coverage (`test_paired_devices_lifecycle` passing).
  - Exposed Tauri commands (`get_paired_devices`, `remove_paired_device`, `unpair_all_devices`) and REST endpoints (`GET /api/devices`, `DELETE /api/devices/:id`, `DELETE /api/devices`).
  - Enhanced `/api/pair` handshake: eliminated stale pairing token 401 rejections upon desktop restart, auto-upserts connecting devices into SQLite registry, and broadcasts `device-paired` real-time Tauri events with device metadata.
  - Built dedicated, modular `PairedDevicesTab.tsx` component (< 250 lines, vector icons from `lucide-react`, zero raw inline styles, vendor-prefixed glassmorphism).
  - Features real-time LAN server status ribbon (`http://192.168.1.189:3456`, online badge, AES-256-GCM transport badge), paired devices card deck with device platform icons, IP address, last activity timestamps, "Test Handshake" action, and "Unpair" / "Unpair All" controls.
  - Updated `SyncInbox.tsx` with top navigation tabs ("Sync Inbox" and "Paired Devices" with dynamic badge counts) and a "Pair Device (QR)" launch button.
  - Resolved UI tab switching bug where desktop kicked the user off the "Paired Devices" tab back to "Sync Inbox": eliminated `setActiveTab('inbox')` in `handlePairSuccess` so user remains on their chosen tab.
  - **Eliminated Repetitive "Device Paired" Toast Popups (`src-tauri/src/server/mod.rs`, `src-tauri/src/storage/inventory.rs`, `src/pages/SyncInbox.tsx`, `src/types/index.ts`)**:
    - Scoped Desktop "Device Paired" toast notification to display ONLY when the user actively has the "Pair Device (QR)" modal open waiting for a scan or when a brand-new device is registered for the very first time (`isNew: true`).
    - Added duplicate suppression and timestamp throttling in `handlePairSuccess` (15-second per-device window) to prevent rapid re-triggering.
    - Updated `upsert_paired_device` in Rust SQLite storage to return `is_new: bool` checking prior active registration.
    - Scoped `device-paired` event emission strictly to initial POST `/api/pair` registrations, completely removing event emissions from idempotent GET `/api/pair` status queries.
    - Background reconnects and periodic sync queries now update device activity silently without popping up intrusive toasts.

- **Resilient Multi-Encoding Symmetrical Cryptography (`src-tauri/src/crypto/vault.rs`, `src/utils/payloadIngestionEngine.ts`)**:
  - Resolved `401 Unauthorized` decryption errors during mobile sync (`POST /api/sync`) where Base64 characters (`+`, `/`, etc.) caused Rust `hex::decode` to fail.
  - Implemented `decode_base64_variants` and `decode_hex_or_base64` in `src-tauri/src/crypto/vault.rs` to seamlessly decode standard, URL-safe, padded, and unpadded Base64 as well as Hex representations.
  - Added separate authentication tag extraction (`encryption.auth_tag`) for mobile companion envelopes, appending the 16-byte MAC to candidate ciphertext buffers during AES-256-GCM decryption.
  - Updated frontend `decryptPayloadEnvelope` in `payloadIngestionEngine.ts` to support both Mobile Base64 and Desktop Hex envelopes, standardizing WebCrypto algorithm parameter naming to `'AES-GCM'`.
  - Added comprehensive test suites: `test_decrypt_mobile_format_envelope` and `test_decrypt_mobile_format_with_plus_and_slash` in Rust, and Mobile Companion envelope test in Vitest (21/21 Rust tests, 217/217 Vitest tests passing).

- **Cross-Device Rejection & Tombstone Pruning Protocol (`src-tauri/src/storage/db.rs`, `src-tauri/src/storage/inventory.rs`, `src-tauri/src/commands/inventory_commands.rs`, `src-tauri/src/server/mod.rs`, `src/components/sync/modals/RejectSyncModal.tsx`, `src/pages/SyncInbox.tsx`)**:
  - Implemented persistent cross-device rejection protocol via `rejected_syncs` database table and store operations (`reject_sync_item`, `get_rejected_syncs`, `confirm_rejected_syncs`).
  - Added companion server endpoints `GET /api/sync/rejected` and `POST /api/sync/rejected/confirm` allowing paired mobile companion devices to download rejections, prune matching pending items and cache, and acknowledge tombstone shredding.
  - Enriched `/api/inventory/summary` and `/api/inventory/cache` with `syncVerification` metadata (item counts, vault revision, timestamp) and rejected sync items list.
  - Created `RejectSyncModal.tsx` when declining sync items in `SyncInbox.tsx` and `PayloadIngestModal.tsx`, allowing users to choose whether to also prune and delete the sync item from the mobile companion device (`[x] Delete from Mobile Companion (Recommended)`).
  - Maintained strict cross-browser CSS prefixing, zero raw inline styles, and dedicated vector SVG icons with 100% test coverage (18 Rust unit tests, 216 Vitest tests passing).

- **Application-Layer End-to-End Encryption (E2EE) Local Transport (`src-tauri/src/crypto/vault.rs`, `src-tauri/src/server/mod.rs`)**:
  - Implemented application-layer transport encryption using pure-Rust AES-256-GCM + PBKDF2-HMAC-SHA256 via `encrypt_with_token` and `decrypt_with_token`.
  - Configured `TOKEN_PBKDF2_ROUNDS = 2_000` for network pairing tokens while maintaining 100,000 rounds for the on-disk master vault file, preventing mobile companion UI freezes during LAN sync while guaranteeing military-grade authenticated encryption.
  - When paired Companion clients request encrypted transport via `X-Encrypted-Transport: true`, `/api/inventory/cache`, `/api/inventory/summary`, and `/api/storage-locations` endpoints dynamically encrypt payloads into authenticated `armoryvault_encrypted_payload` envelopes.
  - `/api/sync` and `/api/sync/payloads` automatically detect encrypted envelopes, authenticate and decrypt them using the vault pairing token, and reject unauthorized or tampered payloads with 401 Unauthorized before queue ingestion.
  - Un-paired and legacy clients remain seamlessly supported via automatic plaintext fallback.
  - Added unit test suite in `src-tauri/src/crypto/vault.rs` verifying round-trip encryption, tampered ciphertext rejection, and wrong key protection (18/18 Rust tests passing).

- **Custom Encrypted Payload Ingestion Engine & Ecosystem Integration (`src-tauri/src/server/mod.rs`, `src/utils/payloadIngestionEngine.ts`, `src/components/sync/modals/PayloadIngestModal.tsx`, `src/components/sync/cards/SyncItemPayloadCard.tsx`, `src/components/sync/modals/GlobalFileDropZone.tsx`, `src/pages/SyncInbox.tsx`)**:
  - Implemented Axum HTTP route `POST /api/sync/payloads` supporting batch transmission of encrypted payload envelopes (`*.avfirearm`, `*.avsession`, `*.avammo`, `*.avcomponent`, `*.avaccessory`, `*.avmaintenance`, `*.avtransfer`, `*.avbundle`). Stages items in `sync_queue`, returns acknowledged filenames for mobile auto-shredding, and emits live events `payload-received` and `sync-received`.
  - Built `payloadIngestionEngine.ts` utilizing WebCrypto PBKDF2 + AES-256-GCM to decrypt envelopes, validate schemas across all 8 custom file types, and dispatch database commits via `window.api`.
  - Created `PayloadIngestModal.tsx` providing review, JSON editing, automatic decryption with active vault pairing keys, and **Approve**, **Edit**, or **Decline** actions.
  - Created `GlobalFileDropZone.tsx` wrapping the entire window with drag-and-drop HUD overlay, allowing users to drop any `.av*` file anywhere onto the app to immediately inspect and ingest.
  - Added "Import Payload File (.av*)" button to `SyncInbox.tsx` toolbar and empty state, and rendered `SyncItemPayloadCard.tsx` with dedicated extension color badges and one-click ingestion.
  - Added unit test suite `src/utils/payloadIngestionEngine.test.ts` (34 test files, 216/216 Vitest tests passing; cargo check 100% clean).

- **Live Range Session & Chronograph Telemetry Intake Pipeline (`src/pages/SyncInbox.tsx`, `src/components/sync/cards/SyncItemSessionCard.tsx`, `src/bridge/tauriBridge.ts`, `src/pages/SyncInboxRangeSession.test.tsx`)**:
  - Enriched `SyncItemSessionCard` for `range_session` items to display comprehensive shot telemetry: Chronograph velocity string badge (Avg FPS, SD, ES, shot count), Mounted Optic badge, Facility location & lane fee pill, Stoppage & malfunction alerts, and target grouping photos.
  - Enhanced `SyncInbox.tsx` approval flow (both single and batch approval) to map all velocity and grouping aliases (`averageVelocity`/`avg`, `standardDeviation`/`sd`, `extremeSpread`/`es`, `shotVelocities`/`shots`, `target_photo_path`/`photo_path`/`photoBase64`, `ammoLabel`) into `window.api.addChronoString` and `window.api.addTargetAnalysis`.
  - Fixed Tauri IPC command parameter names in `tauriBridge.ts` for `add_chrono_string` (`chronoString` / `chrono_string`) and `add_target_analysis` (`targetAnalysis` / `target_analysis`), ensuring seamless Rust command execution.
  - Expanded `SyncInboxRangeSession.test.tsx` test suite to assert rendering and persistence of all telemetry badges and properties (100% passing across 33 test files and 211 tests).
- **Universal Form Modernization & Tactical UI Consistency (`src/index.css`, `src/types/index.ts`, `src/components/modals/`, `src/pages/`)**:
  - Established a unified, responsive design system across all 10 Add / Edit forms and modals in the application:
    1. **Accessory Form (`AccessoryModal.tsx`)**: Modularized 1,554-line monolith into focused domain panels under `src/components/modals/accessory-form/` (`OpticFormSection`, `SuppressorFormSection`, `LightFormSection`, `MagazineFormSection`, `HolsterFormSection`, `MountFormSection`, `SlingFormSection`, `StockChassisFormSection`, `BeltFormSection`). Extended interface with 33 domain-specific technical parameters (FFP/SFP, click values, footprint, thread pitch, decibel reduction, candela, feed style, retention levels, Buscadero loops, etc.).
    2. **Firearm Form (`FirearmForm.tsx`)**: Re-architected into 5 cohesive tactical sectional cards (Core Platform & Identity, Physical Specs & Threading, Acquisition & Financials, ATF/NFA Compliance, Maintenance & Photo Gallery) with zero inline styles.
    3. **Ammunition Modal (`AmmoModal.tsx`)**: Extracted 750-line embedded modal from `AmmoDashboard.tsx` into standalone modular component supporting dual Factory Ammo and Custom Handload workflows with live CPR calculator and box multi-increment calculator.
    4. **Reloading Component Modal (`ReloadingComponentModal.tsx`)**: Modernized 4 component categories (Powder, Primers, Bullets, Brass) with segmented button selector, live multi-unit powder breakdown, and prep status chips.
    5. **Storage Location Modal (`StorageLocationFormModal.tsx`)**: Modernized container setup with custom vector SVG icons (`SafeIcon`, `CabinetIcon`, `AmmoCanIcon`, etc.), capacity metrics, and lock classification.
    6. **Armorer Service Modal (`QuickServiceModal.tsx` & `FirearmLogModal.tsx`)**: Segmented service classification, smart ammo deduction, parts replacement tracking, and photo attachments.
    7. **Optic Zero Modal (`OpticZeroModal.tsx`)**: Fastener torque telemetry (base & ring in-lbs) and zero distance verification.
    8. **Batch Handload Manufacture Modal (`BatchManufactureModal.tsx`)**: Live component inventory deduction breakdown with custom vector SVG icons and shortage alerts.
    9. **Accessory Mounting Modal (`MountAccessoryModal.tsx`)**: Extracted `MountAccessoryItem` subcomponent, bringing file down from 1,024 to 360 lines with dedicated category filter chips and quantity steppers.
    10. **Range Session Modal (`RangeSessionModal.tsx`)**: Multi-weapon selection, depot deduction, facility browser, and notes.
  - **Strict CSS Hygiene & Cross-Browser Protocol**: Zero raw inline styles (`style={{ ... }}` / `style="..."`) across all modal dialogs and forms. Standardized on external design tokens in `src/index.css`. Mandatory preceding `-webkit-` vendor prefixes declared for WebKit/Safari engine compatibility, and zero raw emojis (100% custom vector SVG icons).
- **Pure-Rust AES-256-GCM In-Memory Working State & Zero-at-Rest Security (`src-tauri/src/crypto/`, `src-tauri/src/storage/`, `src-tauri/src/commands/`)**:
  - Implemented pure-Rust PBKDF2/AES-256-GCM cryptographic engine with in-memory SQLite working state while unlocked, delivering true zero-at-rest security.
  - Decoupled primary vault data from audit logs and custom barcodes: `firearms_inventory.enc`, `activity_log.enc`, and `skus_database.enc`.
  - Automated deletion of legacy plaintext `armoryvault.sqlite` from disk upon successful unlock/setup.
  - Complete two-way data interchangeability between Tauri and Electron `.enc` files and `.zip` backups.
- **Universal Multi-Format Database Import & Migration Engine (`src-tauri/src/storage/db.rs`, `src-tauri/src/commands/system_commands.rs`, `src-tauri/src/commands/vault_commands.rs`, `src/bridge/tauriBridge.ts`, `src/pages/VaultLogin.tsx`)**:
  - Engineered universal database import supporting all past, present, and external database formats: encrypted vaults (`.enc`, `.bak`), full archives (`.zip`), native/legacy SQLite databases (`.sqlite`, `.db`, `.sqlite3`), and JSON exports (`.json`).
  - Built schema-adaptive SQLite ingestion (`Database::import_from_sqlite`) that dynamically inspects table schemas across 10 distinct collections, supporting both native JSON-column tables and discrete columnar schemas (`make`, `model`, `serial_number`, `caliber`, etc.) with automatic JSON synthesis.
  - Implemented intelligent raw JSON array unwrapping and auto-classification (`Database::import_legacy_json`) for direct collection exports of firearms, ammunition, accessories, and components.
  - Added staged auto-migration on disk: importing SQLite or JSON databases while locked or uninitialized stages the file in `userData` and automatically absorbs, encrypts into `.enc` stores with the master key, and purges plaintext files upon subsequent unlock or setup.
  - Added seamless "Restore / Import Existing Database" action directly on the onboarding and login screen (`VaultLogin.tsx`) and enhanced `SettingsModal.tsx` / `BackupSettingsSection.tsx` with universal database import options.
- **Multi-Software Third-Party Database & Spreadsheet Ingestion Engine (`src-tauri/src/storage/importers.rs`, `src-tauri/src/storage/db.rs`, `src-tauri/src/commands/system_commands.rs`, `src-tauri/src/commands/vault_commands.rs`, `src/utils/csvImport.ts`)**:
  - Modularized ingestion into dedicated `src-tauri/src/storage/importers.rs`, adhering to strict anti-monolith guidelines and streamlining `db.rs` to ~260 lines.
  - Added multi-candidate table detection (`find_matching_table`) for third-party firearm management software databases (e.g. MyGunDB, GunSafe, GunLog, Gun Tracker, FastBound, ATF Bound Book) recognizing tables such as `guns`, `weapons`, `firearms`, `armory`, `ammunition`, `ammo`, `cartridges`, `gear`, `attachments`, `optics`, `accessories`, `locations`, `safes`, `reloading`, and `components`.
  - Implemented dynamic column synonym mapping and JSON synthesis: automatically translates competitor discrete columns (`manufacturer`, `model_name`, `serial_no`, `cal`, `amount_paid`, `date_acquired`, `brand_name`, `bullet_style`, `current_stock`, etc.) into canonical fields and comprehensive JSON objects, with safe monotonic ID assignment.
  - Built RFC 4180 compliant CSV/TSV parser supporting dynamic delimiters (`,`, `\t`, `;`, `|`), multiline fields, quotes, and intelligent entity classification (`detect_csv_entity`).
  - Added direct spreadsheet restore handling in `restore_backup` (`.csv`, `.tsv`, `.txt`), with automatic staging and absorption on unlock/setup.
  - Expanded frontend CSV header synonyms in `src/utils/csvImport.ts` for ATF Bound Book, MyGunDB, GunSafe, GunLog, and FastBound exports, and updated file pickers to accept all spreadsheet, recipe, and database formats (`.csv, .tsv, .txt, .json, .load, .loadbench, .ldb, .avr`).
- **Native macOS Text Edit & Application Menu (`src-tauri/src/lib.rs`)**:
  - Registered native default macOS edit menu in Tauri application lifecycle, restoring full system shortcuts (`Cmd+C`, `Cmd+V`, `Cmd+X`, `Cmd+A`, `Cmd+Z`, `Cmd+Q`) in all inputs.
- **Native CORS-Bypassing Barcode Lookup (`src-tauri/src/commands/system_commands.rs`, `src/bridge/tauriBridge.ts`)**:
  - Engineered native Rust `lookup_upc` command utilizing `reqwest` to query UPC databases, bypassing webview CORS origin restrictions.
- **Mobile LAN Companion Server 100% Feature Parity & Dual-Port Ecosystem Alignment (`src-tauri/src/server/mod.rs`, `src-tauri/src/commands/vault_commands.rs`, `src/bridge/tauriBridge.ts`)**:
  - Configured concurrent dual-port listening on standard port **`3456`** (ArmoryVault ecosystem standard) and legacy fallback port **`5174`** for seamless auto-discovery and backwards compatibility.
  - Implemented comprehensive token extraction supporting `Authorization: Bearer <token>` headers, JSON payload tokens, and query strings.
  - Fixed pairing handshake payload compatibility, returning `pairingToken`, `token`, `success: true`, and `status: "paired"` to ensure immediate pairing success and auto-saving on mobile companion clients.
  - Added immediate `"device-paired"` Tauri event emission on `/api/pair` and `/api/ping` to auto-close the pairing QR modal and trigger the emerald success toast.
  - Added missing companion endpoints: `GET /api/storage-locations`, `POST /api/chrono` (velocity sync), `POST /api/target-analysis` (grouping sync), and `GET /api/ballistic-profiles`.
  - Enriched `get_pairing_info` with scored network interface candidates (`interfaces`), filtering virtual adapters (`utun`, `docker`, `tailscale`) and enabling the network adapter switcher in `LanPairingModal.tsx`.
- **Frontend IPC Bridge & Live Event Subscriptions (`src/bridge/tauriBridge.ts`)**:
  - Added event listeners for `onSyncReceived`, `onDevicePaired`, and `onVaultLocked`.
  - Added `exportSkusCatalog`, `importSkusCatalog`, `getCustomSchedulePresets`, `saveCustomSchedulePresets`, `getPairingInfo`, `getPairingToken`, and `revokePairingToken`.
  - Added `printQRLabel` popup with dedicated 4"x2" printable CSS label styling.
  - Corrected FFL directory query endpoint to `/api/ffl/search`.
- **Vitest Testing Harness & CI Pipeline (`package.json`, `vite.config.ts`, `.github/workflows/qc.yml`)**:
  - Integrated `vitest`, `jsdom`, and `@testing-library/react` running 33 suites and 208 passing unit tests.
  - Added automated `npm test` step to the GitHub Actions Quality Control workflow.

- **Native LoadBench `.loadbench` & `.ldb` Project Recipe Format Ingestion (`src/utils/csvImport.ts`, `src/utils/BarcodeEngine.ts`, `src/components/modals/CsvImportModal.tsx`)**:
  - Implemented full schema support for LoadBench custom recipe files (`.loadbench` and `.ldb`) with MIME type `application/vnd.loadbench.recipe+json`.
  - Added extraction of nested reloader metadata (`metadata.author`, `metadata.lot_number`, `metadata.batch_size`, `metadata.target_firearm`), cartridge brass firings, projectile seating jump & CBTO, propellant charge, primer pocket size, simulated OBT harmonic nodes, and chronograph statistics (SD and ES).
  - Updated `CsvImportModal` dropzone and file inputs to accept `.loadbench` and `.ldb` extensions directly alongside `.load`, `.avr`, `.json`, `.csv`, and `.tsv`.
- **Accessories & Optics UI Modernization & Cross-Page Consistency (`src/pages/Accessories.tsx`, `src/components/accessories/AccessoryCard.tsx`, `src/index.css`)**:
  - Aligned the `Accessories & Optics` command center with `Dashboard.tsx` and `AmmoDashboard.tsx`, introducing the standard 5-card Command Metrics Grid (`.stat-card` for Total Gear Items, Optics & Sights, Magazines, Suppressors & NFA, and Gear Valuation with privacy masking).
  - Integrated the Unified Tactical Control Deck (`.dashboard-control-deck`) featuring Category Filter Chips (`All`, `Optics`, `Suppressors`, `Magazines`, `Holsters`, `Mounts`, `Stocks & Chassis`, `Mounted`, `In Safe`) with live count badges and vector icons.
  - Resolved multi-quantity price line wrapping glitch (`$•••••••• ($••••••• \n e a)`) by implementing `.accessory-price-row`, `.accessory-total-price`, and `.accessory-unit-price-badge` with `white-space: nowrap` protection.
  - Extracted card rendering into dedicated `src/components/accessories/AccessoryCard.tsx`, reducing `Accessories.tsx` from 1,021 lines to ~350 lines to strictly adhere to anti-monolith guidelines.
  - Eliminated all raw inline styles in favor of external CSS classes with WebKit vendor prefixing protocol and zero raw emojis.
  - Added unit test coverage for command metrics deck, category filter chips, and unit price badge formatting.

### Changed

- **UI Harmonization & Zero-Inline-Styles Compliance (`src/index.css`, `src/pages/`, `src/components/`)**:
  - Refactored `VaultLogin.tsx` to use external CSS classes and tactical ambient canvas mesh/grid backgrounds.
  - Standardized `.page-container`, `.page-header`, and `.header-actions` across `NfaTracker.tsx`, `LoadDevelopment.tsx`, `StorageOrganizer.tsx`, and `BallisticsCalculator.tsx`.
  - Corrected startup view route options in `AppearanceSettingsSection.tsx` to align with application routes (`/`, `/ammo`, `/components`, `/bound-book`, `/load-development`, `/ballistics`, `/nfa-tracker`).
  - Removed raw inline styles in `Layout.tsx` module navigation.
- **LoadBench Handload QR & Batch Ingestion (`src/utils/BarcodeEngine.ts`, `src/pages/SyncInbox.tsx`, `src/pages/AmmoDashboard.tsx`, `src/components/sync/cards/SyncItemMediaCard.tsx`)**:
  - Engineered direct recognition of LoadBench Ammo Can Label and Range Card QR payloads across both desktop scanning inputs and mobile sync queue.
  - In `BarcodeEngine.ts`, added automated extraction of handload parameters (caliber, bullet name, grain weight, powder name, charge weight, primer, COAL, velocity, pressure, lot number, and notes) classifying them immediately as `category: 'ammo'` with `type: 'handload'`.
  - In `SyncItemMediaCard.tsx`, added specialized emerald "LoadBench Handload Batch" preview card with 1-click "Accept Handload Batch" resolution directly navigating into the ammo editor.
  - In `AmmoDashboard.tsx`, enabled instant detection of pasted or scanned LoadBench QR strings in the UPC input bar, prefilling the custom handload form without triggering unnecessary online commercial UPC lookups.
- **LoadBench `.load` Project File & Handload Card Import Enhancement (`src/utils/csvImport.ts`, `src/components/modals/CsvImportModal.tsx`)**:
  - Implemented automatic recognition and parsing of LoadBench `.load` project files and JSON batch archives directly in `CsvImportModal`.
  - Added deep object property extraction (`cartridge.name`, `projectile.name`, `projectile.weight_grains`, `propellant.name`, `primer.name`, `simulated.muzzleVelocityFps`, etc.) preventing `[object Object]` stringification.
  - Automatically identifies handload entries and sets `type: 'handload'` with simulated muzzle velocity, peak pressure, CBTO, and lot info documented in record notes.
  - Expanded file dropzone and picker to accept `.load`, `.avr`, and `.json` in addition to standard CSV/TSV spreadsheets.

- **Tauri Native Stable Edition Transition & Version Identifier (`v2.11.0-Tauri`)**:
  - Formalized `ArmoryVault_Desktop_Tauri` as the incoming permanent stable and sole supported desktop build of ArmoryVault, establishing a dedicated testing verification pipeline prior to official retirement of legacy Electron binaries.
  - Appended `-Tauri` version suffix across `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` (`2.11.0-Tauri`), explicitly distinguishing the Tauri native desktop binary from legacy builds.
  - Integrated dynamic `env!("CARGO_PKG_VERSION")` into native Axum companion LAN sync `/ping` handshake for accurate cross-device client telemetry.
  - Updated application UI (`Layout.tsx`, `PreferencesSettingsSection.tsx`) to display `v2.11.0-Tauri` and "Tauri Native Desktop Edition • Local Encrypted Storage".
- **Platform Architecture & Tier Elevation**:
  - Confirmed `ArmoryVault_Desktop_Tauri` as the sole canonical desktop distribution of ArmoryVault going forward following the planned retirement of the Electron edition.
- **Hosting & Catalog Integration**:
  - Updated modular extension catalog endpoints in `ModuleManager.js` to point to `https://armstrader.store/armoryvault/modules/modules-index.json`.
  - Migrated web portal documentation and links in `README.md` and `website/` to `https://armstrader.store/armoryvault`.
  - Deprecated GitHub Pages deployment workflow in `.github/workflows/website.yml`.

---

## [3.0.0-Electron] - 2026-09-18

### Final Electron Release Notice

- **Final Official Electron Release (`v3.0.0-Electron`)**:
  - Marks the final milestone release of the Electron-based `ArmoryVault_Desktop` platform.
  - All future active desktop development, features, and performance enhancements migrate entirely to the lightweight, native Rust-powered Tauri v2 client (`ArmoryVault_Desktop_Tauri`).

### UI & Styling System Harmonization

- **Global Theme Tokens & Compatibility CSS Variables (`src/index.css`, `src/utils/themeEngine.ts`, `index.html`)**:
  - Defined missing `:root` compatibility CSS variables (`--card-bg`, `--bg-card`, `--border`, `--border-color`, `--text`, `--text-main`) to resolve unstyled backgrounds and collapsed borders across page and modal components.
  - Added dynamic accent tokens (`--accent-badge-bg`, `--accent-border`, `--accent-glow-raw`, `--accent-glow-shadow`) exposed via `themeEngine.ts` and initialized in `index.html`.
  - Harmonized buttons (`.btn-primary` uses `var(--accent)` and `var(--accent-hover)`), active sidebar nav links, active filter chips, active view-mode toggles, icon button hovers, form input focus rings (`.form-input`), upload zones (`.photo-upload`), modal backdrops, toast indicators, and `.vault-spinner` to dynamically follow user accent presets (OD Green, FDE, Crimson, Violet, Sand, Gunmetal, Blue, and Custom Hex).
  - Enhanced canvas overrides for OLED (`#0c0c0c` true contrast modal backgrounds without washouts) and Flat Slate (`--bg-surface-elevated`).
- **Page Container & Layout Rhythm Standardization**:
  - `StorageOrganizer.tsx`: Replaced redundant nested padding with `.page-container` and `.page-header` with `.header-actions`.
  - `LoadDevelopment.tsx`: Standardized outer wrapper to `<div className="page-container">` and `<div className="no-print page-header">`.
  - `NfaTracker.tsx`: Standardized outer wrapper to `<div className="page-container">` and `<div className="no-print page-header">`.
  - `BallisticsCalculator.tsx`: Standardized outer container to `<div className="page-container">` and `<div className="page-header">`.
  - `VaultLogin.tsx`: Added `.bg-mesh` and `.bg-grid` background elements, dynamic `--bg-canvas`, and accent border styling to align with application aesthetic standards.
- **Settings & Route Navigation Alignment (`src/components/settings/AppearanceSettingsSection.tsx`)**:
  - Corrected startup route target values (`/`, `/ammo`, `/components`, `/accessories`, `/bound-book`, `/maintenance`, `/storage`, `/load-development`, `/ballistics`, `/nfa-tracker`), repairing broken links to reloading and compliance bound book.
  - Switched privacy mode shield banner styling from static blue RGBA to dynamic `var(--accent-badge-bg)`.
- **CSS Vendor Prefixing & Cross-Browser Styling Harmonization (`src/index.css`, `website/style.css`, `website/index.html`)**:
  - Enforced strict vendor prefix ordering across all CSS declarations (`-webkit-backdrop-filter` preceding `backdrop-filter`, `-webkit-user-select` preceding `user-select`, and `background-clip: text`).
  - Added cross-browser `-ms-overflow-style: none;` alongside `scrollbar-width: none;` for clean scrollbar suppression.
  - Merged duplicate class attributes on landing page comparison table cells to maintain clean W3C validity and strict Biome compliance.
  - Codified permanent vendor prefixing and zero-inline-styles policies into workspace `AGENTS.md` rules.
- **Modular Reloading Performance & Data Caching (`src/modules/reloading/ReloadingComponents.tsx`)**:
  - Synced module implementation with cached `useVaultData()`, instant `buildStorageIndex()` O(1) lookups, and memoized filters.

### Electron Build & Security Hardening

- **ASAR Payload Optimization & Dependency Hygiene (`package.json`)**:
  - Segregated frontend-only packages (`lucide-react`, `react`, `react-dom`, `qrcode`, `react-qr-code`, `react-router-dom`, `react-window`) from `"dependencies"` into `"devDependencies"`.
  - Dramatically shrank `app.asar` size from 46.1 MB to < 5 MB (>90% reduction) by eliminating duplicate uncompiled icon and React vendor trees in production distributions.
  - Declared explicit `asarUnpack` patterns for native image pipeline dependencies (`sharp` and `@img/sharp-libvips-*`).
  - Formalized explicit NSIS installer parameters for Windows releases.
- **Renderer Window & Navigation Security Guards (`electron/main.js`)**:
  - Implemented `setWindowOpenHandler` intercepting `window.open` and target `_blank` anchor clicks, preventing rogue Electron windows and safely routing external HTTP/HTTPS/mailto URLs to the user's default system browser via `shell.openExternal`.
  - Added `will-navigate` lifecycle guard to lock navigation strictly to the local application runtime (`app://` and dev server).
  - Sanitized `getArmsTraderDbPath` by removing hardcoded personal filesystem paths and introducing `process.env.ARMSTRADER_DB` override support.

---

## [2.11.0] - 2026-09-14

### Performance & Client Architecture

- **In-Memory Client State Caching & IPC Request Coalescing (`src/context/VaultDataContext.tsx`, `src/App.tsx`)**:
  - Engineered `VaultDataContext` providing centralized in-memory client state caching and request coalescing across IPC queries (`getFirearms`, `getAmmo`, `getAccessories`, `getComponents`, `getStorageLocations`).
  - Added request deduplication so simultaneous queries across mounting widgets share a single pending IPC promise instead of creating redundant serialization roundtrips.
  - Implemented automatic cache refresh on network sync events and data mutations (`armoryvault-reload`, `onSyncReceived`).
  - Hydrated `Dashboard`, `Accessories`, `AmmoDashboard`, `ReloadingComponents`, and `StorageOrganizer` directly via `useVaultData()`.
  - Achieved instant 0ms tab switching across all primary navigation routes with zero loading latency or blank render flickers.
- **Elimination of React Dev Double-Mounting (`src/main.tsx`)**:
  - Removed `<React.StrictMode>` double-mounting in development runtime, cutting initial page mounting CPU overhead, `useEffect` double-invocations, and IPC queries strictly in half.

### Features & UI Personalization

- **Comprehensive Tactical UI Customization & Personalization Suite (`src/utils/themeEngine.ts`, `src/components/modals/SettingsModal.tsx`, `src/components/Layout.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Accessories.tsx`, `src/pages/AmmoDashboard.tsx`, `src/pages/StorageOrganizer.tsx`, `src/index.css`, `index.html`)**:
  - **7 Military & Tactical Preset Color Accents + Custom Hex Picker**: Built an instant accent switcher offering Tactical Blue (`#3b82f6`), OD / Ranger Green (`#22c55e`), Flat Dark Earth / Coyote Tan (`#f59e0b`), Night Vision Crimson (`#ef4444`), Stealth Gunmetal (`#94a3b8`), Desert Sand (`#eab308`), Cyber Violet (`#8b5cf6`), and an interactive Hex/RGB color picker with automatic luminosity-balancing and border glow calculation.
  - **4 OLED & Ambient Canvas Background Styles**: Implemented declarative canvas styles including Tactical Mesh (ambient gradient glow), OLED Pure Black (`#000000` true contrast & power savings), Midnight Navy (`#050914`), and Flat Slate (`#0d1117`).
  - **Interface Density & Corner Geometry Modes**: Added 3 UI density presets (Compact 0.85rem padding, Comfortable balanced, Spacious touch) and 3 corner radius geometry styles (Tactical Sharp 3px milspec corners, Modern Rounded 14px, Soft Pill 24px).
  - **Typography Families & Relative Scaling**: Introduced 3 font stacks (Inter Modern Sans, Milspec HUD Monospace, Native OS) alongside 3 font scale tiers (Compact 90%, Standard 100%, Comfort 112%).
  - **1-Click Discretion Shield (Privacy Mode)**: Integrated a one-click tactical privacy shield accessible from the top bar header and Settings modal that securely masks firearm serial numbers (`SN••••21`), total financial valuations (`$••••••`), and physical storage safe names during public range sessions, retail demonstrations, or screen-sharing.
  - **Modular Widget Visibility Engine**: Engineered granular widget visibility controls across Command Bar Metrics (Total Firearms, Rounds in Stock, Rounds Fired, Total Valuation, Maintenance Needed), Sectional Dashboard Widgets (Collection Analytics, Safe Storage Overview, Storage Valuations, Filter Chips, PDF Binder Export), Firearm Card Micro-Widgets (Thumbnails, Wear Gauges, Mounted Accessories Badges, Storage Badges, Telemetry Strips), and Sub-Page Widgets (Ammo Low Stock Alerts, Ammo Valuations, Accessory Valuations).
  - **Tactical Grid Density Controls**: Added a 3-tier card layout switcher on the Dashboard for Compact (5–6 cards/row), Standard (3–4 cards/row), and Showcase (2-up wide photo cards).
  - **Configurable Default Startup Screen**: Added user-selectable landing page routing upon vault unlock (Dashboard, Firearms Collection, Ammunition, Reloading Bench, Accessories, Bound Book, Maintenance, Storage Organizer).
  - **Zero FOUC & Dual Persistence**: Embedded pre-mount initialization script in `index.html` preventing flash-of-unstyled-content, persisting preferences across `localStorage` and `userData/config.json`.
  - **1-Click Appearance Reset**: Fast reset button in Settings and Dashboard popovers to instantly restore all themes, typography, density, and widget visibility settings back to factory defaults.

### Features & Migrations

- **Dedicated Module Storage Architecture (`electron/ModuleDataManager.js`, `electron/BackupManager.js`, `src/utils/moduleDataManager.test.ts`)**:
  - Decoupled extension module data (saved shooting ranges, handload reloading recipes, optics inventory, label templates, and maintenance presets) into dedicated readable JSON/CSV files in `userData/module_data/`.
  - Restored `config.json` to lightweight application preferences, eliminating configuration bloat and preventing module data from cluttering app settings.
  - Implemented automatic zero-data-loss migration on boot: existing module data stored in `config.json` is safely transferred to dedicated files in `module_data/` and pruned from `config.json`.
  - Added full zip backup and restore integration archiving all `module_data/` files in automated and manual `.zip` backup rotations.
- **Dedicated AES-256-GCM Encrypted Activity Log Database (`electron/ActivityLogDatabase.js`, `electron/database.js`, `electron/BackupManager.js`, `src/utils/activityLogDatabase.test.ts`)**:
  - Decoupled high-churn audit and user action history into its own dedicated encrypted store (`activity_log.enc`), isolating log updates from the primary firearms vault.
  - Implemented automatic zero-data-loss migration on vault unlock, stripping `data.activity_log` from `firearms_inventory.enc` and drastically shrinking the primary database.
  - Eliminates frequent re-encryption of all firearm and ammunition records whenever a user mounts an optic, edits ammo counts, logs a service, or approves a sync payload.
  - Added standalone `clearActivityLog()` capability and integrated `activity_log.enc` into backup rotations and full `.zip` archives.
- **Dedicated AES-256-GCM Encrypted SKU Database (`electron/SkuDatabase.js`, `electron/database.js`, `electron/BackupManager.js`, `src/components/modals/SkuManagerModal.tsx`)**:
  - Decoupled the custom SKU and barcode dictionary into its own dedicated encrypted store (`skus_database.enc`), isolating commercial reference metadata from personal firearm serial numbers and Bound Book logs.
  - Implemented automatic zero-data-loss migration: on vault unlock, legacy `data.skus` in `firearms_inventory.enc` is migrated into `skus_database.enc` and stripped from the main inventory, drastically shrinking the main vault file size and eliminating database bloat.
  - Decreased SKU write latency by 80–90% through atomic temp-file flushing and in-memory caching without re-serializing or re-encrypting the firearms vault.
  - Added standalone **Export Catalog** and **Import Catalog** capabilities in the SKU Manager modal, allowing users to backup, import, or share barcode libraries without exposing firearm records.
  - Integrated `skus_database.enc` into date-stamped backup rotations (`ArmoryVault_Skus_Backup_${dateStr}.enc`) and full vault `.zip` backup/restore archives.
- **Bulletproof 5-Layer Auto-Healing LAN Pairing Engine (`electron/main.js`, `electron/preload.js`, `src/pages/SyncInbox.tsx`, `src/types/index.ts`)**:
  - Implemented `getNetworkInterfacesInfo()` with physical NIC prioritization (`en0`, `eth0`, `wlan0`), private subnet preference (`192.168.*`, `10.*`), and strict blacklisting of unroutable virtual/VPN adapters (`utun*`, `awdl*`, `docker*`, `bridge*`, `veth*`, `tailscale*`).
  - Added multi-candidate pairing QR code embedding primary routable LAN IP, candidate fallback IPs, local mDNS hostname (`<hostname>.local:3456`), and 256-bit cryptographically secure bearer token (`crypto.randomBytes(32)`).
  - Enhanced Desktop `SyncInbox.tsx` listening badge with active network adapter details and multi-interface dropdown switcher for multi-homed workstation setups.
- **Universal Module Serialization & Cache Enrichment (`electron/main.js`)**:
  - Desktop dynamically detects and broadcasts `installedModules: string[]` across `/api/ping`, `/api/pair`, `/api/inventory/summary`, `/api/inventory/cache`, and dedicated `GET /api/modules` endpoint.
  - Enriched `/api/inventory/cache` to send complete firearm records (preserving acquisition/disposition FFL Bound Book fields, NFA tax stamp fields, and maintenance schedules), full accessories, `reloadingRecipes`, `savedRanges`, and `maintenanceSchedules` to mobile companion apps.
- **Universal CSV Import & Migration Engine (`src/utils/csvImport.ts`, `src/components/modals/CsvImportModal.tsx`, `electron/database.js`, `electron/main.js`, `electron/preload.js`)**:
  - Engineered an RFC 4180 compliant CSV and TSV streaming parser supporting custom delimiters (comma, tab, semicolon, pipe), quoted strings, escaped quotes (`""`), multiline notes, and UTF-8 BOM (`\uFEFF`) stripping.
  - Implemented intelligent competitor schema detection and synonym auto-mapping supporting direct migration from **GunSafe**, **GunLog / GunLogPro / GunLogSP**, **MyGunDB**, **Gun Tracker**, **ATF Bound Book exports**, and generic spreadsheets.
  - Added a unified, centralized **"Import Data (CSV)"** action in `SettingsModal.tsx` under the "Backup & Export Data" section with entity auto-detection (Firearms, Ammunition, Reloading Components, Accessories).
  - Built interactive 3-step import wizard (`CsvImportModal.tsx`) featuring drag-and-drop file upload, visual column mapping, live preview table of parsed rows with validation flags, and duplicate resolution (skip, update/merge, or import all).
  - Added atomic batch database importers (`importFirearmsBatch`, `importAmmoBatch`, `importAccessoriesBatch`, `importComponentsBatch`) in `electron/database.js` committing records to encrypted vault storage in a single file write.

### Architecture & Anti-Monolith Modular Standard

- **Anti-Monolith Architecture Policy (`AGENTS.md`, `.agents/AGENTS.md`)**:
  - Enacted Rule 9 across ArmoryVault Desktop, Mobile/Companion, Modules, and web ecosystems establishing a strict anti-monolith policy: files exceeding 500–800 lines must be aggressively partitioned into focused sub-modules.
  - Mandated that complex modal dialogues, forms, and `createPortal` components reside in dedicated subfolder files (`components/modals/`, `components/firearm-details/modals/`, `components/settings/`) rather than being declared inline inside parent page components.
- **FirearmDetails.tsx Monolith Decomposition (`src/pages/FirearmDetails.tsx`, `src/components/firearm-details/modals/`)**:
  - Reduced `FirearmDetails.tsx` from **4,526 lines down to 2,682 lines (a 1,844 line / 41% reduction)** by extracting 7 inline modal dialogues into dedicated sub-components with strict TypeScript typings:
    - `MarkAsSoldModal.tsx`: Extracted sold state, buyer lookup, and FFL dealer picker modal.
    - `FirearmLogModal.tsx`: Extracted range/cleaning/repair/modification log form, photo attachments, and smart ammo deduction.
    - `MaintenanceScheduleModal.tsx`: Extracted maintenance wear/service schedule creation and editing modal.
    - `TaskCompletionModal.tsx`: Extracted schedule task completion ledger, part replacement inputs, and cost tracking.
    - `MaintenancePresetPickerModal.tsx`: Extracted standard action profiles and custom schedule template picker modal.
    - `SaveScheduleTemplateModal.tsx`: Extracted schedule template export and save dialogue.
    - `GunsmithDossierModal.tsx`: Extracted full printable gunsmith service dossier, round telemetry cards, wear schedules, and mounted equipment specs.
- **SettingsModal.tsx Monolith Decomposition (`src/components/modals/SettingsModal.tsx`, `src/components/settings/`)**:
  - Reduced `SettingsModal.tsx` from **1,724 lines down to 296 lines (a 1,428 line / 83% reduction)** by partitioning vertical domain sections into focused sub-components under `src/components/settings/`:
    - `SecuritySettingsSection.tsx`: Master password change and vault recovery key actions.
    - `BackupSettingsSection.tsx`: Backup directory selection, automated rotation indicators, full `.zip` creation, and backup restoration.
    - `ReportsSettingsSection.tsx`: Insurance report PDF compiler, firearms CSV exporter, and CSV import modal triggers.
    - `AppearanceSettingsSection.tsx`: Preset military/tactical color palettes, custom hex color picker, OLED/ambient canvas backgrounds, UI density, corner geometry, and typography font scaling.
    - `WidgetVisibilityManager.tsx`: Collapsible micro-widget visibility engine across command bar metrics, dashboard sections, card badges, and inventory alerts.
    - `PreferencesSettingsSection.tsx`: Activity audit log access, total setup valuation toggle, collection analytics toggle, version badge, and GitHub releases integration.
- **StorageOrganizer.tsx Monolith Decomposition (`src/pages/StorageOrganizer.tsx`, `src/components/storage/`)**:
  - Reduced `StorageOrganizer.tsx` from **2,716 lines down to 563 lines (a 2,153 line / 79.3% reduction)** by decomposing container inspection, assignment modals, and location cards into dedicated modules under `src/components/storage/`:
    - `types.tsx`: Centralized storage container visual configurations (`renderAccessoryIcon`, `STORAGE_ICONS`, `TYPE_COLORS`).
    - `StorageLocationCard.tsx`: Extracted storage location card displaying capacity gauge meters, valuation telemetry, and rapid scan trigger.
    - `StorageLocationFormModal.tsx`: Extracted add/edit container form modal portal with custom icon selector and volume capacity inputs.
    - `StorageAssignItemModal.tsx`: Extracted item assignment modal portal supporting multi-entity browsing (Firearms, Ammo, Components, Accessories) and 1-click container assignment.
    - `StorageLocationDetailModal.tsx`: Extracted deep container inspection modal portal with rapid barcode scanning, item filtering, and 1-click unassign actions.
    - `index.ts`: Barrel export consolidating storage components for clean importing.
- **SyncInbox.tsx Monolith Decomposition (`src/pages/SyncInbox.tsx`, `src/components/sync/`)**:
  - Reduced `SyncInbox.tsx` from **3,906 lines down to 1,618 lines (a 2,288 line / 58.6% reduction)** by decomposing sync event queue renderers, maintenance alerts, and pairing dialogs into dedicated sub-components under `src/components/sync/`:
    - `PairSuccessToast.tsx`: Extracted auto-dismissing toast notification on device pairing.
    - `LanPairingModal.tsx`: Extracted multi-candidate QR code pairing portal with network interface selector and IP switcher.
    - `MaintenanceAlertBanner.tsx`: Extracted maintenance alert banner with 1-click transition to service logger.
    - `BoxSizePromptModal.tsx`: Extracted modal dialog prompting for custom box sizes when unknown ammo/component barcodes are synced.
    - `UnknownRouteModal.tsx`: Extracted router modal for unknown barcodes directing users to Ammo, Component, or Accessory creation.
    - `SyncInboxItemCard.tsx`: Extracted central sync queue item card dispatcher routing incoming payloads to specialized card renderers.
    - `SyncItemAdjustmentCard.tsx`: Extracted ammunition and reloading component inventory adjustment card.
    - `SyncItemFirearmCard.tsx`: Extracted new firearm and firearm specification update sync card.
    - `SyncItemLogCard.tsx`: Extracted firearm log and maintenance history sync card.
    - `SyncItemMediaCard.tsx`: Extracted universal barcode scan and firearm photo attachment sync card.
    - `SyncItemSessionCard.tsx`: Extracted range session, chronograph string, bill of sale transfer, and target analysis sync card.
    - `index.ts`: Barrel export consolidating sync components for clean importing.

### Performance & Optimization

- **88% Client JS Bundle Size Reduction & Lazy Loaded Modals (`src/components/Layout.tsx`, `src/main.tsx`, `vite.config.mts`)**:
  - Code-split heavy modal dialogues (`SettingsModal`, `SkuManagerModal`, `ActivityLogModal`, `RangeSessionModal`, `ChangePasswordModal`, `RecoveryKeyModal`, `ModuleCenterModal`) using `React.lazy()` and `<React.Suspense fallback={null}>`, ensuring modal JS code is only downloaded when opened.
  - Dynamically isolated `mockBackend.ts` so it is only loaded when `!window.api` (pure browser mode), preventing mock engines from polluting production Electron renderer bundles.
  - Implemented Rollup vendor partitioning in `vite.config.mts` (`vendor-react`, `vendor-icons`, `vendor-qr`, `vendor-misc`), reducing the initial application entry chunk from **632 kB down to 76.5 kB (88% reduction)**.
- **$O(1)$ Precomputed Storage Indexing & Keystroke Memoization (`src/utils/storageIndex.ts`, `src/pages/Dashboard.tsx`, `src/pages/AmmoDashboard.tsx`, `src/pages/StorageOrganizer.tsx`, `src/pages/Accessories.tsx`, `src/pages/ReloadingComponents.tsx`)**:
  - Developed `storageIndex.ts` to construct instantaneous $O(1)$ lookup maps (`Map<number, StorageLocation>`) for firearms, ammo, accessories, and reloading components.
  - Memoized aggregate valuation reducers (`firearmsVal`, `accessoriesVal`, `ammoVal`, `componentsVal`, `grandTotalVal`) and filtered arrays across Dashboard, Ammo Depot, Accessories, and Reloading Components, eliminating UI stutter and recalculation lag on every search input keystroke.
  - Built pre-indexed `firearmsById`, `accessoriesById`, `ammoById`, and `componentsById` maps in `StorageOrganizer.tsx`, eliminating repeated full-array $O(N \times M)$ iterations across storage location cards.
- **Parallel IPC Data Loading & WebP Image Thumbnailing (`src/pages/FirearmDetails.tsx`, `src/pages/Accessories.tsx`, `src/pages/ReloadingComponents.tsx`)**:
  - Parallelized serial IPC calls in `loadFirearm()` (`getFirearm()`, `getFirearmLogs()`, `getAmmo()`, `getAccessories()`, `getStorageLocations()`, `getSettings()`) using `Promise.all`, cutting firearm detail page load latency by up to 60%.
  - Parallelized IPC fetching in `Accessories.tsx` and `ReloadingComponents.tsx` to load items and storage locations concurrently.
  - Converted firearm photo strips, mounted accessories, and log attachment preview images in `FirearmDetails.tsx` to use Sharp thumbnail requests (`getLocalImageUrl(path, true)` with `?thumb=1`) along with `loading="lazy"` and `decoding="async"`, preventing multi-megabyte raw camera photos from locking the rendering thread during navigation.
- **Render-Blocking CSS Removal & Font Preconnection (`index.html`, `src/index.css`)**:
  - Eliminated synchronous `@import url(...)` font imports from `src/index.css`, replacing them with preconnected asynchronous Google Fonts links (`rel="preconnect"` + `rel="stylesheet"` with `display=swap`) in `index.html`.
  - Added CSS layout containment (`contain: content; content-visibility: auto; contain-intrinsic-size: 0 160px;`) to `.storage-quick-card` to skip offscreen layout passes for large inventories.
- **Asynchronous, Debounced Background Vault Backups (`electron/BackupManager.js`)**:
  - Debounced automated vault backups with a 5,000ms delay to prevent disk thrashing and duplicate backup jobs on rapid inventory edits.
  - Converted file copying, directory listing, and cleanup pruning in `BackupManager.js` from synchronous Node.js I/O (`fs.copyFileSync`, `fs.readdirSync`, `fs.unlinkSync`) to asynchronous `fs.promises`, preventing main process event loop freezes during vault writes.
- **Settings Menu Cleanup & Modal Layering Architecture (`src/components/modals/SettingsModal.tsx`, `src/components/modals/ActivityLogModal.tsx`, `src/components/modals/ChangePasswordModal.tsx`, `src/components/modals/RecoveryKeyModal.tsx`, `src/components/modals/CsvImportModal.tsx`, `src/components/modals/SkuManagerModal.tsx`, `src/components/Layout.tsx`)**:
  - Removed the redundant SKU & Barcode Manager button from the Settings modal's "Preferences & Mappings" section, cleanly streamlining the view now that SKU management is elevated to the sidebar footer.
  - Portaled `ActivityLogModal` directly to `document.body` via `createPortal`, fixing an issue where opening the Activity Log from Settings caused it to be rendered behind the Settings modal inside `#root`.
  - Harmonized modal z-index hierarchy across the application (`zIndex: 100000` for Settings modal and `zIndex: 100500` for child popups including Activity Audit Log, Change Password, Master Recovery Key, CSV Import, and SKU Manager), ensuring any pop-up triggered from the Settings menu renders seamlessly above Settings while keeping Settings open underneath.
- **Settings Menu Performance Optimization & SKU Manager Sidebar Elevation (`src/components/Layout.tsx`, `src/components/modals/SettingsModal.tsx`)**:
  - Promoted **SKU & Barcode Manager** to first-class status in the main program menu by adding a dedicated `Barcode` vector navigation button directly in the sidebar footer alongside Settings.
  - Resolved Settings menu sluggishness by parallelizing asynchronous configuration fetching (`getBackupFolder`, `showTotalSetupValue`, `showCollectionAnalytics`) concurrently via `Promise.all`.
  - Implemented conditional mounting across heavy modal components (`SettingsModal`, `SkuManagerModal`, `ActivityLogModal`, `RangeSessionModal`, `ChangePasswordModal`, `RecoveryKeyModal`) in `Layout.tsx`, preventing inactive modals from persisting in the DOM.

### UI & Web Portal

- **Streamlined ArmoryVault Web Portal & Retina Showcase (`website/index.html`, `website/style.css`, `website/app.js`)**:
  - Replaced simulated CSS mock command center window with a real high-resolution Retina screenshot of the live desktop application (`website/assets/screenshots/accessories.webp`).
  - Added click-to-expand native HTML5 `<dialog closedby="any">` high-resolution lightbox modal with keyboard (`Esc`/`Enter`) and backdrop click dismiss fallback.
  - Upgraded Open Graph and Twitter Card embeds to high-resolution screenshot with explicit width/height dimensions (`2880 x 1586`).
  - Streamlined desktop top navigation bar to prevent visual crowding and added bidirectional referral integration with `armstrader.store`.

### Bug Fixes

- **Universal Currency Formatting & String Concatenation Fix (`src/utils/currency.ts`, `electron/database.js`, UI components)**:
  - Created centralized currency utilities (`parseCurrency`, `parseCurrencyOrNull`, `formatCurrency`) with unit tests covering currency symbols, string parsing, empty strings, and malformed inputs.
  - Resolved string concatenation bug where prices stored as strings (e.g. `"375"`) concatenated in storage aggregations and displayed as `$037522500` or `$0200000`.
  - Added database-level data sanitizers in `electron/database.js` ensuring `purchase_price`, `sold_price`, `cost`, `value`, and `costPerRound` are converted to clean numbers on load and save.
  - Updated price inputs, calculation reducers, and displays across `Dashboard.tsx`, `StorageOrganizer.tsx`, `FirearmDetails.tsx`, `FirearmForm.tsx`, `Accessories.tsx`, `AccessoryModal.tsx`, `MountAccessoryModal.tsx`, `ReloadingComponents.tsx`, `ReloadingComponentModal.tsx`, `AmmoDashboard.tsx`, `BoundBook.tsx`, `PartsLedgerTab.tsx`, `MaintenanceDashboard.tsx`, `SkuManagerModal.tsx`, and `SyncInbox.tsx`.
- **Zero Installed Modules API Broadcast Fix (`electron/main.js`)**:
  - Fixed `getInstalledModulesList()` to strictly honor `config.installed_modules` when it is an array (including empty `[]` when the user has zero modules installed). Previously, an empty array `list.length === 0` caused a fallback that erroneously broadcast all 8 modules to paired mobile companion clients.

## [2.10.0] - 2026-09-13

### Added

- **Official Documentation Website & Dynamic Version Synchronization (`website/`, `.github/workflows/website.yml`)**:
  - Updated live GitHub Pages documentation website (`https://cook0001.github.io/ArmoryVault/`) to reflect Desktop v2.10.0 and Companion v2.7.12 (versionCode 321).
  - Updated AppImage and Windows setup download instructions to 2.10.0 and expanded `sitemap.xml` with `/privacy.html`.
  - Added an automated pre-deployment version synchronization step to `.github/workflows/website.yml` that dynamically extracts the current release version from `package.json` and updates website badges automatically.
- **Proactive Maintenance Threshold Detection & Service Routing (`src/pages/SyncInbox.tsx`, `src/modules/maintenance/MaintenanceDashboard.tsx`)**:
  - In `SyncInbox.tsx`, added dynamic wear and maintenance threshold inspection (`getFirearmMaintenanceWarning`) for incoming round depletions and range session approvals. Checks user-configured maintenance schedules (e.g. recoil spring at 3,000 rds, deep clean at 500 rds) against projected firearm round counts.
  - Renders amber `AlertTriangle` warning badges directly within queue cards when an incoming batch pushes a firearm past its service threshold.
  - Displays a persistent, dismissible alert banner upon approval with a 1-click **"Record Service Now"** action that routes directly to `/maintenance` and pre-opens `QuickServiceModal` with the target firearm and overdue task pre-filled.
- **Typst Armorer Work Order & Inspection PDF Generator (`electron/templates/armorer_work_order.typ`, `electron/main.js`, `src/modules/maintenance/MaintenanceDashboard.tsx`, `src/modules/maintenance/subtabs/PartsLedgerTab.tsx`)**:
  - Designed publication-grade Typst 0.15 vector template generating an Official Armorer Work Order & Inspection Certificate featuring work order ID, firearm specs, lifetime round counts, work performed notes, parts replaced ledger with cost breakdown, precision torque specifications table, test fire & chronograph telemetry, multi-point safety checklist, and certified armorer sign-off block.
  - Implemented `generate-work-order` IPC handler with complete 3-tier resilience: Tier 1 (Local native Typst binary compiling in 0.14s), Tier 2 (ArmsTrader Ephemeral Typst API Bridge via `https://armstrader.store/api/work-order/pdf` with 6s timeout, TLS 1.3 encryption, ephemeral temp isolation, zero server storage, and zero PII logging), and Tier 3 (offline Chromium `printToPDF` fallback).
  - Added serial number privacy masking (`maskSerials`) redacting sensitive numbers (e.g. `***-1234`).
  - Added 1-click **"Work Order PDF"** generation button in `MaintenanceDashboard.tsx` toolbar and direct row-level **"Work Order"** action buttons across entries in `PartsLedgerTab.tsx`.
- **Native Typst Bill of Sale & ArmsTrader Consolidation (`electron/main.js`, `electron/templates/bill_of_sale.typ`, `src/pages/FirearmDetails.tsx`)**:
  - Consolidated private firearm transfer documentation using a Zero-Bloat Hybrid architecture. Bundled the official Typst 0.15 legal template (`templates/bill_of_sale.typ`) matching ArmsTrader.store's single-page layout with 18 U.S.C. § 922 compliance declarations.
  - Automatically compiles vector PDFs in 0.14s using local `/usr/local/bin/typst` or `/opt/homebrew/bin/typst` with fallback to ArmsTrader API bridge and built-in Chromium print engine.
  - Added 1-click **Generate Bill of Sale (Typst PDF)** action in `FirearmDetails.tsx` for marked-as-sold firearms, saving external copies and archiving signed records in encrypted vault document storage.
- **High-Resolution Inspection Loupe & Multi-Angle Firearm Viewer (`src/components/Lightbox.tsx`, `src/pages/FirearmDetails.tsx`)**:
  - Upgraded Lightbox into a full-featured tactical Inspection Loupe with multi-tier zoom (1x to 5x), click-and-drag pan, mouse wheel zoom, reset hotkeys, and full keyboard navigation (`+`/`-`/`0`/`R`/`Esc`).
  - Added dedicated angle badging and thumbnail strip matching Mobile's Standardized 4-Angle Studio (Slot 1: Left Profile, Slot 2: Right Profile, Slot 3: Rollmark & Serial, Slot 4: Proofs & Bore, and custom angles) with single-click angle switching.
- **Interactive FFL Dealer & Shooting Range Finder Modals (`src/components/modals/FflPickerModal.tsx`, `src/components/modals/RangePickerModal.tsx`, `src/pages/FirearmDetails.tsx`, `src/components/modals/RangeSessionModal.tsx`)**:
  - Created dedicated tactical modal pickers: `FflPickerModal` queries the live `https://armstrader.store/api/ffl/search` API so licensee records stay continuously synchronized with the latest ATF database without maintaining local copies on desktop, while `RangePickerModal` queries verified shooting facilities.
  - Integrated `FflPickerModal` into `FirearmDetails.tsx` (Bill of Sale and transfer forms) to auto-fill licensed transfer agent details, address, and phone with a single click.
  - Integrated `RangePickerModal` into `RangeSessionModal.tsx` ("Browse Facilities") to auto-fill range location, facility name, and fees into live range sessions.
  - Added unit test suites `FflPickerModal.test.tsx` and `RangePickerModal.test.tsx` (100% passing).
- **Typst Multi-Page Insurance Appraisal & Armory Catalog Binder (`electron/templates/armory_binder.typ`, `electron/main.js`, `src/pages/Dashboard.tsx`)**:
  - Designed multi-page Typst 0.15 vector template generating a professional Valuation Certificate, category breakdown summary (Firearms, Ammo, Optics, NFA, Accessories), itemized firearm sheets with condition grading, replacement values, and NFA Form 1/4 compliance ledger.
  - Added `generate-armory-binder` IPC handler compiling Typst in 0.14s with automated fallback to headless Chromium print-to-PDF and encrypted document vault archiving.
  - Added **"Export Insurance Binder (PDF)"** action button to Dashboard header.
- **Range Telemetry Sync & Automated Round Count Progression (`src/pages/SyncInbox.tsx`, `src/types/index.ts`)**:
  - Enhanced `SyncInbox.tsx` approval engine (both individual and batch approval) to parse `range_session` items, auto-recording telemetry into `window.api.addTargetAnalysis` (group metrics, MOA, spread) and `window.api.addChronoString` (shot velocities, avg, SD, ES).
  - Wired automated firearm round count progression: approving `ammo_adjustment` items with `action === 'remove'` and associated firearm automatically increments the firearm's `round_count` in `firearms_inventory`, displaying live progression badges on the approval card.
- **Optics & Zero Vault Modular Extension (`src/modules/registry/ModuleHost.tsx`, `src/App.tsx`, `src/components/Layout.tsx`)**:
  - Integrated the new 6th extension module (`optics`) into the desktop application, enabling zero-distance records, turret click value registries (MRAD/MOA), optic torque specifications, and battery schedules with offline mobile synchronization.
- **ArmsTrader Server Bridge for Ephemeral Typst Binder Generation (`electron/main.js`, `armstrader.store`)**:
  - Added resilient multi-tier PDF generation: Tier 1 (local Typst binary in 0.14s), Tier 2 (cloud fallback via `https://armstrader.store/api/armory-binder/pdf` with 6s timeout, TLS 1.3 transit encryption, ephemeral compiling in memory/temp isolation, zero database persistence, zero PII logging, and rate-limiting), and Tier 3 (offline Chromium `printToPDF`).
  - Added serial number masking toggle (`maskSerials`) for insurance binders, allowing users to redact serial numbers (e.g. `***-1234`) when sharing valuations with underwriters.
- **Shooting Range Finder Pluggable Module (`modules/ranges/`, `src/App.tsx`, `src/components/Layout.tsx`)**:
  - Created pluggable 7th extension module (`ranges`) packaged into `module-ranges.zip` for on-demand installation via the Module Center.
  - Features directory searching across 2,539 verified facilities by 5-digit ZIP and state chips, facility amenity filtering (1,000+ yd long range, tactical bays, steel targets, chronograph benches, trap & skeet, rental counters), home range bookmarking, lane fee tracking, and direct map navigation.
  - Registered `/ranges` route and navigation bar item with `Compass` vector icon.
- **Batch Label & QR Print Studio Pluggable Module (`modules/labels/`, `src/App.tsx`, `src/components/Layout.tsx`)**:
  - Created pluggable 8th extension module (`labels`) packaged into `module-labels.zip` for on-demand installation via the Module Center.
  - Batch prints vector QR codes and barcodes for ammo boxes, magazines, storage cans, and firearms across standard label sheets (Avery 5160 30-up, Avery 5163 10-up weatherproof) and continuous 62mm thermal rolls (Brother QL / Dymo).
  - Features multi-select item picker, copy multiplier, element toggles (QR, date, SKU, borders), live print preview grid, and zero-margin print stylesheets.
  - Registered `/labels` route and navigation bar item with `Printer` vector icon.

## [2.9.0] - 2026-09-13

### Added

- **Pluggable Installable Modules Architecture & In-App Module Center (`src/modules/`, `ModuleCenterModal.tsx`)**:
  - Modularized advanced features into self-contained directories under `src/modules/<module_id>/` with independent `manifest.json` definitions, isolated versioning (`v1.0.0`), code-split dynamic route chunks, and custom command palette actions:
    - `reloading`: ReloadingComponents, LoadDevelopment, ReloadingComponentModal, BatchManufactureModal.
    - `maintenance`: MaintenanceDashboard, MasterScheduleTab, OpticRegistryTab, PartsLedgerTab, ServiceBoardTab.
    - `ballistics`: BallisticsCalculator, G1/G7 trajectory engine.
    - `nfa`: NfaTracker, Form 1/4 status, tax stamps, trust records.
    - `boundbook`: ATF acquisition & disposition ledger for Curio & Relic / FFL compliance.
  - Created in-app **Module Center** (`ModuleCenterModal.tsx`), accessible directly adjacent to Settings in the sidebar footer via the `Blocks` vector icon (strictly conforming to Rule 7 emoji ban). Features live search, category filtering (`All`, `Bench`, `Armorer`, `Range`, `Compliance`), module metadata inspection, and 1-click Install, Uninstall, and Data Restoration.
- **Dedicated Modules Repository & Dynamic Module Discovery (`cook0001/ArmoryVault-Modules`, `ModuleManager.js`)**:
  - Established a dedicated GitHub repository [cook0001/ArmoryVault-Modules](https://github.com/cook0001/ArmoryVault-Modules) hosting all pluggable modules independently from core desktop builds.
  - Published initial release `v1.0.0` featuring individual zip packages (`module-reloading.zip`, `module-maintenance.zip`, `module-ballistics.zip`, `module-nfa.zip`, `module-boundbook.zip`) and raw catalog index `modules-index.json`.
  - Added automated module packaging and GitHub Actions release pipeline (`.github/workflows/release-modules.yml`) for rapid independent updates without recompiling or rebuilding the core desktop app.
  - Integrated dynamic module catalog checking (`checkRemoteModules` IPC and `checkRemote` in `ModuleContext`): Core app queries `ArmoryVault-Modules` catalog with automatic multi-tier fallback, HTTP redirect following (GitHub to AWS S3), and offline cache resilience (`userData/remote_modules_cache.json`).
  - Added "Check for New Modules" button with spinning `RefreshCw` icon in `ModuleCenterModal.tsx` allowing users to discover newly released modules on-demand.
- **Remote On-Demand Module Downloading & Release Packaging (`scripts/package-modules.js`, `electron/ModuleManager.js`, `release.yml`)**:
  - Implemented **Option 2 (Remote On-Demand Downloading)**: Base application installer stays lean containing only core essentials (Dashboard, Firearms, Ammo Depot, Storage Organizer, Accessories, Vault Security). Specialized modules are packaged into standalone zip files (`dist-modules/module-*.zip`) and uploaded as GitHub Release assets alongside SHA-256 checksums (`dist-modules/modules-index.json`).
  - Added `ModuleManager.js` in Electron backend to stream remote module downloads from `cook0001/ArmoryVault-Modules` with automatic HTTP 302 redirect handling (GitHub to AWS S3), real-time byte-level progress reporting via IPC (`onModuleDownloadProgress`), checksum verification, and atomic zip extraction to `userData/installed_modules/<module_id>/`.
  - Added local development and air-gapped fallback support so modules load seamlessly without remote network calls during development or test execution.
  - Enhanced `ModuleCenterModal.tsx` with live download progress bars, estimated package sizes (~6 KB to ~26 KB), GitHub Release badges, and granular uninstallation choices (keeping downloaded code files on disk for instant offline re-activation vs. deleting code files to free disk space, while always preserving encrypted user data archives).
- **Encrypted Module Archiving, Database Pruning & Backup Mobility (`BackupManager.js`, `database.js`)**:
  - Added encrypted module archiving: When a module is uninstalled, its data keys are extracted, encrypted using AES-256-GCM with the vault master key, and written to `userData/module_archives/<module_id>.enc` while pruning them from `firearms_inventory.enc` to optimize database size and memory consumption.
  - Updated `createZipBackup` and `restoreBackup` in `BackupManager.js` to automatically package and restore `module_archives/`, ensuring archived data travels with the user when moving between computers.
- **Safe Fallback Guarantees & Zero-Crash Mobile Sync Compatibility (`SyncInbox.tsx`, `ModulePromptView.tsx`)**:
  - Built `ModulePromptView.tsx` fallback view for direct route navigation to uninstalled modules, providing a clear explanation, archive detection banner, and 1-click installation.
  - Hardened `SyncInbox.tsx` with dedicated fallback rendering when receiving mobile companion adjustments for uninstalled modules (e.g., reloading components), displaying a dedicated action card with 1-click module installation and discard controls without crashing or showing null.
  - Protected `handleApproveAll` and individual approvals to safely skip uninstalled module payloads without data loss or exceptions.

### Changed

- **Directory Structure & Modal Reorganization**:
  - Consolidated 15 modal dialogs and corresponding unit test suites into `src/components/modals/` with clean barrel exports.
  - Moved build and icon utility scripts to `scripts/tools/` and cleaned root directories.

## [2.8.3] - 2026-09-13

### Changed

- **Build Infrastructure & Vite Native Loader Compatibility (`vite.config.mts`, `tsconfig.node.json`)**:
  - Migrated `vite.config.ts` to `vite.config.mts` using native `import.meta.dirname` path resolution, eliminating Vitest configuration loader deprecation warnings and ensuring forward-compatibility with future Vite native config loaders.
  - Updated `tsconfig.node.json` compiler inclusion to track `vite.config.mts`.
- **Code Quality & Diagnostic Modernization (`App.tsx`, `database.js`, test suites)**:
  - Replaced legacy `window.api && window.api.X` safety checks in `src/App.tsx` with modern optional chaining (`window.api?.isVaultSetup`, `window.api?.onVaultLocked`, `window.api?.lockVault`).
  - Implemented optional chaining for SKU queries in `electron/database.js`.
  - Cleaned up unused variables and imports in `src/components/AccessorySku.test.tsx`, `src/components/AmmoCanLabel.test.tsx`, `scripts/clean-fresh.js`, and `scripts/prepare-release.js`.

## [2.8.2] - 2026-09-12

### Fixed

- **Mobile Inventory Cache Ammunition Data Synchronization (`electron/main.js`, `SyncInbox.tsx`)**:
  - Updated `/api/inventory/cache` endpoint to include all ammunition specification fields (`category`, `shell_length`, `shot_size`, `oz_payload`, `pellet_count`, `powder`, `powderCharge`, `primer`, `primer_type`, `notes`, `storageLocationId`, `costPerRound`, `bullet_manufacturer`, `isPlusP`).
  - Resolved regression where shotgun shells synced to mobile companion clients lacked shell length, shot size, pellet count, and payload attributes.
  - Added support in `SyncInbox.tsx` for approving and persisting `isPlusP` pressure rating updates received from mobile `ammo_adjustment` sync events.
- **UI Vector Icon Modernization & Strict Emoji Ban (`RecoveryKeyModal.tsx`, `FirearmDetails.tsx`, `Accessories.tsx`)**:
  - Replaced legacy raw emoji placeholders with Lucide vector icons: `Lightbulb` in `RecoveryKeyModal.tsx`, and `Disc` on magazine accessory capacity badges in `FirearmDetails.tsx` and `Accessories.tsx`.
- **Website Portal Modernization & SVG System (`website/index.html`, `website/sitemap.xml`)**:
  - Synchronized web portal version tags to Desktop `v2.8.2` and Mobile Companion `v2.7.9`.
  - Replaced all raw emojis across showcase tabs, platform badges, donation tier chips, and spotlight tags with inline SVG vector icons.
  - Replaced OS text symbols on download cards with crisp Apple, Windows, and Linux vector SVGs for universal cross-platform rendering.
  - Updated feature highlights with safe container QR stickers, +P pressure rating toggles, and dedicated shotgun shell specifications.
  - Refreshed `sitemap.xml` lastmod timestamp.
- **Interactive Official User Guide & Knowledge Base (`website/index.html`, `website/style.css`, `website/app.js`)**:
  - Integrated interactive User Guide & Knowledge Base directly into the web portal with real-time search, category pill filters (`All Topics`, `Installation & Setup`, `Local Sync & Pairing`, `Inventory & Storage`, `Range & ATF Compliance`, `Vault Security & Backups`), deep-linking anchor support (`#guide-...`), and accessible mutually exclusive accordions.
  - Comprehensive troubleshooting guides covering macOS Gatekeeper `xattr` fixes with 1-click clipboard copy, Windows SmartScreen bypass, Linux AppImage execution, Android APK sideloading & OTA updates, zero-cloud Wi-Fi P2P sync, firewall & AP isolation troubleshooting, safe QR labels, chronograph MOA analysis, ATF Bound Book exports, and PBKDF2/AES-256 backup restoration.
- **Ecosystem Compatibility Synchronization (`VERSION_COMPATIBILITY.md`)**:
  - Synchronized Recommended Deployment Configuration to Desktop `v2.8.2` and Mobile Companion `v2.7.10` (`versionCode 319`).

## [2.8.1] - 2026-09-12

### Added

- **Bill of Sale Document Archival & Desktop Synchronization**:
  - Added `save-base64-document` IPC handler in `electron/main.js` and exposed via `electron/preload.js` to securely persist transferred PDF documents into the desktop vault's `documents/` directory.
  - Enhanced `SyncInbox.tsx` (`handleApplyItem` and `handleApplyAll`):
    - Automatically attaches transferred Bill of Sale PDFs to `firearm.documents`, visible immediately under **Documents & Receipts** on `FirearmDetails.tsx`.
    - Automatically updates firearm status to `is_sold: true`, setting `sold_date`, `sold_to_name`, `sold_price`, `sale_notes`, and `condition: 'Sold / Transferred'`.
    - Appends ATF Bound Book disposition string to `notes` for regulatory compliance.
  - Replaced raw emoji placeholders with Lucide vector icons (`FileText`).

### Fixed

- **Ammo Card Header Layout & Text Overflow**:
  - Restructured ammo cards in `AmmoDashboard.tsx` to use a dedicated flex top bar for storage location badges and quick action buttons (`Tag`, `Printer`, `Save QR`, `Edit`, `Delete`).
  - Allocated full card width for caliber titles (e.g., `.30-06 Springfield`, `.45-70 Government`), completely eliminating visual clipping and collisions between location tags and action buttons.
  - Added defensive text truncation (`text-overflow: ellipsis`) to `StorageBadge.tsx` for extra-long storage container names.
  - Improved layout flow in reloading component cards to prevent manufacturer and action button overlap.
- **Load Development & Ladder Testing UI Polish**:
  - Fixed header action buttons (`Cost Calculator`, `Print DOPE Sheet`, `New Ladder Test`) with single-line horizontal alignment (`whiteSpace: nowrap`), proper icon spacing, and cursor pointers, eliminating awkward 2-line text breaks.
  - Made the **Handload Cost-Per-Round & Savings Calculator** globally accessible directly below the header, ensuring it opens cleanly even when no ladder tests have been saved yet.
  - Upgraded the empty state from an unstyled text line into a rich, tactical hero workspace with ambient illumination, clear feature descriptions, quick-action buttons, and three capability cards (Incremental Steps, Harmonic Nodes, Velocity & Group Analysis).

## [2.8.0] - 2026-09-12 (Official Unified Release)

### Unification & Modernization

- **Unified Desktop Codebase**:
  - Promoted all features and architectural improvements to the official production release stream (`v2.8.0`). Permanently retired the Nightly channel.
  - Streamlined release packaging and CI scripts (`scripts/build-release.js`), eliminating nightly branching, flags, and retention filters.
  - Multi-platform packaging builds and publishes verified macOS, Windows, and Linux installers directly as official releases.
- **Master Features Promoted**:
  - Mobile Firearm Intake & Spec Updates Ingestion (`src/pages/SyncInbox.tsx`) with 1-tap card ingest, photo storage, and deduplication.
  - Modular Database Engine & Schema Versioning (`VaultEncryption.js`, `BackupManager.js`, `MediaManager.js`) with monotonic IDs and atomic saves.
  - Cryptographically secure local Wi-Fi pairing token authentication with instant QR code token ingestion.
  - Global Command Palette (`Cmd+K` / `Ctrl+K`) and 10-second undo toast for deletions.
  - First-class accessory categories for Gun Belts, Western Drop Belts, Stocks, Chassis, and Thompson/Center modular furniture.
  - Full automated test suite (117 tests passing).

## [2.8.0-nightly.8] - 2026-08-22 (Nightly Test Build)

### Added

- **Mobile Firearm Intake & Spec Updates Ingestion (`src/pages/SyncInbox.tsx`)**:
  - Direct 1-tap ingest card for `new_firearm` and `firearm_update` sync payloads from mobile companion app.
  - Automatically saves base64 photo payloads to local media store, inserts new firearms, and links storage container assignments.
  - Added "Review in Form" integration pre-populating `FirearmForm.tsx` from sync inbox.
  - Automatic serial number deduplication and matching.

## [2.8.0-nightly.7]

### Preview & Architecture Upgrade Release

- **Modular Database Engine & Schema Versioning**:
  - Refactored monolithic `database.js` into modular components: `VaultEncryption.js` (encryption, key management, schema migrations, and monotonic ID generation), `BackupManager.js` (date-stamped backups, zip archives, and safe restore), and `MediaManager.js` (photo/document asset storage and thumbnail generation).
  - Introduced automated Schema Migration Engine (`v0` -> `v1` -> `v2`) with monotonic `_nextId` counters per collection, atomic temp-file writes, and an optimistic concurrency `_lastModified` timestamp.
  - Resolved critical P0 handload batch manufacturing bug by ensuring component deduction targets `data.components` (Powder, Primer, Brass, Bullet).
- **Security Hardening & P2P Companion API**:
  - Implemented cryptographically secure 32-byte pairing token authentication (`crypto.timingSafeEqual`) on local Wi-Fi Companion API endpoints with token revocation capabilities.
  - Embedded pairing authorization tokens directly into QR codes generated in Sync Inbox for 1-tap instant mobile pairing without 403 authorization rejections.
  - Enforced Express API rate limiting (60 reads/min, 30 writes/min) and input validation with automatic sync queue deduplication (`timestamp + type + upcOrId`).
  - Restricted CORS origin validation strictly to local private network ranges (`127.0.0.1`, `localhost`, `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`) and standardized on stable Express v4 LTS.
- **Global Command Palette (Cmd+K / Ctrl+K)**:
  - Integrated a fast, keyboard-navigable search and navigation command palette with fuzzy filtering for quick jumps across all major vault modules and tools.
- **10-Second Undo Toast for Deletions**:
  - Introduced `UndoToastProvider` context with timed undo actions and progress countdowns, providing a safety net for inventory deletions.
- **Audit Logging Foundation**:
  - Implemented an encrypted 1000-entry FIFO activity audit trail tracking additions, deletions, range sessions, and manufacturing events.
- **Unit Testing Suite**:
  - Added dedicated database unit tests (`src/utils/database.test.ts`) covering schema migrations, monotonic ID generation, batch manufacturing deductions, activity log caps, and sync deduplication (117 total passing tests).

## [2.8.0-nightly.6]

### Preview & Community Bug Testing Release

- **First-Class Accessory Support for Gun Belts & Tactical Loadout Belts (Expanded: Western Drop Belts & Cartridge Loops)**:
  - Added dedicated **`Belt`** accessory category across ArmoryVault with custom vector SVG icon [`GunBeltIcon`](file:///Users/danielc/Documents/ArmoryVault_Desktop/src/components/CustomIcons.tsx) and Tactical Amber Gold (`#eab308`) accent styling.
  - **Comprehensive Belt Subtypes & Families**: Added support for **Western Buscadero Drop Belts (Single/Double Drop)** (The Hunter Company 150/155 series, Triple K #110 Wyoming, El Paso Saddlery 1880), **Straight Western Cartridge Belts** (Hunter 158 series, Kirkpatrick, Triple K Deluxe), **Cross-Chest Bandoliers & Shotshell Belts** (Triple K, Galco), **Folded Leather Money Belts / Prairie Belts** (SASS / Frontier), **Two-Piece MOLLE Battle Belts** (Blue Alpha Battle Belt Lite, AWS SMU, Ronin Senshi, Ferro Bison), **EDC Concealed Carry Ratchet Belts** (Kore Essentials X-Series, Nexbelt Titan/Supreme), **Low-Profile EDC Nylon Belts** (Tenicor Zero, Blue Alpha Low-Profile), **Reinforced Leather Gun Belts** (Daltech Force Steel Core, Bigfoot Gun Belts, Galco SB2/SB3), **Competition Rigs** (Double-Alpha DAA Lynx, Safariland 032 ELS), **Duty Belts** (Safariland 7920, Bianchi AccuMold), and **Padded War Belt Sleeves** (HSGI Sure-Grip, Viking Tactics Brokos).
  - **Rich Technical Specification Suite**: Built technical modeling and UI inputs for **Western Drop Loop Configuration** (`Single Drop Right-Hand`, `Single Drop Left-Hand`, `Double Drop Dual/Cross-Draw`), **Integrated Cartridge Loops** (`.22 LR/.22 WMR`, `.38 Special/.357 Mag`, `.44 Mag/.45 Colt`, `.45-70 Govt`, `12 Ga/20 Ga Shotshells`, with loop count tracking), **Belt Width** (`1.5" EDC`, `1.75" Battle`, `2.0" Cartridge`, `2.25" Duty`, `2.75" - 3.0" Buscadero`), **Buckle Mechanism** (`AustriAlpin Cobra Quick-Release`, `Micro-Adjustable Ratchet / Track 1/4" Steps`, `Western Clipped Nickel`, `Dual-Prong Roller`, `Single-Prong Brass`, `G-Hook`, `DAA Lynx Modular Links`), **Internal Stiffener Core** (`Tegris Composite`, `Power-Core Polymer`, `Dual-Layer Spring Steel`, `Scuba Webbing`, `Ballistic Nylon`), **Attachment Interface** (`Integrated Western Drop Slot for Hunter 1060/1100/2200 Holsters`, `Laser-Cut Micro-MOLLE`, `ELS/QLS Forks`, `Holster Clips`), **Waist Sizing Range**, **Inner Belt System**, **Color/Tooling Pattern**, **Material**, and **Weight**.
  - **Intelligent Barcode Classification**: Enhanced `BarcodeEngine.ts` to automatically detect and classify gun belts from retail barcodes (detecting The Hunter Company, Triple K, El Paso Saddlery, Kirkpatrick, Kore Essentials, Nexbelt, Blue Alpha, AWS SMU, Ronin Senshi, Ferro Bison, Tenicor Zero, Safariland ELS, DAA Lynx, Bigfoot, Daltech Force, and Buscadero drop rigs).
  - **UI & Modal Integration**: Updated `AccessoryModal.tsx`, `AccessoryDetailModal.tsx`, `MountAccessoryModal.tsx`, `Accessories.tsx`, `FirearmDetails.tsx`, `Dashboard.tsx`, `StorageOrganizer.tsx`, and `SkuManagerModal.tsx` with dedicated form sections, tactical spec chips, and full technical dossier grids.
- **First-Class Accessory Support for Stocks, Chassis & Specialty Furniture (Expanded: Thompson/Center Encore & Contender)**:
  - Added dedicated **`Stock`** and **`Chassis`** accessory categories across the ArmoryVault ecosystem with custom vector SVG icons (`StockIcon`, `ChassisIcon`) and color styling (Emerald `#10b981` Stock, Cyan `#06b6d4` Chassis).
  - **Deep Modular Support for Thompson/Center Single-Shot Break-Action Platforms**: Built specialized support for **T/C Encore & Pro Hunter**, **T/C Contender (G1 / Armor Alloy)**, and **T/C G2 Contender / SSK-50** frames. Includes dedicated furniture subtypes (**T/C Rifle Buttstocks** like Pro Hunter FlexTech and Boyd's Hardwood, **T/C Pistol Grips & 1913 Adapters** like Pachmayr Decelerator and Sharps Bros AR-15 grip chassis, **T/C Forends** for 10" Bull, Super 14", Heavy Rifle, and Muzzleloader ramrods, plus Free-Floating Hanger Bar systems).
  - **Precision Bolt-Action & Tactical Chassis Systems**: First-class tracking for MDT (ACC Elite, XRS, LSS, ORYX), KRG (Whiskey-3, Bravo, X-Ray), Magpul (Pro 700, Hunter), MasterPiece Arms (BA Comp), XLR, and AR-15/AR-10 platform stocks.
  - **Rich Technical Specification Suite**: Added data modeling and UI inputs for **Action Inlet / Platform Fits** (Rem 700 SA/LA, Tikka T3x, Savage 110, AR-15, Ruger 10/22, T/C Encore, Contender G1, G2/SSK-50), **Mounting Interface / Buffer Tube standard** (Mil-Spec 1.14" OD, Commercial 1.17" OD, A2 Fixed, 1913 Picatinny Rail Mount, T/C Frame Bolts, Direct V-Block Bedding), **T/C Forend Screw Spacing & Contour** (Single-Screw, Double-Screw, Bull Contour, Hanger Bar), **Length of Pull (LOP)**, **Comb / Cheek Riser Height**, **Magazine Pattern Compatibility** (AICS / AW, STANAG, SR25, BDL Floorplate, Single Shot N/A), **Forend Rails** (Full ARCA-Swiss + M-LOK, M-LOK 3/6/9, Picatinny Quad, Sling Swivels), **Folding Mechanism Toggle**, **Material & Construction**, and **Component Weight**.
  - **Intelligent Barcode Classification**: Enhanced `BarcodeEngine.ts` to automatically detect and classify stocks, chassis, and T/C furniture from retail barcodes and UPC product listings (recognizing MDT, KRG, Magpul Hunter/CTR/PRS, SBA3/SBA4/SBA5, B5 Bravo/SOPMOD, Pachmayr, Choate, HausOfArms, Sharps Bros, EABCO, Boyd's, and T/C Encore/Contender frames).
  - **Tactical Cards & Dossier Displays**: Updated `Accessories.tsx`, `FirearmDetails.tsx`, `AccessoryDetailModal.tsx`, `MountAccessoryModal.tsx`, `Dashboard.tsx`, `StorageOrganizer.tsx`, and `SkuManagerModal.tsx` to render stock & chassis spec chips, filter badges, and full technical dossier grids.
- **Select & Mount Existing Accessories on Firearm Details**: Added a dedicated accessory picker modal (`MountAccessoryModal.tsx`) directly accessible from the Firearm Details view (`FirearmDetails.tsx`). Users can now browse, search, and filter all existing optics, suppressors, lights, magazines, and gear already saved in their inventory to mount or transfer them to the active firearm with 1-click. Supports multi-quantity item allocation (e.g. allocating 2 of 5 magazines), real-time search across manufacturer/model/serial/caliber, live mounting status indicators (In Storage vs Mounted elsewhere), and 1-click **"Unmount / Detach"** buttons on mounted tactical cards without deleting accessories from the vault catalog.
- **Automated Release Retention Pruning Engine**: Built a dedicated Node.js automation CLI (`scripts/prune-releases.js`) and npm commands (`release:prune`, `release:prune:all`, `release:prune:dry`) that enforces the **2 Stable + 1 Nightly** release retention policy. Integrated an automated post-publish pruning step into the GitHub Actions CI/CD release workflow (`.github/workflows/release.yml`) so all future releases automatically delete superseded legacy binaries from GitHub Releases while preserving the two most current stable releases and the single most current nightly preview build.
- **Website Downloads & Direct APK QR Delivery Engine**: Overhauled the mobile companion download section on the landing website (`website/index.html`, `website/app.js`, `website/style.css`). Added a dedicated Android APK card to the primary OS download grid, updated fallback tags to `v2.6.0` (Stable) and `v2.6.0-nightly.42` (Nightly Preview), implemented direct binary APK resolution (`/releases/latest/download/app-release.apk` and `/releases/download/${tag}/app-release.apk`), and enhanced dynamic QR code generation to encode direct APK binary URLs so users can scan the QR code with their phone camera and download the APK directly to their mobile device without requiring a PC connection or manual cable transfer.
- **Shotgun Shell Box Labels & Custom Specification Rows**: Overhauled ammo container and box sticker printing (`AmmoCanLabelModal.tsx` and `AmmoDashboard.tsx`) so that shotgun ammunition dynamically displays dedicated shotgun specifications (**Shell Length**, **Shot Size**, and **Pellet Count / Payload**) instead of cartridge bullet type and projectile grain weight.
- **Intelligent UPC vs SKU Barcode Detection Engine**: Built automated barcode classification helpers (`isUpcBarcode`, `getBarcodeLabelType`, `isShotgunAmmo`) in `src/utils/caliberHelpers.ts` to differentiate standard numeric retail barcodes (8, 12, 13, 14 digits) from alphanumeric manufacturer, store, and custom SKUs (`WIN-AA128`, `FED-AE9MM`, `CCI-500`). Dynamically renders `SKU: [code]` or `UPC: [code]` on adhesive box labels, quick QR print slips, inspect modals, and add/edit forms with real-time detection badges.
- **Strict Custom & Vector Icon Standard (Rule 7)**: Replaced all legacy emoji placeholders across the desktop and mobile companion applications with dedicated custom SVG icons (`HandgunIcon`, `RifleIcon`, `ShotgunIcon`, `PrimerIcon`, `CasingIcon`) and vector icon libraries (`lucide-react`, Ionicons) across all tabs, headers, stat cards, tables, and modal dialogs.
- **Ballistics Calculator & DOPE Card Generator**: Built a full G1/G7 point-mass trajectory solver (`src/utils/ballisticsEngine.ts`) with atmospheric density corrections (temperature & altitude), binary-search zero-angle convergence, and Euler time-step integration. Desktop page (`BallisticsCalculator.tsx`) features persistent ballistic profiles (caliber, BC, MV, zero range, sight height, wind), live trajectory tables with MOA/MIL turret toggles, per-range drop/drift/velocity/energy/TOF columns, color-coded zero range highlighting, and 1-click printable DOPE cards.
- **Storage & Safe Organizer**: New dedicated desktop page (`StorageOrganizer.tsx`) for mapping the physical layout of an armory. Supports Safes, Cabinets, Ammo Cans, Cases, Vehicle storage, and Other locations with capacity tracking. Expandable cards show assigned firearms, accessories, and ammo inventories with 1-click assignment and unassignment modals, type-specific color-coded borders and icons, and location notes.
- **Load Development & Ladder Test Matrix**: New desktop page (`LoadDevelopment.tsx`) for tracking precision handload charge ladders. Records complete recipe metadata (caliber, bullet manufacturer/name/grain/type, powder, primer, brass), then allows incremental charge steps with velocity avg/SD/ES, group size (inches & MOA), OAL seating depth, and pressure sign indicators (None → Flattened Primer → Cratered Primer → Sticky Bolt → Extractor Mark). Automatically identifies the best accuracy node (smallest group, no pressure signs) with a highlighted recommendation banner.
- **NFA Tax Stamp Tracker Dashboard**: Aggregation dashboard (`NfaTracker.tsx`) that pulls all NFA-flagged firearms and accessories into a unified compliance view. Displays total NFA items, pending vs approved stamp counts, per-item wait time calculations (days since Form submission), average approval processing time, serial numbers, NFA classification types (SBR, SBS, Suppressor, AOW), and registration types (Form 1, Form 4). Color-coded status badges and overdue wait-time warnings (>200 days).
- **Mobile Companion Chronograph Screen**: New `range/chronograph.tsx` screen in the Expo companion app for recording muzzle velocity strings at the range. Features per-shot velocity input with live-updating Avg/SD/ES statistics, firearm & ammo selection from cached inventory, environmental conditions (temperature, chrono distance), and direct P2P sync to desktop via `/api/chrono` endpoint.
- **Expanded Mobile Companion API Surface**: Added `/api/chrono` (POST), `/api/target-analysis` (POST), `/api/storage-locations` (GET), and `/api/ballistic-profiles` (GET) endpoints to the local Wi-Fi P2P server for bidirectional mobile-desktop data flow.
- **Database Layer Expansion**: Added encrypted CRUD collections for `storage_locations`, `chrono_strings`, `target_analyses`, `load_ladder_tests`, and `ballistic_profiles` in `database.js` with full IPC handler registration in `main.js` and preload bridge in `preload.js`.
- **Type System Expansion**: Added `MalfunctionEntry`, `ChronoString`, `TargetAnalysis`, `StorageLocation`, `LoadLadderStep`, `LoadLadderTest`, `BallisticProfile`, `BallisticSolution`, and `InsuranceItem` interfaces to `src/types/index.ts`. Extended `SyncItem` with `chrono_string`, `target_analysis`, and `malfunction_report` sync types.

## [2.8.0-nightly.4]

### Preview & Community Bug Testing Release

- **Comprehensive Action Type Architecture & 24 Maintenance Profiles**: Expanded the firearm action type dataset and added dedicated maintenance profiles with heuristic auto-detection across all 24 firearm operating mechanisms:
  - *Semi-Automatic & Auto-Loading*: `semi_pistol` (Short Recoil Handguns, Striker & DA/SA), `semi_rifle` (Direct Impingement AR-15/AR-10), `semi_piston_rifle` (Gas Piston AK-47/74, SCAR, Tavor, Bren 2), `semi_roller_delayed` (Delayed Blowback MP5/SP5, HK91, Banshee), `semi_direct_blowback` (Direct Blowback PCC & Carbine Ruger PCC, Scorpion), `semi_shotgun` (Gas & Inertia Shotguns Beretta A300/A400, Benelli M4/M2).
  - *Bolt Actions*: `bolt_action` (Modern Hunting & Tactical Push/CRF), `straight_pull_bolt` (Straight-Pull Blaser R8, Impulse, K31), `bolt_action_target` (Single Shot Target & Benchrest Rem 40-X, Anschütz), `vintage_bolt_crf` (Vintage Military CRF Mauser K98k, 1903A3, Mosin, Enfield).
  - *Lever & Pump*: `lever_action` (Tubular Magazine Marlin/Winchester/Henry), `vintage_box_lever` (Box Magazine & Rotary Winchester 1895, Savage 99, BLR), `pump_action` (Slide Action Shotguns & Rifles 870/500/7600).
  - *Revolvers*: `revolver` (Double Action / Single Action & DAO S&W 686, Python), `revolver_sa` (Single Action Gate Loading Ruger Blackhawk, Colt SAA), `revolver_top_break` (Top-Break & Tip-Up Webley, Schofield).
  - *Break Action & Single Shot*: `break_action` (Over/Under & Side-by-Side Doubles Citori, 686), `break_action_single` (Break Action Single Shot CVA Scout, Henry, T/C Encore, H&R), `falling_block_single` (Falling & Rising Block Ruger No. 1, 1885 High Wall, Sharps), `rolling_block_trapdoor` (Vintage Rolling Block, Trapdoor & Martini).
  - *Muzzleloaders & Historic Gas*: `muzzleloader_inline` (Modern In-Line 209 Primer CVA Optima, Traditions, Knight), `muzzleloader_traditional` (Traditional Caplock & Flintlock Hawken, Musket), `m1_garand` (M1 Garand & Military Long-Stroke Gas), `m1_carbine` (M1 Carbine & Short-Stroke Gas).
- **Clean Add/Edit Firearm Form Inputs**: Streamlined the `Make` and `Model` fields to clean text inputs without dropdown autocomplete clutter, and updated `Action Type` with the expanded dataset.
- **Gunpowder Multi-Unit Telemetry (Pounds, Ounces, Grains)**: Built a comprehensive ballistic weight calculation engine (`src/utils/powderUnits.ts`) providing simultaneous multi-unit tracking across **Pounds (lbs)**, **Ounces (oz)**, and **Grains (gr)** (1 lb = 16 oz = 7,000 gr; 1 oz = 437.5 gr). Supports entering and storing powder in any of the three units with a live real-time conversion banner and cost-per-grain metric in `ReloadingComponentModal`. Displays total vault powder supply across all 3 units in `ReloadingComponents` and `AmmoDashboard`, gives load yield estimators (`~253 rds of .308 @ 41.5gr`), and provides precision grain-level deduction during batch handload manufacturing in `BatchManufactureModal`.
- **Tactical Accessory Detail Cards & Dossier Modal (`AccessoryDetailModal`)**: Overhauled the display of accessories and optics across the Accessories catalog and Firearm Details page into rich tactical cards with custom color-coded type badges (Optic, Suppressor, Light, Magazine, Holster, Mount, Sling, Other), dedicated technical spec chips (Magnification, Lumens, Rated Calibers, Magazine Capacity, Platform Fits), round telemetry counters, NFA tax stamp indicators, valuation displays, and interactive mounted firearm chips. Clicking any card opens a full-spec `AccessoryDetailModal` with a multi-photo Lightbox gallery, comprehensive logistics breakdown, ATF registration tracker, and direct firearm links.
- **Unified Anchored Dropdown System (`AutocompleteInput`)**: Replaced all native `<datalist>` and browser `<select>` dropdowns across the application (`FirearmForm`, `AmmoDashboard`, `ReloadingComponentModal`, `AccessoryModal`, `RangeSessionModal`, `BatchManufactureModal`, `FirearmDetails`, `Layout` Custom SKU manager, and `Dashboard` filters) with custom anchored glassmorphic dropdowns. Eliminates detached popup floating during container scrolling, adds keyboard navigation (`Up`, `Down`, `Enter`, `Esc`), instant chevron toggling, and real-time substring filtering.
- **Viewport Modal Portal Standard & Centering**: Wrapped all application modals and dialogs (`AccessoryModal`, `AmmoCanLabelModal`, `BatchManufactureModal`, `ChangePasswordModal`, `RecoveryKeyModal`, `RangeSessionModal`, `ReloadingComponentModal`, `Lightbox`, `FirearmDetails` sub-dialogs, `AmmoDashboard` forms, `SyncInbox` prompts) in React `createPortal(..., document.body)` with `position: fixed; inset: 0; z-index: 99999;` and backdrop blur, ensuring dialogs always render centered in the viewport regardless of scroll position.
- **Intelligent Scroll Restoration Engine**: Built `useScrollRestoration` hook tracking continuous route scroll offsets with `sessionStorage` backing and `MutationObserver` synchronization, seamlessly restoring scroll positions when navigating back from detail views as asynchronous database cards render into the DOM.
- **Interactive Mobile Device Pairing Workflow**: Added dedicated QR code pairing modal with real-time Wi-Fi listening badge, instant auto-closing upon companion app scan (`/api/ping`, `/api/inventory/summary`, `/api/inventory/cache`, `/api/pair`, `/api/sync`), and an auto-disappearing emerald success notification toast.
- **Interactive PayPal Custom Donation Amount Deck**: Added selectable preset amount chips ($5, $15, $25, $50, $100) and custom numeric dollar input with dynamic deep-link generation (`paypal.me/ArmoryVault/[amount]USD`) directly in the website support section.
- **Website Performance & Asset Optimization (Phase 1)**: Compressed master branding assets (`icon.png` from 1.84 MB to 114 KB, `mobile-icon.png` from 1.43 MB to 144 KB, plus lean 37 KB / 50 KB WebP formats) yielding a 97.3% payload reduction. Removed render-blocking CSS `@import` fonts in favor of `<link rel="preconnect">` and asynchronous font stylesheets. Added 15-minute `localStorage` release caching (`fetchWithCache`) to eliminate GitHub API 60 req/hr rate limits.
- **Website UI & Interactivity Overhaul (Phase 2)**: Added Smart 1-Click Hero OS Download CTA with automatic system architecture detection (macOS Apple Silicon/Intel, Windows, Linux, Android APK), in-frame Glassmorphic modal simulator for `+ Firearm` and ATF Bound Book print previews (replacing browser alerts), tactile muzzle-flash recoil spark animation with real-time stock decrements on the Range Simulator, and a floating glassmorphic Back-to-Top quick navigation button.
- **Dependency Modernization & Package Pruning**:
  - Removed 180 obsolete packages (~150 MB disk savings) by eliminating legacy `archiver` (superseded by in-memory `adm-zip`), unused `cross-env`, conflicting `@types/jest`, and redundant ESLint/Prettier dependencies completely replaced by high-performance **Biome** (`@biomejs/biome: 2.5.9`).
  - Relocated `@types/qrcode` from runtime dependencies to devDependencies.
  - Upgraded core build tools and utilities: `lucide-react` (1.33.0), `vite` (8.2.2), `@vitejs/plugin-react` (6.1.0), `vitest` (4.1.11), `electron` (43.4.1), `concurrently` (10.0.5), and `@testing-library/user-event` (14.6.5).
  - Maintained 0 vulnerabilities across all dependencies (`npm audit`).
- **Accessibility & Contrast Polish (Phase 3)**: Upgraded muted typography contrast (`--text-muted: #94a3b8`) for WCAG AAA compliance and implemented high-visibility `:focus-visible` outline rings for keyboard accessibility.

## [2.8.0-nightly.3]

### Preview & Community Bug Testing Release

- **Dedicated Build Channels (Stable vs Nightly)**: Separated Electron packaging output into dedicated `dist-electron/stable` and `dist-electron/nightly` directories with standalone build runners (`scripts/build-stable.js`, `scripts/build-nightly.js`), expanded `package.json` channel commands (`package:stable:*`, `package:nightly:*`, `release:stable`, `release:nightly`), and updated interactive `scripts/prepare-release.js` with 1-click nightly prerelease bumping.
- **Website Architecture Migration (`website/`)**: Moved the official ArmoryVault landing portal from `docs/` to its own top-level `website/` directory, supported with an automated GitHub Pages GitHub Actions deployment workflow (`.github/workflows/website.yml`).

## [2.8.0-nightly.2]

### Preview & Community Bug Testing Release

- **Mobile Companion Remote Vault Lock & Sync Hardening**: Added `/api/vault/lock` and `/api/lock` HTTP endpoints and IPC broadcast listener allowing paired mobile companion apps to remotely lock the desktop vault over local Wi-Fi, immediately clearing decryption keys from PC memory and navigating the desktop UI to the secure `VaultLogin` screen.
- **Official Web Portal Enhancements**:
  - Added PayPal donation button (`paypal.me/ArmoryVault`) across top navbar, mobile navigation drawer, support cards, and footer.
  - Added Dual Interactive Showcase Models with toggle switcher for Nightly Command Center (`v2.8.0`), Stable Release (`v2.7.1`), and Mobile Companion (`v2.6.0`).
  - Added direct scannable APK QR code for smartphone camera downloads with dynamic release channel synchronization.
  - Updated mobile companion download spotlight with new high-definition tactical cyber shield branding.

## [2.8.0-nightly.1]

### Preview & Community Bug Testing Release

- **Unified Ammo & Reloading Depot**: Merged separate Ammo and Reloading tabs into a single, cohesive command center in the top navigation bar. Features 3 integrated depot sub-views (`🎯 Live Ammunition`, `🧪 Reloading Supplies`, `📊 Combined Overview`), top caliber quick-stock showcase cards matching the website preview (colored accent borders, live counts, top load types, and stock goal gauges), unified tactical control deck, and full batch manufacture integration.
- **Customizable Metric Cards & Visibility Toggles**: Added a `⚙️ Customize Cards` popover slider allowing users to toggle individual live ammo and reloading metric cards on or off with persistent `localStorage` preferences across both the Dashboard and Depot.
- **Command Center Dashboard with Tactical Card & Table Views**: Complete redesign of the primary inventory dashboard. Includes a persistent Card View 🔲 vs Compact Table View 📋 switcher, unified control deck with 1-click Category Filter Chips (Handguns, Rifles, Shotguns, C&R / Vintage, NFA, ⚠️ Service Due), real-time search, status dropdown, live ammo inventory telemetry, lifetime rounds fired tracker, visual round wear gauges with maintenance progress meters, mounted accessories pill clouds, and a customizable metrics popover with persistent card visibility preferences.
- **ATF A&D Bound Book Overhaul**: Rebuilt the Bound Book page to match the modern tactical theme. Features compliance metrics (Total Records, Active in Safe, Transferred/Sold, ATF Standard), unified search & filter deck, two-tier A&D table with cyber-blue monospace serial number pills, status badges, and 1-click CSV and 8.5x11 landscape printing.
- **Firearm Details Dossier Polish**: Refactored the firearm details view into a clean 2-column dossier grid with constrained photo showcase gallery (`240px` cover with hover zoom and lightbox expansion), inline caliber & safe status badges, and neatly proportioned specification matrices.
- **Centered Modal Positioning & Backdrop Blur**: Converted `AccessoryModal` and `ReloadingComponentModal` to the fixed `.modal-overlay` system with `backdrop-filter: blur(16px)` and dedicated header with `✕` close button, ensuring perfect viewport centering.
- **Glassmorphic Top Navigation & Modern Tactical Styling**: Replaced the desktop sidebar with a full-width sticky Glassmorphic Top Navigation Bar matching the official website preview. Upgraded typography (Outfit + Inter + JetBrains Mono), ambient background radial mesh glows, stat card containers, metric pills, and primary gradient buttons.
- **Pre-Release & Nightly CI/CD Release Pipeline**: Added automated `--prerelease` detection and workflow dispatch triggers to `.github/workflows/release.yml` so nightly/beta test builds are built and distributed across macOS (Apple Silicon + Intel), Windows, and Linux without interfering with stable auto-update channels.
- **Website Preview & Nightly Download Hub**: Updated the official website with a dedicated Release Channel Switcher (`Stable` vs `Nightly / Beta`) with live asset resolution and direct bug reporting links.

## [2.7.1]

### Fixed & Improved

- **Robust Full Zip Archive Backup Engine**: Replaced stream-based archiver with pure in-memory/synchronous `adm-zip` packaging. Resolves production ASAR stream locking and unhandled stream errors when creating full `.zip` archives.
- **Enhanced Backup Feedback & Error Reporting**: Attached main window handle to system save dialogs and added rich error messages with cancel safety when generating full vault `.zip` backup archives.
- **Official GitHub Pages Website & Community Feedback Hub**: Created a responsive, dark glassmorphism landing website in `docs/` ready for GitHub Pages hosting (`https://cook0001.github.io/ArmoryVault/`). Includes interactive UI showcases, range logger simulation demo, dedicated Apple Silicon (`arm64`) vs Intel (`x64`) macOS download buttons with system auto-detection, and a 1-click Feature Suggestion & Bug Reporting portal integrated with GitHub Issues.

## [2.7.0]

### Added

- **Vintage & Military Surplus Firearm Autocomplete Support**: Added comprehensive datalist choices in `Add Firearm` for historic and collectible firearms across USGI arsenals (Springfield Armory, Inland, Rock-Ola, Underwood, Smith-Corona, Eddystone, H&R, Ithaca, Union Switch & Signal), European arsenals (Mauser Oberndorf/DWM, Enfield RSAF, Lithgow, Tula, Izhevsk, Waffenfabrik Bern, Carl Gustafs, Husqvarna, Terni, Steyr, Radom, Zastava), and collectible reproductions (Uberti, Pietta, Pedersoli, Cimarron).
- **Curio & Relic (C&R) Models & Classifications**: Added models and firearm types including `Curio & Relic (C&R) Rifle/Handgun`, `Military Surplus Service Rifle/Handgun`, `Antique / Blackpowder`, with NRA Antique Condition standards (`NRA Excellent 98-100%`, `NRA Fine`, `NRA Very Good`, `NRA Good`, `CMP Service/Collector/Field/Rack Grade`, `All-Matching Numbers`).
- **Comprehensive Historic Caliber Master List**: Added support and auto-categorization for classic military surplus calibers (.30-06 Springfield, .30 Carbine, .30-40 Krag, .303 British, 7.62x54mmR, 7.92x57mm 8mm Mauser, 6.5x55mm Swedish, 7.5x55mm Swiss GP11, 7.65x53mm Argentine, 7x57mm Mauser, 6.5x50mm/7.7x58mm Arisaka, 6.5x52mm Carcano, 8x56mmR Steyr, 8x50mmR Lebel, 7.5x54mm French, 7.62x25mm Tokarev, 9x18mm Makarov, 7.62x38mmR Nagant, 7.63x25mm Mauser, 7.65x21mm Luger, .455 Webley, .45-70 Govt, .405 Win, .30-30 Win).
- **Specialized Vintage Maintenance Profiles**: Added 4 pre-configured maintenance schedules with auto-detection for M1 Garand, M1 Carbine, Vintage Controlled-Round-Feed Bolt Actions (Springfield 1903/1903A3, Mauser 98, Lee-Enfield, Mosin-Nagant, K31), and Box-Magazine Lever Actions (Winchester Model 1895, Savage 99).

## [2.6.1]

### Added

- **Master Vault Password Management & Security Hub**: Users can now change their master encryption password anytime from Settings -> **Vault Security & Encryption**. Features secure envelope re-encryption of the AES-256 master key with PBKDF2 key derivation (100,000 rounds) and live password strength/matching validation.
- **Dedicated Emergency Recovery Key Viewer & Text Backup**: Users can view, verify, copy, or download their permanent 64-character emergency recovery key (`ArmoryVault_Recovery_Key.txt`) at any time from Settings -> **View Vault Recovery Key**.
- **Vault Re-Keying & Recovery Key Regeneration**: Added option to regenerate a brand new 64-character recovery key and re-encrypt the entire inventory database (accessible as a checkbox during password changes or via the standalone **Regenerate Key** tool). Invalides old compromised recovery codes and issues a fresh master key.

## [2.6.0]

### Added

- **Dual Trigger Maintenance Scheduling (Round Count & Elapsed Days)**: Maintenance tasks now support dual wear and time triggers (e.g. 5,000 rounds OR 180 days). Includes a clean checkbox `[ ] Also trigger on elapsed time (Days)` in the schedule creator and dual progress bar countdown alerts on firearm detail cards.
- **Custom Maintenance Schedule Presets & Templates**: Users can now save any firearm's configured maintenance schedule as a reusable custom template with 1-click. Saved templates can be applied (replace or append) to other firearms and managed directly within the Presets picker modal.
- **Printable Gunsmith Service Record & Provenance Dossier**: Added a complete printable PDF/paper dossier for firearms featuring full specifications, lifetime round telemetry, reliability ratings, active wear schedules, chronological service ledger, and mounted equipment. Includes dedicated `@media print` layout.
- **Mounted Accessory Round Telemetry**: Logging range sessions now automatically propagates and increments round counts across all mounted optics, suppressors, lights, and barrels. Displayed via dedicated round badges on accessory cards and tracked within the modal.
- **Comprehensive & Proprietary Bullet Type Support**: Added full database, autocomplete datalist, and barcode intelligence support for 70+ standard, match, defensive, and proprietary bullet types across Hornady (ELD-X, ELD Match, V-Max, FTX, XTP, SST, Sub-X, CX), Federal (HST, Hydra-Shok, Syntech, Punch, Terminal Ascent, Trophy Bonded), Sierra (MatchKing, GameKing, BlitzKing, TGK), Speer (Gold Dot, Lawman, TNT), Barnes (TTSX, TSX, LRX, TAC-TX), Nosler (AccuBond, Partition, Ballistic Tip, E-Tip, RDF), Winchester (Silvertip, Ranger T, Defender, Power-Point, Deer Season XP), Remington (Core-Lokt, Golden Saber, AccuTip), Berger (VLD, Hybrid OTM), Lapua/Norma (Scenar, Oryx, Tipstrike, Naturalis), and Lehigh/Underwood (Xtreme Penetrator, Xtreme Defender, HoneyBadger).

### Improved & Fixed

- **Bulk Pack Quantity & Barcode Parsing (e.g. 1,400 Rd Bucket)**: Fixed an issue in `BarcodeEngine.ts` where comma-separated quantities (such as Remington Golden Bullet `1,400 Rounds` / `1,400 RD` bucket UPC `047700415208`) were truncated to `400` due to integer regex stopping on commas. Added support for comma-formatted counts (`1,000`, `1,400`, `5,000`), improved `.22 LR` caliber detection, and added support for `PHP` / `CPHP` bullet types.

## [2.5.0]

### Added

- **Range Trip Quick-Logger & Atomic Session Handler**: New quick logger modal accessible from sidebar Tools and Firearm Details. Atomically increments firearm round counts and decrements caliber-matched ammo stock in a single transaction with full cost and location logging.
- **Offline Mobile Sync Support & Inventory Caching**: Added `/api/inventory/cache` endpoint allowing companion mobile apps to pull and cache firearms, ammo, components, and custom SKUs for offline usage at the range.
- **Sync Inbox Range Session Review**: Companion app range session submissions now appear in `SyncInbox` with full firearm, ammo deduction, and round count details for user review with **Approve**, **Modify**, and **Decline** actions.
- **Proactive Multi-Task Maintenance Scheduling with Action-Type Profiles**: Added multi-schedule tracker to `FirearmDetails.tsx` with intelligent profile auto-detection. Standard schedules now dynamically adapt to firearm action types (e.g. Pump Action shotguns track action bars, magazine tubes, and extractors without nonexistent recoil springs; Revolvers track cylinder gap, timing, and crane assemblies; Semi-Auto rifles track BCG, gas rings, and buffer springs). Includes a preset picker modal with 8 tailored profiles and live preview.
- **Task Completion & Part Replacement Modal**: Clicking "Complete Task" allows recording custom aftermarket replacement parts (e.g., Apex Tactical Heavy Duty Extractor vs OEM), part manufacturer, cost ($), date, and notes into the firearm's permanent maintenance ledger.
- **Ammo Box & Can QR Printable Sticker Labels**: Added `AmmoCanLabelModal` supporting selectable formats ("Compact 20/50-rd Box Label" vs "Large 30/50-Cal Ammo Can Label"). Includes complete load recipes for handloads (powder, charge weight, primer, brass, OAL) and high-density `AV-AMMO-<id>` QR codes for instant mobile scanning and stock adjustments.
- **Custom SKU & Barcode Support for Parts & Accessories**: Upgraded the Custom SKU Manager into a unified dictionary supporting Ammunition, Parts & Accessories (e.g. Apex extractors, Holosun optics, Magpul mags), and Reloading Supplies. `AccessoryModal` automatically checks the local SKU dictionary during barcode/part# lookups for instant offline auto-fill, displays SKU badges on accessory cards, and allows 1-click saving of newly added parts into the Custom SKU Dictionary.
- **Low-Stock & Restock Alerts with Filter Toggles**: Added configurable `min_threshold` alerts to both Ammunition and Reloading Components dashboards. Added quick-filter `[ ⚠️ Low Stock (X) ]` buttons to instantly isolate depleted inventory.
- **Optional Collection Value Analytics**: Added an investment and collection value breakdown card (Firearms, Accessories, Ammunition, Reloading Supplies) on the main dashboard, controlled via a toggle switch in Settings.

### Improved

- **Universal Scan Routing**: Enhanced `SyncInbox` universal barcode resolution to auto-route scanned custom accessory and reloading component SKUs with pre-filled metadata directly into their respective modals.
- **Barcode & Label Integration**: Integrated `AV-AMMO-<id>` QR parsing into `SyncInbox` universal scan resolver for automated ammo adjustments.
- **TypeScript Strictness & Validation**: Added strict interface types for `CustomSkuItem`, `MaintenanceScheduleItem`, `range_session`, and IPC API handlers.

## [2.4.0]

### Added

- **Database In-Memory Cache**: The encrypted vault is now decrypted once on unlock and held in memory. Writes are debounced (2-second delay) and batched, eliminating redundant decrypt/encrypt cycles on every CRUD operation. This dramatically improves performance for users with large inventories.
- **Caliber Helpers Module**: Extracted `getStandardPelletCount`, `generateInternalUPC`, `formatCaliber`, `getAmmoCategory`, and `escapeRegExp` from `AmmoDashboard.tsx` into a shared `src/utils/caliberHelpers.ts` module. Reduces the mega-component by ~100 lines and eliminates code duplication with `BarcodeEngine.ts`.
- **React Error Boundary**: App-wide crash handler prevents blank white screens. If a component throws an error, users see a "Something went wrong" fallback with "Try Again" and "Return to Dashboard" recovery actions.
- **Vitest Global Configuration**: Added `test` config to `vite.config.ts` with jsdom environment and setup file, fixing all test infrastructure issues.
- **Vault Auto-Lock Timer**: The vault automatically locks after 15 minutes of inactivity (no mouse, keyboard, or touch input). Resets on any user interaction.
- **Manual Lock Button**: New "Lock Vault" button in the sidebar lets you instantly re-lock the vault and return to the login screen.
- **Date-Stamped Backup Rotation**: Backups now use the format `ArmoryVault_Backup_YYYY-MM-DD.enc`, keeping the 5 most recent backups automatically. Older backups are cleaned up.
- **Dashboard Column Sorting**: Click any column header (Make, Model, Caliber, Serial Number, Status) to sort ascending/descending. Active sort direction shown with arrow icons.
- **Ammo Caliber Grouping**: Within each ammo category (Pistol, Rifle, Shotgun, Other), rounds are now automatically sorted by caliber so same-caliber ammo cards appear next to each other.
- **Database Backup Restoration**: Added a complete backup restoration workflow in Settings supporting both encrypted `.enc` vault files and `.zip` full archives (extracting database, photos, and PDF documents). Includes automatic pre-restore safety backups.

### Improved

- **`SyncItem` Type Safety**: Replaced the catch-all `[key: string]: any` index signature with explicit typed fields (`measurement`, `firearm_id`, `photo_data`, `log_type`) and a string union for `type`.
- **`mockBackend.ts` Types**: Replaced `any[]` return types with proper `Accessory[]` and `ReloadingComponent[]` types from the type system.
- **Accessory Quantity Type**: Replaced `'' as any` type escape hatch with `undefined` for the optional numeric `quantity` field.
- **Deprecated Field Cleanup**: Removed legacy `mountedOnFirearmId` from the `Accessory` interface and updated `FirearmDetails.tsx` to use the `mounts` array pattern directly.
- **Sidebar & Navigation Layout**: Grouped sidebar into labeled sections (Inventory, Manage, Tools) with compact spacing to eliminate scrollbars and optimize viewport fit.
- **Centralized Data Export**: Consolidated the Firearms CSV Export button into Settings alongside the Insurance Report PDF and Full Zip Archive for a cleaner dashboard header.

### Fixed

- **Custom SKU Database Overwrite**: Fixed a critical bug in `SyncInbox` where approving an incoming barcode sync scan wrote to `saveSkus` without first loading existing SKUs into local state, unintentionally wiping prior custom SKU mappings. In addition, `database.js`'s `saveSkus` now safely merges incoming SKU records with existing database records instead of replacing the entire map.
- **CSV Export Corruption**: Fixed a bug where firearm models containing double-quote characters (e.g., `Ruger 10/22 "Takedown"`) would produce malformed CSV output. Fields are now escaped per RFC 4180.
- **`.gitignore` Gaps**: Added missing entries for `.env`, `.env.*`, `*.enc` (encrypted vault data), and `*.bak` (legacy plaintext backups) to prevent accidental commits of sensitive data.
- **Test Failures**: Fixed 4 pre-existing test failures in `Dashboard.test.tsx` and `FirearmForm.test.tsx` (missing jsdom environment, incomplete mock API, duplicate button queries).

## [2.3.2]

### Fixed

- **UI Bug**: Fixed a CSS issue where Modals (like Accessory and Reloading Component popups) would render off-screen when the user scrolled down. Modals are now properly centered in the viewport with correct `overflow-y` handling.

## [2.3.1]

### Added

- **macOS OTA Fallback**: macOS users will now receive "Update Ready" notifications with a direct link to manually download updates, bypassing the unsigned Squirrel.Mac errors.
- **Universal Sync Inbox**: New central hub to intercept all uncategorized barcode scans from the mobile app.
- **Smart Component Deduplication**: Resolving uncategorized scans now checks for manually added duplicates and prompts to merge them.
- **Dynamic Box Sizing**: Desktop sync inbox now supports live UPC lookups and local Custom SKU fallback to calculate exactly how many rounds/items are in a scanned box.
- **Unknown Box Size Modal**: Clean UI intercept for user to define a box quantity for unknown barcodes, permanently saving it to the Custom SKU dictionary.
- **Regex Sanitization**: Advanced string cleanup when parsing UPC data from upcitemdb to remove junk keywords and manufacturer redundancies.

### Changed

- Refined Barcode Engine weighting so reloading powder and primers are no longer miscategorized as ammunition.
- Re-architected API lookup flow to run through the Electron main process, eliminating CORS constraints from the renderer.
- Market pricing logic shifted from "lowest recorded history" to "median current active offers" to ignore historical pricing glitches.
- Components quantities now default to correct bulk amounts (e.g. 1000 for Primers) instead of 1.

### Fixed

- Fixed CodeQL XSS vulnerability when decoding HTML entities in BarcodeEngine.
- Fixed reloading powder parsing for Hodgdon / distributor barcodes.
- Fixed TS compilation errors on release workflow.
- Fixed CORS fetch errors when hitting upcitemdb.
- Fixed UI text scaling for "ADD x rds/lbs/brick" based on dynamic mobile payload parameters.
- Addressed inventory inflation bug where a scanned box of 50 would only add 1 round to the inventory.
