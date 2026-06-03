## 2026-06-03 - Add ARIA labels and titles to icon-only buttons
**Learning:** Found multiple icon-only buttons without explicit accessibility labels (aria-label) and visual tooltips (title), which can hinder screen reader accessibility.
**Action:** When creating icon-only buttons using constants like START_MARK or STOP_MARK, explicitly include `aria-label` for screen readers and `title` for hover tooltips to ensure a more accessible UX.
