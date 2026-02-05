## 2024-05-22 - Icon-Only Button Accessibility
**Learning:** Icon-only buttons using Material Icon ligatures (e.g. `<span ...>add</span>`) are invisible to screen readers without explicit `aria-label`s. The text content "add" is not sufficient as a label for many assistive technologies when rendered as a ligature.
**Action:** Always add `aria-label` and `title` to icon-only buttons, especially when using font ligatures for icons.
