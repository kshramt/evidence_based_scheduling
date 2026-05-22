## 2024-11-20 - React.memo Optimization in Virtualized Lists
**Learning:** List item components in virtualized lists (like `react-virtuoso` or mapped arrays) that receive primitive props (`node_id`, `index`, etc.) are prone to O(N) re-renders during state updates if not properly memoized.
**Action:** Always wrap such list items in `React.memo` and append `Component.displayName = 'ComponentName'` to maintain clear component tracking in React DevTools while drastically reducing unnecessary re-renders.
