## 2026-03-01 - [QueueEntry React.memo]
**Learning:** The QueueEntry component inside react-virtuoso lists lacks React.memo, causing unnecessary O(N) re-renders during scrolling and state updates. This pattern is essential for virtualized lists rendering primitive props.
**Action:** Always wrap list item components with React.memo when their props are primitives, particularly when rendering inside virtualized lists like react-virtuoso.
