## 2024-05-02 - React Virtuoso Null Height Error & Memoization

**Learning:** When using `react-virtuoso` for virtualized lists in this codebase (e.g., in `QueueEntry`), returning `null` from a row component causes layout issues or crashes because Virtuoso does not allow 0-height elements. Additionally, mapping large lists without memoization causes O(N) re-renders during state updates or scrolling.
**Action:** When filtering out items in a virtualized list, return a minimal empty element (e.g., `<div className="w-[1px] h-[1px]" />`) instead of `null`. Always wrap virtualized row components that receive primitive props (`node_id`, `index`) with `React.memo` and set their `displayName` to maintain performance without breaking React DevTools.
