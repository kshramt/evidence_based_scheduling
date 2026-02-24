## 2024-05-23 - [Consolidating Icon Button Classes]
**Learning:** The codebase contained inconsistent usage of `icon-icon` and `btn-icon` for icon-only buttons. `btn-icon` is the standard class defined in `lib.css` and provides proper styling for dark mode and hover states.
**Action:** Always use `btn-icon` for icon-only buttons instead of `icon-icon` or custom inline styles unless specific positioning requires otherwise (like `SBTTB`).
