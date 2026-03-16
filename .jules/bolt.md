## 2024-05-24 - React.memo for Virtualized List Items
**Learning:** List item components in React (like `QueueEntry` or `MobileQueueNode`) receiving primitive props like `node_id` and `index` can cause unnecessary O(N) re-renders during scrolling and state updates when used inside virtualized lists like `react-virtuoso` or mapped arrays.
**Action:** Always wrap such list item components in `React.memo` to prevent global re-renders when only a few items actually change.
