## 2024-04-28 - React.memo for Virtualized List Items
**Learning:** List item components mapped with primitives (e.g. `node_id` and `index`) inside a virtualized list wrapper (`react-virtuoso` or map arrays) cause O(N) re-renders during scrolling and state updates if not memoized, but `React.memo` effectively resolves this without interfering with Jotai/Redux local subscriptions inside the components.
**Action:** Identify mapping functions of list item children receiving scalar IDs and add `React.memo`, being careful to append `displayName` to maintain React DevTools readability.
