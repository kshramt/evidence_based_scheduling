# Palette's Journal

This journal documents critical UX and accessibility learnings.

Format:
## YYYY-MM-DD - [Title]
**Learning:** [UX/a11y insight]
**Action:** [How to apply next time]

## 2026-02-18 - Missing Accessibility Labels on Icon Buttons
**Learning:** Icon-only buttons (using `consts.*_MARK`) frequently lack accessible names (`aria-label`) and tooltips (`title`). This makes the interface confusing for screen reader users and new users.
**Action:** Enforce `aria-label` and `title` on all icon-only buttons. Prefer the `btn-icon` class for consistency.
