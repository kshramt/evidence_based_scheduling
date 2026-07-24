## 2024-07-24 - React.memo on Virtuoso item component
**Learning:** In a virtualized list (like `react-virtuoso`), the item component (e.g., `QueueEntry`) is called frequently when scrolling. Using `React.memo` on the exported component avoids unnecessary re-renders of list items whose props (`node_id`, `index`) haven't changed, significantly improving scrolling performance and reducing main-thread blocking.
**Action:** Always consider `React.memo` for components used as `itemContent` in virtualized lists.
