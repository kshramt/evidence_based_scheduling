## 2024-05-24 - React.memo for Virtuoso lists
**Learning:** List items like `QueueEntry` and `MobileQueueNode` that take simple primitive props (`node_id`, `index`) are prime candidates for `React.memo()`. By default, they re-render whenever the parent virtualized list (`react-virtuoso`) re-renders, causing unnecessary O(N) operations during scrolling and state updates.
**Action:** Always check list item components passed into mapping functions or virtualized list renderers. If they only receive primitives, wrap them in `React.memo()` and set `.displayName` to prevent performance bottlenecks.
