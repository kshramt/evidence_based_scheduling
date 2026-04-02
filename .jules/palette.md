# Palette Journal


## 2024-05-18 - Added ARIA attributes to icon-only buttons
**Learning:** Material UI icon spans (e.g., `<span className="material-icons">`) must include `aria-hidden="true"` to prevent screen readers from incorrectly announcing their ligature text. Crucially, when applying this to icon-only buttons, the parent element (e.g., `<button>`) MUST be given a descriptive `aria-label` to ensure it still has an accessible name, avoiding severe accessibility regressions.
**Action:** Always add `aria-label` (and optionally `title` for hover tooltips) to icon-only buttons, and ensure child ligature icons are hidden from screen readers with `aria-hidden="true"`.
