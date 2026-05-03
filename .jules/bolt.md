## 2024-06-25 - React.memo for List Items
**Learning:** `react-virtuoso` lists and mapped arrays receiving primitive props (like `node_id` or `index`) in this codebase suffer from O(N) re-renders on state updates unless wrapped in `React.memo` with a set `displayName`.
**Action:** Always wrap list item components like `QueueEntry` or `MobileQueueNode` in `React.memo` and set their `displayName` to prevent unnecessary performance overhead.
