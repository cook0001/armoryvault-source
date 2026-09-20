# ArmoryVault (Tauri v2 Native Production Suite)

[![Build All Native Installers](https://github.com/cook0001/armoryvault-source/actions/workflows/build-all.yml/badge.svg?branch=main)](https://github.com/cook0001/armoryvault-source/actions/workflows/build-all.yml)
[![Quality Control](https://github.com/cook0001/armoryvault-source/actions/workflows/qc.yml/badge.svg?branch=main)](https://github.com/cook0001/armoryvault-source/actions/workflows/qc.yml)
[![Tauri Version](https://img.shields.io/badge/Tauri-v2.0-blue.svg?style=flat-square&logo=tauri)](https://tauri.app)
[![Rust Core](https://img.shields.io/badge/Rust-2021%20Edition-orange.svg?style=flat-square&logo=rust)](https://www.rust-lang.org)
[![Database](https://img.shields.io/badge/SQLite-In--Memory%20ACID-003B57.svg?style=flat-square&logo=sqlite)](https://sqlite.org)
[![Security](https://img.shields.io/badge/Security-AES--256--GCM%20Zero--at--Rest-success.svg?style=flat-square)](SECURITY.md)
[![Frontend](https://img.shields.io/badge/React-19%20%2B%20TypeScript-61DAFB.svg?style=flat-square&logo=react)](https://react.dev)
[![License](https://img.shields.io/badge/License-Proprietary%20Freeware-blue.svg?style=flat-square)](LICENSE)

> **Official ArmoryVault Stable Production Release (`v3.0.0`).**  
> Powered by the lightweight, native **Tauri v2 + Rust architecture**, delivering a **~95% smaller installer** and **~75% reduced memory footprint** while preserving 100% two-way data compatibility with existing user vaults and backups.  
> *Notice: The legacy Electron platform has been officially retired at **`v3.0.0-Electron`**, which remains preserved in repository history as the final Electron build.*

---

## Performance & Architectural Benchmarks

| Metric | ArmoryVault (Electron Final) | ArmoryVault (Tauri v2 Stable) | Impact |
| :--- | :--- | :--- | :--- |
| **macOS DMG Installer** | ~180.0 MB | **8.7 MB** | **95.2% smaller download** |
| **Installed App Footprint** | ~420.0 MB | **11.0 MB** | **97.4% less disk space** |
| **Active Memory (RAM)** | ~250–320 MB | **~71 MB** | **~75% RAM reduction** |
| **At-Rest Security** | Encrypted JSON (`.enc`) | **True Zero-at-Rest AES-256-GCM** | **Zero plaintext on disk** |
| **Working Database Engine** | Monolithic JSON full-disk rewrites | **In-Memory SQLite (`rusqlite`) ACID** | **Microsecond queries, zero disk thrashing** |
| **LAN Sync Server** | Node.js Express runtime | **Native Async Axum + Tokio (:3456 & :5174)** | **Zero idle CPU, microsecond sync** |
| **Media & Thumbnails** | Node C++ `sharp` binaries | **Pure-Rust `image` crate** | **Zero C++ build errors, native speed** |
| **Multi-Format Ingestion** | CSV only | **Universal SQLite, JSON, CSV & Competitors** | **One-click migration from any app** |

---

## Key Architectural Enhancements

### 1. Option A True Zero-at-Rest Architecture & In-Memory Working State

- **At-Rest Security**: On disk, vault data is **100% AES-256-GCM encrypted** (derived via PBKDF2-HMAC-SHA256 with 100,000 iterations). Plaintext databases never persist to disk; any legacy `.sqlite` files are securely purged upon setup or unlock.
- **In-Memory SQLite Engine**: While unlocked, high-speed indexed tables operate in-memory via `sqlite::Connection::open_in_memory()`, delivering sub-millisecond query performance with an active dataset memory footprint under 1 MB.
- **Decoupled Stores Architecture**: To prevent primary vault bloat, data is separated into dedicated encrypted files:
  - `firearms_inventory.enc`: Core weapons, ammunition, accessories, and storage locations.
  - `activity_log.enc`: Historical audit and range session telemetry.
  - `skus_database.enc`: Custom user barcode library.
- **Immediate Zeroization**: Locking the vault or exiting the application drops the in-memory database and zeroizes master keys immediately.

### 2. Universal Multi-Format Database & Competitor Ingestion Engine

The Tauri build features an intelligent schema-adaptive ingestion engine supporting all past, present, and external firearm management systems:

- **Direct Vault Restores**: Encrypted vaults (`.enc`, `.bak`) and full archives (`.zip`).
- **SQLite Databases**: Auto-detects table schemas and column layouts (`.sqlite`, `.db`, `.sqlite3`), supporting both JSON-column tables and discrete columnar databases.
- **Spreadsheets & CSV/TSV**: RFC 4180 compliant parser supporting dynamic delimiters (`,`, `\t`, `;`, `|`), multiline fields, and quotes.
- **Competitor Software Migration**: Pre-mapped ingestion for **MyGunDB**, **GunSafe**, **FastBound**, **ATF Bound Book**, **GunLog**, and **Gun Tracker**.
- **LoadBench & Reloading Recipes**: Native ingestion of `.load`, `.loadbench`, `.ldb`, and `.avr` recipe files with full ballistic and telemetry metadata extraction.
- **Staged Auto-Migration**: Databases imported prior to vault unlock are staged safely on disk and automatically absorbed, encrypted, and purged upon subsequent unlock.

### 3. Automated Date-Stamped Backup Rotation

- Debounced automatic backup triggers whenever inventory changes are saved.
- When an external or cloud sync backup directory is configured, copies active encrypted stores into date-stamped archives (`ArmoryVault_Backup_YYYY-MM-DD.enc`, `ArmoryVault_Skus_Backup_YYYY-MM-DD.enc`, `ArmoryVault_ActivityLog_Backup_YYYY-MM-DD.enc`).
- Automatically rotates the backup folder, maintaining the **5 most recent backups** and pruning obsolete historical files.

### 4. High-Throughput Async Dual-Port LAN Sync Server (`:3456` & `:5174`)

- Asynchronous HTTP server powered by **`axum`** and **`tokio`** running primarily on ecosystem standard port `3456`, with fallback dual-listening on port `5174`.
- Complete 1-to-1 parity with the **ArmoryVault Mobile Companion App**:
  - Offline cache generation (`/api/inventory/cache`)
  - Real-time mobile pairing handshake and token validation (`/api/pair`)
  - Bidirectional companion endpoints (`/api/storage-locations`, `/api/chrono`, `/api/target-analysis`, `/api/ballistic-profiles`)
  - Live UI event streaming (`sync-received`, `device-paired`, `vault-locked`)
  - Remote vault lock command (`/api/vault/lock`)

### 5. Native Media, Typst Reports & System Shortcuts

- **WebKit Protocol Streaming**: Custom `local-file://localhost/...` streaming for encrypted attachments and photos with on-the-fly thumbnail generation via pure Rust.
- **Native macOS Menu Shortcuts**: Full system menu registered in the app lifecycle, restoring `Cmd+C`, `Cmd+V`, `Cmd+X`, `Cmd+A`, `Cmd+Z`, and `Cmd+Q` in all text inputs.
- **Cross-Platform Typst Resolution**: Auto-locates Typst binaries across Windows `%LOCALAPPDATA%`, macOS Homebrew (`/opt/homebrew/bin/typst`), and system PATH for high-resolution PDF insurance report compiling.

---

## Quality Control, Audits & Verification

### Running Automated Test Suites

```bash
# 1. Rust backend unit tests (14 test suites, < 0.05s)
cargo test --manifest-path src-tauri/Cargo.toml

# 2. Rust Clippy zero-warnings linter check (enforced in CI)
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

# 3. Frontend TypeScript typechecking
npm run typecheck

# 4. Frontend Vitest suite (36 test files, 234 passing unit tests)
npm test

# 5. Production bundle build verification
npm run build
```

### Safari WebInspector Audit Suite Support

Tauri leverages native WebKit (`WKWebView`) on macOS. You can run automated DOM, accessibility, and resource audits directly against the running application using Safari Web Inspector:

1. Launch development mode: `npm run tauri:dev`
2. Open Safari -> **Develop** -> **[Computer Name]** -> **ArmoryVault** (`tauri://localhost`).
3. Switch to the **Audits** tab.
4. Click **Import Audit** and select your audit file (e.g. [`Audits/Demo Audit.audit`](file:///Users/danielc/Documents/Audits/Demo%20Audit.audit)).
5. Click **Run Audit** to inspect computed accessibility roles, active descendants, event listeners, and DOM node hierarchies.

---

## Native Installers & CI Workflow

All installers are built automatically on every push to `beta` via [GitHub Actions](.github/workflows/build-all.yml):

- **macOS**: Universal Apple Silicon (`aarch64`) and Intel (`x86_64`) `.dmg` and `.app` bundles
- **Windows**: 64-bit NSIS `.exe` installer and `.msi` package
- **Linux**: Universal `.AppImage` and Debian `.deb` packages

Download the latest automated builds directly from the **Actions** tab or **Releases**.

---

## Local Development Setup

### Prerequisites

1. **Node.js**: v20 or v22 LTS ([nodejs.org](https://nodejs.org))
2. **Rust**: Latest stable toolchain ([rustup.rs](https://rustup.rs))
3. **Platform Dependencies**:
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
   - **Windows**: Visual Studio C++ Build Tools & WebView2
   - **Linux (Ubuntu/Debian)**:

     ```bash
     sudo apt-get update && sudo apt-get install -y \
       libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev
     ```

### Getting Started
 
1. **Clone the repository and switch to the beta branch:**
 
    ```bash
    git clone -b beta https://github.com/cook0001/armoryvault-source.git
    cd armoryvault-source
    ```
 
2. **Install frontend dependencies:**
 
    ```bash
    npm install
    ```
 
3. **Run in development mode (with hot reloading):**
 
    ```bash
    npm run tauri:dev
    ```
 
4. **Build the production bundle locally:**
 
    ```bash
    npm run tauri:build
    ```
 
    Compiled binaries and installers will be generated under `src-tauri/target/release/bundle/`.
 
---

## Precision Firearms Ecosystem

ArmoryVault is engineered as the central inventory and ATF compliance core of the firearms management ecosystem:

- **[ArmsTrader (armstrader.store)](https://armstrader.store)** — Free web tools and digital utilities suite for firearm owners (Firearm Bill of Sale Generator, Nationwide FFL Finder, Shooting Range Locator, and 50-State Gun Laws Directory). *Note: ArmsTrader is NOT a marketplace, broker, or dealer.*
- **[ArmoryVault Companion](https://github.com/cook0001/armoryvault-companion)** — Offline mobile firearm barcode scanner and encrypted LAN sync for Android.
- **[Wildcat Studio](https://github.com/cook0001/wildcat-studio)** — High-performance cartridge CAD, chamber reamer modeling & internal cutaway telemetry suite.
- **[LoadBench Studio](https://github.com/cook0001/loadbench)** — Industrial interior ballistics simulation, propellant combustion & chamber pressure modeling suite.
- **[RangeStudio](https://github.com/cook0001/rangestudio)** — Precision exterior ballistics, 4th-order Runge-Kutta trajectory engine & optical reticle simulator.

---

## Security & Privacy Notice
 
ArmoryVault is **100% private, local, and air-gapped**:
 
- **Zero Cloud Accounts**: No third-party accounts or logins.
- **Zero Telemetry**: No tracking, analytics, or analytics beacons.
- **Local LAN Only**: Companion synchronization operates strictly on your local Wi-Fi subnet.
 
---
 
## License
 
ArmoryVault is proprietary software provided free of charge for personal, non-commercial use under the [ArmoryVault End User License Agreement](LICENSE). All Rights Reserved. Reverse engineering, decompilation, unauthorized redistribution, or commercial use without prior written authorization is prohibited.
 
---
 
*Copyright © 2026 ArmoryVault. All rights reserved.*

