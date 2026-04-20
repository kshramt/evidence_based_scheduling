## 2024-05-14 - Prevent O(N) Re-renders in Virtualized Lists
**Learning:** List item components receiving primitive props like `node_id` and `index` (e.g., `QueueEntry`, `MobileQueueNode`) within virtualized lists (like `react-virtuoso` or simple maps) cause O(N) re-renders during scrolling and global state updates unless memoized.
**Action:** Wrap these list item components in `React.memo` and append `displayName` (e.g., `QueueEntry.displayName = 'QueueEntry';`) to prevent unnecessary re-renders while maintaining React DevTools readability.
