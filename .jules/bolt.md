## 2025-04-13 - Optimize list item components in virtualized lists
**Learning:** List item components in virtualized lists (like `react-virtuoso`) or mapped arrays (like in `QueueEntry` and `MobileQueueNode`) that receive simple primitive props (like `node_id` and `index`) are prone to unnecessary O(N) re-renders during scrolling and state updates if not properly memoized.
**Action:** When adding or maintaining item components for lists/queues, use `React.memo()` to prevent expensive and unnecessary re-renders, and ensure to attach `.displayName` for readability in React DevTools.
