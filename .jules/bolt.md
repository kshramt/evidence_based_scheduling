## 2024-05-24 - Missing React.memo in Virtualized Lists
**Learning:** Components rendered by `react-virtuoso` (like `QueueEntry`) must be memoized to prevent unnecessary re-renders when the virtualized list updates. The memory indicated they were memoized, but the code showed they were not.
**Action:** Always verify if list items in virtualized lists are wrapped in `React.memo`, especially if they are connected to global state (Redux/Jotai).
