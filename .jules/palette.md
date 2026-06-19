## 2024-06-19 - Added ARIA labels to EntryButtons
**Learning:** Icon-only buttons used heavily in the tree node interface (`EntryButtons`) were missing ARIA labels, making them difficult to use for screen reader users. The application relies heavily on icons from Material Icons (`consts.tsx`) for navigation and action.
**Action:** Always add `aria-label` attributes to buttons that only display icons, particularly in repeating elements like list items or tree nodes.
