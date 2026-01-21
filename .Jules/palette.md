## 2024-05-23 - Missing ARIA Labels on Icon Buttons
**Learning:** The application extensively uses `material-icons` spans inside buttons without text content. These "icon-only" buttons were largely missing `aria-label` attributes, making them inaccessible to screen readers.
**Action:** When creating new icon-only buttons, always ensure an `aria-label` is present. I've updated `AddButton`, `StartButton`, `StartConcurrentButton`, `TopButton`, `CopyNodeIdButton`, and `ShowDetailsButton` to include descriptive labels. Future reviews should check for this pattern.
