## 2026-05-29 - Avoid Stringifying React Nodes in aria-label
**Learning:** When assigning 'aria-label' or 'title' attributes dynamically (e.g., from component props), ensure the value evaluates to a string. Passing a React Node to these attributes will result in an '[object Object]' stringification bug in the DOM.
**Action:** Always verify that 'aria-label' and 'title' values are explicit strings when adding them to icon-only buttons or when reading from external constants.
