## 2024-11-20 - React.memo for List Items
**Learning:** List item components receiving primitive props like `node_id` and `index` (e.g., `QueueEntry`, `MobileQueueNode`) can cause unnecessary O(N) global re-renders during scrolling and state updates within virtualized lists (like `react-virtuoso`) or standard mapped arrays.
**Action:** Always wrap these pure list item components with `React.memo` to prevent re-renders when their primitive props haven't changed.
