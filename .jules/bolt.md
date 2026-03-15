## 2024-03-15 - Prevent Unnecessary O(N) Re-renders in Large Lists
**Learning:** List item components receiving primitive props (like `node_id` and `index`) within `react-virtuoso` virtualized lists or mapped arrays (e.g., `QueueEntry`, `MobileQueueNode`) will still cause O(N) re-renders during scrolling and state updates if they are not explicitly memoized.
**Action:** Always wrap primitive-prop-receiving list item components in `React.memo` (especially those inside virtualized lists or large array maps) to ensure optimal performance and avoid unnecessary O(N) global render cycles.
