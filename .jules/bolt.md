## 2026-05-10 - Wrap list components with React.memo
**Learning:** List item components receiving primitive props like `node_id` and `index` (e.g., `QueueEntry`, `MobileQueueNode`, `TreeEntry`, `EdgeRow`) should be wrapped in `React.memo` to prevent unnecessary O(N) re-renders during scrolling and state updates within `react-virtuoso` virtualized lists or mapped arrays.
**Action:** When adding or modifying list item components, wrap them in `React.memo` and set their `displayName` if they receive simple props.
