# Contributing to ArmoryVault

Thank you for your interest in contributing to **ArmoryVault**! As a free-to-use, zero-cloud firearm and ammunition inventory application, we welcome bug fixes, UI improvements, and approved feature contributions.

---

## Architectural Principles

Before contributing code, please keep our core tenets in mind:

1. **100% Zero-Cloud Architecture**: Firearm serial numbers, bills of sale, inventory counts, and photos must NEVER be uploaded to remote cloud databases or third-party servers. All data remains encrypted on the user's local hardware.
2. **Backwards Compatibility**: Any changes to the JSON sync schema or local API routes (`/api/*`) must maintain backwards compatibility with the **ArmoryVault Companion** mobile app.
3. **Rule #7 Strict Emoji Ban**: Never use raw emojis as UI icon placeholders. Always use dedicated vector icons from `lucide-react` or custom SVGs.

---

## Development Setup

1. **Clone the repository**:

   ```bash
   git clone git@github.com:cook0001/ArmoryVault.git
   cd ArmoryVault
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start the local development server**:

   ```bash
   npm run tauri:dev
   ```

---

## Testing & Quality Gates

Before submitting a Pull Request, all automated checks must pass:

- **Lint & Format**:

  ```bash
  npm run check
  ```

- **Automated Tests**:

  ```bash
  npm test
  ```

- **Pre-Flight Release Validation**:

  ```bash
  npm run verify:preflight
  ```

---

## Submitting Pull Requests

1. Create a feature branch from `main`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Commit your changes with conventional commit messages (e.g. `feat(inventory): add custom caliber field`, `fix(sync): resolve token expiration`).
3. Document any notable changes in [`CHANGELOG.md`](CHANGELOG.md).
4. Push your branch and open a Pull Request against `main`. Fill out the Pull Request checklist completely.
