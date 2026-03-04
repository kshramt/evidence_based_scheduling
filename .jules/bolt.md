
## 2024-05-20 - Global State Selector Re-render Anti-Pattern
**Learning:** Using `useSelector` to grab an entire dictionary/map from Redux state (e.g., `useSelector(state => state.swapped_nodes.status)`) in a list component (like `EdgeList`) creates an O(N) global re-render bottleneck. The component will re-render if *any* node's status changes anywhere in the app, not just the ones relevant to the current component.
**Action:** When a component needs data for multiple specific IDs, memoize the list of IDs (`edge_ids`), then return a mapped array of just those specific values inside `useSelector`, and pass `shallowEqual` as the second argument. This ensures the component only re-renders when its specific dependencies change.
