## 2024-08-01 - React.memo usage for Virtualized Lists
**Learning:** In applications using heavily populated virtualized lists (like `react-virtuoso`), all individual list item components must be explicitly wrapped in `React.memo` to prevent unnecessary O(N) re-renders, especially when they receive primitive props (like `node_id`, `edge_id`, `index`).
**Action:** Always wrap standard list components (like `QueueEntry`, `EdgeRow`, `MobileQueueNode`, and `TreeEntry`) with `React.memo` and append `Component.displayName = "Component"` to maintain React DevTools readability.
