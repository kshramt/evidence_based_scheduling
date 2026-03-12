## 2024-05-24 - React List Item Optimization
**Learning:** List item components that receive simple primitive props (like `node_id` or `index`) such as `QueueEntry` and `MobileQueueNode` are prone to O(N) global re-renders during state updates or scrolling. This is specifically true within `react-virtuoso` virtualized lists or large mapped arrays in this codebase.
**Action:** Always wrap list item components that take primitive props in `React.memo` to prevent cascading and unnecessary O(N) re-renders when parent states change.
