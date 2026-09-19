# ArmoryVault AI Agent Rules

## 1. Package-Centric Versioning & Release Requirements
- **Lock Versions During Active Development**: During active feature development and iterative refactoring, NEVER bump the version in `package.json`. The version remains locked in development while features and fixes are added. Document all changes in `CHANGELOG.md` under an `[Unreleased]` or in-progress package header.
- **Atomic Final Release Bumping**: Before preparing any push to GitHub or generating an official release, ALWAYS determine the correct version bump by following the rules in `VersionControl` (Major.Minor.Patch) once the entire update package is finalized. Update the version string in `package.json` to reflect this change.
- **Changelog Maintenance**: Every significant change MUST be documented in `CHANGELOG.md` under the appropriate version header. Keep a clear record of features, bug fixes, and improvements.
- **Documentation Updates**: Ensure `README.md` is kept up-to-date if any new scripts, architectural patterns, features, or setup steps are introduced.
- **Gitignore Hygiene**: If new environment files, build artifacts, keystores, or temporary folders are added to the project, ensure they are properly excluded in `.gitignore`.

## 2. Build and Deployment Context
- **Framework**: This is an Electron + React + Vite + TypeScript application (`dist-electron` and `dist` outputs). 
- **Build Troubleshooting**: We have a history of build and GitHub Actions issues (`release.yml`). When troubleshooting build errors or modifying dependencies, *always* verify compatibility with `electron-builder` and Vite plugins before proceeding. Do not assume mobile (Android/APK) environments apply directly unless running a specific web-wrapper setup.
- **GitHub Actions**: Do not modify `.github/workflows` (like Dependabot or release scripts) without first planning the steps and ensuring secrets/permissions align with standard electron-builder GitHub publishing configurations.

## 3. Barcode Parsing and QR Generation (Desktop Scope)
- **No Camera Scanning on Desktop**: Desktop applications (Electron and Tauri) do not perform live camera barcode/QR scanning; physical camera scanning is handled exclusively by the mobile companion app.
- **Library Standard**: Desktop applications rely on `react-qr-code` and `qrcode` strictly for *generating* QR codes (storage location labels, companion pairing). No camera scanning libraries (`html5-qrcode`) should be added to the desktop repositories.
- **Data Parsing Protocol**: When adjusting how barcodes or UPC strings are interpreted, all core heuristic logic MUST go through `src/utils/BarcodeEngine.ts` (`parseBarcodeData`). Do not implement one-off regex or parsing logic directly inside React components (e.g., `FirearmDetails.tsx` or `AccessoryModal.tsx`).
- **Testing Parsing Changes**: Barcode parsing logic is highly complex (inferring ammo, components, and accessories). Any modification to `BarcodeEngine.ts` requires extreme care to avoid breaking existing heuristic scores for `scoreAmmo`, `scoreComponent`, and `scoreAccessory`.

## 4. UI and State Management
- **Styling**: Adhere to the established styling (likely Tailwind or Vanilla CSS depending on the exact setup) and use `lucide-react` for any new icons. Ensure dark/light modes and modern aesthetic standards are maintained.
- **Modal Positioning**: Ensure all modals (e.g., `AccessoryModal.tsx`) are consistently centered in the viewport and properly visible regardless of the user's scroll position. Use `fixed` positioning with a backdrop overlay, and proper centering mechanics (e.g., Flexbox or Grid) to prevent modals from rendering off-screen or out of view.
- **App Sync & Offline State**: We have encountered "App Sync Issues" historically. When creating or modifying inventory components, ensure any state mutations correctly queue or push data to the persistence layer. Account for potential network latency or offline modes.
- **Component Reloading**: When working with inventory tracking updates (like reloading components or ammunition counts), verify that the React state refreshes dynamically without requiring a full desktop window refresh.

## 5. General Best Practices
- **TypeScript Strictness**: Maintain strict typings. Use the defined interfaces in `src/types` (e.g., `Ammo`, `ReloadingComponent`, `Accessory`) instead of falling back to `any`.

## 6. Upgrade Suggestions & Implementation Plans
- **Mandatory Implementation Plans for Upgrades**: Anytime the AI agent recommends or suggests upgrades, optimizations, performance improvements, UI enhancements, or architectural modifications, it MUST automatically generate an `implementation_plan.md` artifact detailing the proposed scope, technical breakdown, and verification strategy so the user can review, annotate, and approve the plan before any execution begins.

## 7. Icon System & Emoji Ban (Strict)
- **Zero Emoji Placeholders**: NEVER use raw emojis (e.g., 🎯, 🛡️, 🤝, 🎖️, ⏳, 🔇, 🔭, 📐, 📍, ℹ️, ✔, ⚠️, 📦, 🏷️, 🔑, etc.) as icon placeholders in UI navigation, filter chips, headers, badges, stat cards, tables, or buttons across both Desktop and Mobile applications.
- **Custom & Vector Icons Only**: Always use dedicated custom SVG icon components (e.g., from `src/components/CustomIcons.tsx` or `app/components/CustomIcons.tsx`) or standard vector icon libraries (`lucide-react` on Desktop, `@expo/vector-icons` / Ionicons on Mobile). Maintain consistent theme colors, stroke weights, and sizing across all views.

## 8. Android Native VersionCode Monotonic Increase (Strict)
- **Strict VersionCode Increment**: In `android/app/build.gradle` and `app.json`, `versionCode` MUST strictly increment with every build and NEVER be decremented, reset, or set below the established production baseline (currently `>= 309`). Setting a `versionCode` lower than or equal to an installed build causes Android PackageInstaller and the in-app OTA updater to immediately reject APK installations with `INSTALL_FAILED_VERSION_DOWNGRADE` ("App not installed / Update not installed").
- **Unified Release Stream**: All builds belong to a single, unified release stream with strictly monotonic version numbers and version codes. Nightly channels and offset rules have been permanently deprecated.

## 9. Modular File Architecture & Monolith Prevention (Strict)
- **Hard Anti-Monolith Standard**: Avoid creating or leaving monolithic files exceeding 500–800 lines of code. When files grow, aggressively separate responsibilities into focused sub-modules.
- **Modal & Dialog Extraction**: NEVER embed complex modal dialogs, forms, or `createPortal` trees directly inside parent page components. All modals must reside in dedicated files under `src/components/modals/` or domain subfolders (e.g. `src/components/firearm-details/modals/`).
- **Sectional Deck Partitioning**: Break complex pages into domain sections and card decks (e.g., Specs, Photo Gallery, Mounted Accessories, History).
- **Backend Service & IPC Isolation**: In `electron/`, never stuff dozens of IPC handlers or Express routes directly into `main.js`. Separate database IPC, system IPC, and LAN sync routes into dedicated modules under `electron/ipc/` and `electron/server/`.

## 10. CSS Vendor Prefixing & Cross-Browser Styling Protocol (Strict)
- **Mandatory `-webkit-` Preceding Declaration**: Any CSS property requiring WebKit/Safari engine support—specifically `backdrop-filter`, `user-select`, `mask-image`, and `background-clip: text`—MUST ALWAYS include its `-webkit-` vendor prefix declared immediately BEFORE the standard unprefixed property:
  ```css
  /* Correct */
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);

  -webkit-user-select: none;
  user-select: none;

  -webkit-background-clip: text;
  background-clip: text;
  ```
- **Strict Prefix Ordering**: NEVER declare the standard CSS property before the vendor-prefixed property. Vendor prefixes must always precede standard properties to adhere to standard CSS cascade rules and pass style linter diagnostics.
- **Scrollbar Suppression Standard**: When suppressing scrollbars, always implement the standard three-part cross-browser pattern:
  ```css
  /* Cross-browser scrollbar hiding */
  -ms-overflow-style: none;
  scrollbar-width: none;
  ```
  paired with the WebKit pseudo-element:
  ```css
  .element::-webkit-scrollbar {
    display: none;
  }
  ```
- **Linter & Environment Directives**: When using desktop-specific directives (such as `-webkit-app-region: drag` or `no-drag`), ensure project lint configurations (`.hintrc`, `.vscode/settings.json`, Biome configs) properly ignore or declare these properties to prevent false-positive linter diagnostics.

## 11. Zero Inline Styles & CSS Hygiene (Strict)
- **Zero Raw Inline Styles in HTML**: NEVER use raw inline `style="..."` attributes in HTML files, web landing pages, documentation portals, or module templates (`website/index.html`, `armstrader.store`, etc.). All layout, color, typography, and spacing styles MUST reside in external stylesheets or reusable CSS utility classes.
- **No `!important` Overuse**: Avoid `!important` flags in CSS stylesheets to preserve cascade predictability and comply with Biome's `noImportantStyles` linter rules. Rely on structural hierarchy and class specificity.

