## 2024-03-14 - React.memo for List Items
**Learning:** Returning `null` from a row component in `react-virtuoso` will cause layout issues or crashes because Virtuoso does not allow 0-height elements. Render a minimal empty element (e.g., `<div className="w-[1px] h-[1px]" />`) instead of `null`.
**Action:** When creating or optimizing virtualized list items, ensure they always render something with a non-zero dimension. Also, use `React.memo` on list item components receiving primitive props (like `node_id` or `index`) to prevent unnecessary O(N) re-renders during scrolling and state updates.
