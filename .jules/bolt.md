## 2025-02-28 - Virtualized List Optimization
**Learning:** Wrapping children components of virtualized lists (like `react-virtuoso`) with `React.memo` is critical to prevent O(N) re-renders during scrolling and interactions. Virtuoso manages the subset of visible nodes, but React may needlessly re-render the individual nodes without memoization.
**Action:** Always wrap components rendered inside a virtualized list, like `QueueEntry` or `MobileQueueNode`, in `React.memo()`. Also, remember to set `displayName` for easier React DevTools debugging.
