## 2024-04-06 - Prevent O(N) re-renders in virtualized/mapped list items
**Learning:** List item components receiving primitive props like `node_id` and `index` (e.g., `QueueEntry`, `MobileQueueNode`) cause unnecessary O(N) re-renders during scrolling and state updates within `react-virtuoso` virtualized lists or mapped arrays if not memoized.
**Action:** Always wrap list item components that take primitive props with `React.memo` when rendering them inside mapped arrays or virtualized lists like `react-virtuoso` to avoid performance bottlenecks.
