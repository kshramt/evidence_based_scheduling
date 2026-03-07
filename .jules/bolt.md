## 2024-03-07 - [Optimizing List Items with React.memo]
**Learning:** Found instances of list items lacking React.memo, specifically `QueueEntry` and `MobileQueueNode`. They are rendered inside a list (specifically react-virtuoso for QueueEntry, and a mapped list for MobileQueueNode) which can trigger O(N) re-renders when parent state updates.
**Action:** Applied React.memo to prevent unnecessary re-renders of primitive-prop child components within large lists.
