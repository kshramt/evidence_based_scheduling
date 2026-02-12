## 2025-02-12 - Material Icon Ligature Accessibility
**Learning:** Icon-only buttons using Material Icon ligatures (e.g., `<span className="material-icons">add</span>`) are not accessible because screen readers may not announce the icon name or may announce it confusingly.
**Action:** Always add `aria-label` and `title` to buttons that only contain an icon.
