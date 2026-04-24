## 2024-04-24 - Accessibility for Icon-only Buttons
**Learning:** React Material UI icon spans (e.g., `<span className="material-icons">`) without surrounding text lack semantic meaning. If placed inside an icon-only button without an `aria-label`, the button becomes completely inaccessible to screen readers.
**Action:** When creating or modifying icon-only buttons (`btn-icon`), always verify that the parent `<button>` has both an `aria-label` and `title` to provide an accessible name and a helpful hover tooltip.
