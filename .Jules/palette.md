## 2026-01-25 - Icon-Only Button Accessibility
**Learning:** Material Icons ligatures (e.g., `<span ...>add</span>`) are not reliable accessible labels. Screen readers may read the ligature text which can be confusing or insufficient.
**Action:** Always add explicit `aria-label` to icon-only buttons, even if the icon implementation technically contains text.
