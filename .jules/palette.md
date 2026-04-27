## 2026-04-27 - Added ARIA labels to button components
**Learning:** Icon-only buttons using `<span className="material-icons">` across the app are missing `aria-label` and `title` attributes. They also missing `aria-hidden="true"` on the icon itself to prevent screen readers from reading the ligature text.
**Action:** Adding these attributes to the core button components.
