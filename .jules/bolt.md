## 2024-05-22 - React.memo in Virtualized Lists
**Learning:** `react-virtuoso` triggers frequent re-renders of list items during scrolling. Even with `react-compiler`, explicit `React.memo` is required for components rendered by `react-virtuoso` (like `QueueEntry`) to prevent parent-triggered re-renders.
**Action:** Always wrap components used in virtualized lists with `React.memo`.
