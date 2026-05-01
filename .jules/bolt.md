## 2024-05-15 - React.memo on List Components
**Learning:** Virtualized lists and long map iterations in React can suffer severe performance degradation if the child components aren't memoized and rely on global/frequent prop updates. Primitive props like node_id and index make components perfect candidates for React.memo.
**Action:** Always wrap components rendered inside loops or virtualized lists (like `react-virtuoso`) in `React.memo` when they receive primitive props to prevent O(N) re-renders, and remember to append `.displayName` to preserve React DevTools readability.
