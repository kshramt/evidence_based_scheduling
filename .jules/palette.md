## 2024-02-12 - Icon-Only Button Accessibility Pattern
**Learning:** Icon-only buttons (using `className="btn-icon"` or `className="icon-icon"`) are frequently used without `aria-label` or `title` attributes, making them inaccessible to screen readers. Specifically, components like `SBTTB`, `SBTBB`, and filter inputs rely solely on visual icons.
**Action:** When creating or modifying icon-only buttons, always enforce the inclusion of `aria-label` (for screen readers) and `title` (for tooltips). Additionally, standardize on `btn-icon` class instead of inconsistent `icon-icon`.
