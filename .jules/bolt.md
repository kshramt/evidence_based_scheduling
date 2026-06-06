
## $(date +%Y-%m-%d) - Memoize list item components
**Learning:** List item components in React Virtuoso or mapped arrays receiving primitive props (like `node_id` and `index`) will re-render in O(N) during state updates if not properly memoized.
**Action:** Always wrap these list item components in `React.memo` and explicitly assign a `displayName`.
