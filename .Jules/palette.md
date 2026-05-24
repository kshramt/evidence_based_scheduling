
## 2024-05-24 - Accessibility for Icon-only Buttons
**Learning:** In the shared constants file (like `client/src/consts.tsx`), adding `aria-hidden="true"` to Material UI icons globally hides them from screen readers, causing accessibility regressions for buttons that lack an `aria-label`.
**Action:** Instead of changing shared constants, ensure specific icon-only buttons (`StartButton`, `StartConcurrentButton`, `AddButton`, `MoveUpButton`, `MoveDownButton`) are explicitly provided with `aria-label` and `title` attributes.
