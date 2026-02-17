## 2024-05-23 - Accessibility for Icon-Only Buttons
**Learning:** Icon-only buttons using Material Icons ligatures (e.g., `<span ...>vertical_align_top</span>`) often have ligature text that describes the icon visually but not functionally (e.g., "vertical_align_top" vs "Scroll to top").
**Action:** Always add explicit `aria-label` and `title` attributes to icon-only buttons to ensure screen readers announce the action, not the icon name.
