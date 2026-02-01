# Bolt's Journal

## 2024-05-22 - [Initial Entry]
**Learning:** React Virtuoso requires explicit `React.memo` for item components to prevent parent-triggered re-renders, even with React Compiler.
**Action:** Always wrap components used in `itemContent` or similar virtualization props with `React.memo`.
