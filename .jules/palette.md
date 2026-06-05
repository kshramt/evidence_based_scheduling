## 2024-06-05 - Added Accessibility to Icon-Only Action Buttons
**Learning:** Icon-only action buttons across the codebase (e.g., Add, Move Up, Evaluate) lacked accessible names, making them difficult to use for screen reader users and lacking hover context for sighted users.
**Action:** Always ensure `aria-label` and `title` attributes are applied directly to the `<button>` element when an icon is its only content.
