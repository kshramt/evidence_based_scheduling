## 2024-03-01 - [ARIA Labels for RangesTable]
**Learning:** Found an accessibility issue pattern where pagination and destructive icon-only buttons (`btn-icon`) in table components lacked screen reader labels and tooltips.
**Action:** Applied `aria-label` and `title` to the Back, Forward, and Delete buttons in the RangesTable component to ensure keyboard and screen reader accessibility.
