## 2024-05-20 - Icon-only Buttons Missing Accessible Names

**Learning:** When using Material UI icon ligatures (e.g., `<span className="material-icons">play_arrow</span>`), the ligatures cause screen readers to announce the ligature text ("play arrow") instead of the function. And if `aria-hidden="true"` is applied to the icon, the parent button will lack an accessible name if it doesn't have an `aria-label` or `title`.

**Action:** Add descriptive `aria-label` and `title` attributes to all icon-only buttons across the app to ensure proper screen reader accessibility and provide visual tooltips on hover. Ensure `aria-hidden="true"` is on the icon element itself.
