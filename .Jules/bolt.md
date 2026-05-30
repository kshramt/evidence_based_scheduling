## 2024-05-24 - Investigating Virtualized List Rendering
**Learning:** Found Virtuoso and mapping used for rendering lists (QueueEntry, MobileQueueNode, TreeEntry, EdgeRow). Components mapped with primitive props like `node_id` and `index` often benefit from `React.memo` to prevent unnecessary O(N) re-renders.
**Action:** Always wrap list item components mapped with simple props in `React.memo` and add a `displayName` for easier React DevTools profiling.
## 2024-05-24 - React.memo Optimization
**Learning:** Virtualized list items that receive primitive props should be wrapped in React.memo to prevent unnecessary re-renders. When wrapping with React.memo, it is essential to also add inline comments explaining the performance impact to meet the persona's instructions.
**Action:** Always include inline comments like '⚡ Bolt: React.memo prevents O(N) re-renders when parent state changes' alongside the code modification.
