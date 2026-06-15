## 2024-06-15 - Identify un-memoized list items
**Learning:** Found components that receive primitive props (`node_id`, `index`, `nodeId`) and render inside a `.map` loop or `react-virtuoso` virtualized list but are not using `React.memo`. This causes unnecessary O(N) re-renders when list data changes or when scrolling.
**Action:** Always check if list item components (`QueueEntry`, `MobileQueueNode`, `TreeEntry`, `EdgeRow`) are wrapped with `React.memo`. When adding `React.memo`, also append `.displayName` to retain readability in React DevTools.
