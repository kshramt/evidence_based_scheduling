## 2024-09-04 - [Initialize Bolt Journal]
**Learning:** Initializing journal to log critical learnings.
**Action:** Use this file for critical performance learnings only.

## 2024-09-04 - Memoizing virtualized list items
**Learning:** Wrapping list items inside Virtuoso and standard React list maps in `React.memo()` requires explicit `.displayName` definitions to ensure readability in React DevTools, and significantly cuts down on overall UI blocking when the list's array prop changes.
**Action:** Always verify memoization boundaries inside virtualized and standard lists to avoid full re-renders when list data changes.
