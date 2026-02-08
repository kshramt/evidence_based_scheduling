## 2026-02-08 - Icon-Only Buttons Missing Accessible Labels
**Learning:** The application extensively uses icon-only buttons (via `material-icons`) without `aria-label` or `title` attributes. This makes the interface inaccessible to screen reader users and ambiguous for sighted users who may not recognize the icons.
**Action:** When creating or modifying icon-only buttons, always include `aria-label` (for screen readers) and `title` (for tooltips) to ensure clarity and accessibility.
