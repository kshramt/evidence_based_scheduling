## 2024-05-18 - Mapped Array Rendering Optimizations
**Learning:** Virtualized lists and mapped arrays in this specific React application structure suffer from unnecessary O(N) re-renders during deep state updates (e.g. within virtualized queues and hierarchical tables) unless the individual item components are explicitly memoized.
**Action:** When working with rendering layers that iterate over large primitive data sets or IDs, proactively wrap the child elements (`QueueEntry`, `EdgeRow`, `MobileQueueNode`, `TreeEntry`) in `React.memo` and append `displayName` for debuggability.
