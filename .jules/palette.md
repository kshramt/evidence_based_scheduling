## 2024-05-18 - Missing ARIA labels and title on icon-only buttons
**Learning:** Many icon-only buttons across components (e.g., StartButton, AddButton, EntryButtons) lacked explicit `aria-label` and `title` attributes. Also, Material UI icon spans need `aria-hidden="true"` to prevent incorrect screen reader announcements.
**Action:** When adding new icon-only buttons or reviewing existing ones, ensure they have both an `aria-label` for screen readers and a `title` for visual tooltips, and that the icon span has `aria-hidden="true"`.
