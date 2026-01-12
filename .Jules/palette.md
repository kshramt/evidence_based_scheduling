## 2026-01-12 - [Accessible Icon Buttons]
**Learning:** The application relies heavily on icon-only buttons (Material Icons) without accessible names. This makes the interface very difficult to use for screen reader users, who would only hear "button" or "add" (if the icon ligature is read).
**Action:** Always include `aria-label` or `aria-labelledby` for icon-only buttons. The label should describe the action (e.g., "Add new item", "Delete item").
