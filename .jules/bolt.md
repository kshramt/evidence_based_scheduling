## 2024-05-18 - Prevent O(N) Re-Renders in Virtualized/Mapped Lists
**Learning:** List item components in virtualized lists (like `react-virtuoso`) or large mapped arrays that receive primitive props (e.g., `node_id`, `index`) can cause unnecessary O(N) re-renders during scrolling and state updates. This can lead to noticeable scroll lag or delays when interacting with elements.
**Action:** Always wrap such list item components (e.g., `QueueEntry`, `MobileQueueNode`) in `React.memo` to skip re-rendering if their props haven't changed.
