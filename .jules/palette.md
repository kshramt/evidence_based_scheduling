## 2025-02-18 - Accessibility of Icon-Only Buttons
**Learning:** Icon-only buttons relying on Material Icon ligatures (e.g., `<span ...>vertical_align_top</span>`) are inaccessible to screen readers because the ligature text is often not meaningful or announced correctly.
**Action:** Always add explicit `aria-label` and `title` attributes to buttons that contain only an icon. Use the `ariaLabel` prop pattern for reusable components like `AddButton`.
