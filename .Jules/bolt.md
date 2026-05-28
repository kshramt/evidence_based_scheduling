## 2024-05-28 - Missing Memoization on Virtualized List Items
**Learning:** List item components receiving primitive props like `node_id` and `index` (e.g., `QueueEntry`, `MobileQueueNode`, `TreeEntry`, `EdgeRow`) should be wrapped in `React.memo` to prevent unnecessary O(N) re-renders during scrolling and state updates within `react-virtuoso` virtualized lists or mapped arrays.
**Action:** Use `React.memo` for list items rendering inside Virtuoso or mapping. Append their `displayName` to maintain React DevTools readability.
