## 2024-05-22 - Icon-only buttons relying on variables escape ESLint checks
**Learning:** ESLint's `jsx-a11y` plugin may not flag icon-only buttons if the content is a variable (e.g., `{consts.ADD_MARK}`), assuming it might contain text.
**Action:** Manually verify icon-only buttons that use variables for content and ensure they have explicit `aria-label` attributes.

## 2024-05-22 - Frontend verification without backend
**Learning:** The application requires complex authentication and backend connectivity to reach the main UI, making it difficult to verify micro-UX changes (like tooltips) visually in a headless/mock-less environment.
**Action:** Rely on static analysis (TypeScript, ESLint) and manual code verification for isolated component changes when full E2E environment is unavailable.
