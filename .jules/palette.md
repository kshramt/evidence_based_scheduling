## 2026-02-07 - Reusable Keyboard Handler for Span Buttons
**Learning:** Many interactive elements were implemented as `<span>` tags with `role="button"` but lacked keyboard support (Enter/Space), making them inaccessible to keyboard users.
**Action:** Introduced `utils.useOnKeyDown(onClick)` hook to easily add standard keyboard activation to these elements. Use this hook whenever `role="button"` is used on non-button elements.
