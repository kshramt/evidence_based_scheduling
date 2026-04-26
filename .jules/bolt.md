## 2026-04-26 - Optimize list rendering by memoizing queue nodes
**Learning:** List item components receiving primitive props like `node_id` and `index` (e.g., `QueueEntry`, `MobileQueueNode`) should be wrapped in `React.memo` to prevent unnecessary O(N) re-renders during scrolling and state updates within `react-virtuoso` virtualized lists or mapped arrays.
**Action:** Always wrap these list item components with `React.memo` and append their `displayName` to maintain React DevTools readability.
