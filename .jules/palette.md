## 2024-03-23 - Missing aria-labels on icon buttons
**Learning:** Many icon-only buttons across `client/src/components` (e.g., `StartButton`, `StopButton`, `AddButton`, `EntryButtons`) lack explicit `aria-label` and `title` attributes. These must be manually added to ensure screen reader accessibility.
**Action:** Always check `aria-label` and `title` on icon-only buttons.
