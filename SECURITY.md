# Security Policy

## Supported Versions

ArmoryVault Desktop (Tauri v2 Native) is actively maintained. Security updates, cryptographic patches, and critical hotfixes are provided for the following release tracks:

| Version Track | Supported | Notes |
| :--- | :--- | :--- |
| **v2.x (Beta / Main)** | :white_check_mark: Yes | Active Tauri v2 desktop development |
| **< v2.0.0** | :x: No | Deprecated legacy releases |

---

## Reporting a Vulnerability

We take the cryptographic integrity, privacy, and safety of firearm inventory data with utmost seriousness. If you discover a security vulnerability, encryption flaw, memory safety issue, or local LAN sync vulnerability, please report it immediately.

### How to Report

1. **GitHub Private Vulnerability Reporting (Preferred)**:
   - Navigate to the **Security** tab of the repository (`cook0001/ArmoryVault`).
   - Click **Report a vulnerability** to create a private security advisory.
   - This ensures details remain confidential while a fix is developed and tested.

2. **Responsible Disclosure Protocol**:
   - **Do NOT** open a public issue, discussion thread, or PR containing sensitive vulnerability information.
   - Never include real serial numbers, names, addresses, or private cryptographic keys in reports or logs.
   - Provide a clear description including affected platforms (macOS, Windows, Linux) and minimal reproduction steps.

### Response & Remediation Timelines

- **Initial Acknowledgment**: Within **48 hours** of report receipt.
- **Triage & Assessment**: Within **5 business days**.
- **Patch Deployment**: Hotfix releases will be compiled and released across macOS, Windows, and Linux via automated GitHub Actions release workflows.

---

## Scope & Security Architecture

ArmoryVault operates under a **Strict Zero-Cloud Architecture**:

- **Local Storage & Database**: All firearm records, maintenance logs, NFA tax stamps, and photos reside exclusively in an embedded SQLite database (`rusqlite`) on the user's local filesystem. No data is ever sent to cloud servers, remote databases, or telemetry aggregators.
- **Local LAN Sync**: Peer-to-peer sync with ArmoryVault Mobile Companion operates strictly within the user's local Wi-Fi subnet using a native Axum HTTP daemon bound to the host interface. Sessions are protected via cryptographic one-time pairing handshakes.
- **Zero Remote Telemetry**: ArmoryVault includes zero tracking pixels, analytics beacons, or remote logging services.
- **Memory Safety**: The native backend is built with Rust with bounds checks and strict compiler linter policies.

---

*Copyright © 2026 Daniel C. (cook0001). All rights reserved.*
