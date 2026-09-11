# CSS architecture

Styles are organized by ownership so the global bundle does not turn into a monolith.

- `tokens.css` contains application-wide design tokens only.
- `global.css` contains the reset and document-level defaults only.
- Shared UI components live in their own folders with a colocated `Component.module.css`.
- Feature components live in their own folders with a colocated `Component.module.css`.
- Shared feature presentation primitives live in the feature's `styles` directory.
- Page and component motion stays in the CSS Module that owns the animated element.
- Responsive rules stay beside the component they modify.
- Platform-independent design values live in `shared/src/design`; Web mirrors them as CSS variables while React Native consumes the TypeScript values.

Import CSS Modules from their matching component. Avoid global class names and never add feature or component selectors to `index.css`.
