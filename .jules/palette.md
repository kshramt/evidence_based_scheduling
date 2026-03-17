## 2024-03-17 - Missing ARIA Labels on Icon Buttons
**Learning:** Many icon-only buttons across `client/src` components (e.g., `StartButton`, `TopButton`, `AddButton`, `MoveUpButton`, `MoveDownButton`) lack explicit `aria-label` and `title` attributes. This makes them inaccessible to screen readers and difficult to understand without tooltips.
**Action:** When creating or modifying icon-only buttons (`className="btn-icon"`), always include an `aria-label` and a `title` attribute.
