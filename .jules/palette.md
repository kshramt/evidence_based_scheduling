## 2024-05-22 - Icon Button Accessibility Gap
**Learning:** The codebase consistently uses `material-icons` inside buttons (class `btn-icon`) without `aria-label` or `title` attributes, rendering core actions (Add, Start, Stop) inaccessible to screen readers and unclear to sighted users.
**Action:** Systematically audit all components using `.btn-icon` and enforce `aria-label` (for screen readers) and `title` (for tooltips) on these elements.
