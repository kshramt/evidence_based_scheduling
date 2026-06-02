## 2024-06-02 - React.memo on List Item Components

**Learning:** Virtualized lists (`react-virtuoso`) and standard mapped arrays frequently pass primitive properties (`node_id`, `index`, `edge_id`) down to list item child components. Even if the underlying state the item represents hasn't changed, a state update in a parent can cause an O(N) re-render of all visible items.

**Action:** Identify list item components that accept primitive props (like `QueueEntry` or `EdgeRow`) and aggressively wrap them in `React.memo()`. This allows React to skip re-renders through shallow equality checks. Always append `.displayName` to the memoized component to maintain React DevTools readability.
