## 2024-08-29 - React Component Memoization
**Learning:** We need to find purely logical optimization. `QueueEntry` and its inner components `_QueueEntry`, `NonTodoQueueEntry`, and `TodoQueueEntry` re-render whenever the queue data updates. By wrapping these specific components with `React.memo()`, we can optimize list rendering performance where unchanged list items do not re-render unnecessarily.
**Action:** Let's wrap components inside `client/src/QueueEntry.tsx` with `React.memo` and add `.displayName` for debugging.
