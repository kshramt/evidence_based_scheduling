## 2024-05-24 - React.memo for list item components
**Learning:** List item components in virtualized lists or mapped arrays (`QueueEntry`, `MobileQueueNode`, `TreeEntry`, `EdgeRow`) receiving primitive props like `node_id` and `index` can cause unnecessary O(N) re-renders during scrolling and state updates if not memoized.
**Action:** Wrap these components in `React.memo` and append their `.displayName` to prevent performance bottlenecks without breaking React DevTools readability.
