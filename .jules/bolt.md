## 2026-04-24 - Prevent O(N) re-renders in virtualized lists
**Learning:** Virtualized lists using `react-virtuoso` will still trigger re-renders on every scroll tick or state change if list item components receiving primitive props are not memoized.
**Action:** Always wrap list item components (e.g., `QueueEntry`, `MobileQueueNode`) receiving primitive props in `React.memo` to prevent unnecessary O(N) DOM reconciliations during fast scrolling and global state updates. Be sure to append `.displayName` for DevTools visibility.
