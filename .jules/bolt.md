## 2025-01-20 - Memoizing list item components
**Learning:** React re-renders virtualized list items components like `QueueEntry` or mapped list components like `MobileQueueNode` excessively when the parent state updates, causing O(N) performance issues because they depend only on primitive props (`node_id`, `index`).
**Action:** Always wrap components rendered in large lists that receive primitive props with `React.memo` to skip unnecessary re-rendering.
