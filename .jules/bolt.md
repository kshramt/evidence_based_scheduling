## 2024-05-14 - List Item Memoization
**Learning:** List item components receiving primitive props like `node_id` and `index` (e.g., `QueueEntry`, `MobileQueueNode`, `TreeEntry`, `EdgeRow`) should be wrapped in `React.memo` to prevent unnecessary O(N) re-renders during scrolling and state updates within `react-virtuoso` virtualized lists or mapped arrays.
**Action:** Always wrap these components in `React.memo` and append their `displayName` (e.g., `QueueEntry.displayName = 'QueueEntry';`) to maintain React DevTools readability.
