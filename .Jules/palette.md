## 2026-01-26 - Icon-Only Buttons Require Explicit ARIA Labels

**Learning:** This application heavily relies on Material Icons rendered via ligatures (e.g., `<span ...>add</span>`). While convenient, these are often insufficient for screen readers, which may read the ligature text literally or ignore it. Icon-only buttons must always have an explicit `aria-label` attribute to describe the action (e.g., "Add item") and a `title` attribute for mouse users.

**Action:** When creating or modifying icon-only buttons, always ensure `aria-label` and `title` attributes are present and descriptive.
