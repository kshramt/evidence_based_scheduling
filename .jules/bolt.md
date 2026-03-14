## 2024-12-04 - Memoizing virtualized list items
**Learning:** List item components receiving primitive props (like `node_id` and `index`) inside virtualized lists (`react-virtuoso`) or large mapped arrays should be wrapped in `React.memo` to prevent unnecessary O(N) re-renders during scrolling and state updates.
**Action:** Always wrap leaf/item components in `React.memo` if they only accept primitives and are rendered in a long list.
