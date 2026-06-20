## 2024-06-20 - Memoization for Tree and List Components
**Learning:** In highly nested or long-list React structures (like the node tree here), parent re-renders trigger expensive O(N) child re-renders. Wrapping individual row/item components (`TreeEntry`, `MobileQueueNode`, etc.) with `React.memo` prevents this bottleneck by ensuring they only update when their specific props (`node_id`) change.
**Action:** Always consider `React.memo` for components rendered within maps or recursive tree structures that take primitive or stable props (like IDs) to maintain fast rendering.
