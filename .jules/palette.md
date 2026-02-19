## 2024-05-22 - Icon-Only Buttons Accessibility Pattern
**Learning:** The codebase heavily utilizes icon-only buttons (e.g., using `material-icons`) which consistently lack `aria-label` or `title` attributes, making them inaccessible to screen reader users and confusing for mouse users (no tooltip).
**Action:** Always enforce `aria-label` and `title` props on icon-only button components like `AddButton`, and audit `components.tsx` for similar patterns (e.g., `SBTTB`, `SBTBB`).

## 2024-05-22 - Build Artifact Management
**Learning:** The repository's `.gitignore` missed `**/dist/`, which is the default output for Vite builds, leading to potential accidental commitment of build artifacts.
**Action:** Ensure `.gitignore` includes `**/dist/` in Vite-based projects to prevent repository bloat.
