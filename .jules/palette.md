## 2024-05-18 - Material Icons Need aria-hidden="true"
**Learning:** Material UI icon spans (e.g., `<span className="material-icons">`) must include `aria-hidden="true"` to prevent screen readers from incorrectly announcing their ligature text, ensuring parent elements (like buttons) dictate the accessible name.
**Action:** Always add `aria-hidden="true"` to material-icons spans across the codebase.
