## 2024-03-18 - Missing ARIA Labels and Tooltips on Icon-only Buttons
**Learning:** Many icon-only `.btn-icon` buttons in this app lack explicit accessible labels (`aria-label`) and tooltips (`title`), making them difficult to understand for both screen reader users and sighted users.
**Action:** Ensure every `btn-icon` or icon-only button includes both an `aria-label` for screen readers and a `title` attribute for native browser tooltips.
