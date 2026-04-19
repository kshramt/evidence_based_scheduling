## 2026-04-19 - Prevent O(N) Re-renders in Virtualized and Mapped Lists
**Learning:** Virtualized lists and mapped arrays in React can trigger O(N) re-renders if list item components are not memoized, particularly when global state updates cause parent components to re-render. This is especially impactful in large, frequently updating lists.
**Action:** Wrap primitive list item components (e.g., those accepting only `id` or `index` props) with `React.memo` and ensure their `displayName` is explicitly set to preserve React DevTools readability.
