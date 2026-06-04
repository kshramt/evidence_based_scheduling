## 2024-06-04 - Virtualized List Item Memoization
**Learning:** `QueueEntry` inside `react-virtuoso` was unmemoized, leading to O(N) re-renders for every status update or scroll event since its props (`node_id`, `index`) are primitives.
**Action:** Always wrap leaf list components inside virtualized or mapped lists with `React.memo` when props are primitive, and append `displayName` to preserve DevTools readability.
