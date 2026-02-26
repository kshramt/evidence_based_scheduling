## 2026-02-26 - Hidden Button Functionality Exposure
**Learning:** Icon-only buttons with modifier key (Ctrl/Meta) behaviors are completely undiscoverable without a tooltip explaining the interaction.
**Action:** Always verify if an icon-only button has complex click handlers (e.g., checking `e.ctrlKey`) and add a descriptive `title` attribute detailing the shortcut.
