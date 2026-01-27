## 2024-10-18 - Missing ARIA Labels on Icon-Only Buttons
**Learning:** The codebase heavily relies on `consts.SOME_MARK` (icon spans) inside buttons without providing accessible names. This makes the app unusable for screen reader users as they only hear "button" or "add" (if the icon uses ligatures).
**Action:** Systematically audit all `btn-icon` usages and enforce `aria-label` when the button content is purely graphical.
