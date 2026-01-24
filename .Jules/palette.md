## 2025-02-12 - Icon-Only Button Accessibility
**Learning:** Multiple icon-only buttons (using Material Icons) lacked `aria-label` and `title` attributes, making them inaccessible and lacking tooltips.
**Action:** Always add `aria-label` (for screen readers) and `title` (for tooltips) to any button that uses only an icon for its content.
