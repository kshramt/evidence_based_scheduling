## 2024-07-16 - Prevent unnecessary O(N) re-renders in virtualization lists
**Learning:** Virtualized lists like those using `react-virtuoso` render many child elements, and wrapping individual list entry components (like `QueueEntry`) with `React.memo` is critical to prevent O(N) re-renders when parent components update state.
**Action:** When working with large lists, use `React.memo` on the rendered item components, especially if they are pure components driven primarily by primitive props like `node_id` and `index`.
