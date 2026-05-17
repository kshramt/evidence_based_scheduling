## 2026-05-17 - Memoizing Virtualized List Items
**Learning:** List item components mapped with primitives or used in `react-virtuoso` lists (like `QueueEntry`, `EdgeRow`, `MobileQueueNode`, `TreeEntry`) will suffer from O(N) re-renders during state updates if not properly memoized, severely impacting scrolling performance.
**Action:** Always wrap standard virtualized row components with `React.memo` and ensure to set their `displayName` for React DevTools readability.
