## 2024-05-24 - [Inaccessible Icon-Only Buttons]
**Learning:** Found a pattern of icon-only buttons (like `SBTTB`, `SBTBB`, `ToggleShowMobileButton`, and various timeline controls) lacking `aria-label` and `title` attributes, making them inaccessible to screen readers and confusing for mouse users without tooltips.
**Action:** Always add `aria-label` and `title` to icon-only buttons during development or refactoring, specifically targeting custom components in `client/src/components.tsx`.
