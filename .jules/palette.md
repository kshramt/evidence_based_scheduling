## 2024-03-08 - Adding aria-label and title to icon-only buttons
**Learning:** Found several icon-only buttons (`MoveUpButton`, `MoveDownButton`, `EvalButton`, `StartConcurrentButton`, `TopButton`) lacking `aria-label` and `title` attributes. Without these attributes, screen readers cannot properly announce the button's purpose, and sighted users do not get native tooltips.
**Action:** When adding new icon-only buttons, always ensure both `aria-label` (for screen readers) and `title` (for tooltips) are provided.
