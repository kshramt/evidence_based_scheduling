## 2024-05-06 - Component Memoization for Virtualized/Mapped Lists
**Learning:** List item components in this codebase receiving primitive props (`node_id`, `index`)—such as `QueueEntry` inside `react-virtuoso` lists or `MobileQueueNode` in mapped arrays—are highly susceptible to O(N) re-renders during scrolling and state updates if not properly memoized.
**Action:** Always wrap these list row components in `React.memo` and append a `displayName` (e.g., `QueueEntry.displayName = "QueueEntry";`) to prevent performance regressions while maintaining debuggability in React DevTools.
