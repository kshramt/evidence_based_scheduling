## 2026-06-14 - React.memo for Virtualized List Items
**Learning:** List item components receiving simple primitive props (like node_id, index) rendered inside long react-virtuoso virtualized lists or mapped arrays are highly susceptible to unnecessary O(N) re-renders during scrolling and global state updates.
**Action:** Always wrap these stateless or primitive-prop-only list item components (e.g., QueueEntry, MobileQueueNode, TreeEntry, EdgeRow) in `React.memo()` and explicitly set their `.displayName` to maintain React DevTools readability and significantly reduce rendering cycles.
