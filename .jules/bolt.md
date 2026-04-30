## 2024-04-30 - Prevented Unnecessary Re-Renders in List Components
**Learning:** Virtualized lists like `react-virtuoso` handle heavy rendering, but list item components receiving primitive props (like `node_id` and `index`) can still suffer from O(N) global re-renders during state updates if not properly memoized.
**Action:** When implementing list item components that accept primitive props (e.g., `QueueEntry`, `MobileQueueNode`), always wrap them in `React.memo` to skip unnecessary parent-driven re-renders, and append `displayName` for DevTools readability.
