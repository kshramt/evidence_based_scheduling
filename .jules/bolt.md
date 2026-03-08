## 2025-03-08 - Use React.memo for list items receiving primitive props
**Learning:** In lists with numerous items (like queues or virtualized lists via `react-virtuoso`), mapping child components without `React.memo` causes unnecessary O(N) re-renders when parent state updates.
**Action:** When a list child component (`QueueEntry`, `MobileQueueNode`, etc.) takes simple primitive props like `node_id` or `index`, always wrap it in `React.memo` to skip re-renders when these props haven't changed.
