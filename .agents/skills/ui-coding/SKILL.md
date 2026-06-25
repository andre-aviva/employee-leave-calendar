---
name: ui-coding
description: Use when building or modifying UI components in the employee-leave-calendar project. Covers React/TypeScript patterns (named exports, function declarations), SCSS Modules (rem-calc, design tokens, breakpoints), component directory structure, file naming conventions, and accessibility (WCAG 2.2 AA). Trigger this when creating new components in src/frontend or refactoring existing ones.
---

# UI Library Coding Guidelines

This skill defines the coding standards and patterns for building a scalable UI component library using React and TypeScript in this project.

## 1. Project Structure

UI components are organized by domain/responsibility in `src/frontend/src/components/`:

- `core/`: Basic building blocks (Button, Icon, etc.)
- `forms/`: Form-related components (Input, Checkbox, etc.)
- `layout/`: Layout components (Container, Grid, etc.)
- `product/`, `calendar/`, `leave/`, etc.: Feature-specific components.

## 2. Component Directory Structure

Every component lives in its own directory with the following structure:

```
ComponentName/
  ComponentName.tsx           # Logic and JSX
  ComponentName.module.scss  # Scoped styles
  ComponentName.resources.ts # Static text/i18n
  ComponentName.stories.tsx  # Storybook stories
  exampleData.ts             # Mock data for stories/tests
  _mixins.scss               # Local SCSS mixins (optional)
```

## 3. File Naming Conventions

| Type      | Convention       | Example               |
| --------- | ---------------- | --------------------- |
| Component | PascalCase       | `Button.tsx`          |
| Styles    | `.module.scss`   | `Button.module.scss`  |
| Resources | `.resources.ts`  | `Button.resources.ts` |
| Stories   | `.stories.tsx`   | `Button.stories.tsx`  |
| Data      | `exampleData.ts` | `exampleData.ts`      |
| Mixins    | `_mixins.scss`   | `_mixins.scss`        |
| Types     | PascalCase       | `Product.ts`          |
| Utils     | camelCase        | `formatPrice.ts`      |

## 4. TypeScript & React Patterns

### Component Template

```typescript
import { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './ComponentName.module.scss';
import { resources } from './ComponentName.resources';

export type ComponentNameProps = {
  children?: ReactNode;
  isActive?: boolean;
};

export function ComponentName({ children, isActive }: ComponentNameProps) {
  return (
    <div
      className={clsx(styles.container, isActive && styles['container--active'])}
      data-test="ComponentName"
    >
      <h2>{resources.headingText}</h2>
      {children}
    </div>
  );
}
```

### Rules
- ✅ **DO**: Use named exports, function declarations, and typed props.
- ❌ **DON'T**: Use default exports or arrow function components.

## 5. Styling (SCSS Modules)

### Core Rules
- Use **SCSS Modules**.
- Use `@use` (NOT `@import`).
- Use **design tokens (variables)**.
- Use **rem-calc()** for sizing.
- `@include` mixins always at the top of a styling block.

### Example
```scss
@use "../styles/variables" as *;
@use "../styles/breakpoints" as breakpoints;
@use "../styles/utils" as *;

.container {
  padding: rem-calc(16);
  background-color: $white;

  @include breakpoints.lg {
    padding: rem-calc(24);
  }

  &--active {
    background-color: $primary-100;
  }
}
```

## 6. Design System

### Breakpoints
- Use **min-width only**.
- Mixins: `sm`, `md`, `lg`, `xl`, `xxl`.
- ❌ Avoid `max-width` queries.

```scss
@include breakpoints.md { ... }
```

### Grid & Typography
- Use `content-grid` for wrappers.
- Use predefined typography mixins (e.g., `@include heading-large`).
- Never hardcode heading styles or colors.

### Utilities & Hover
- Use `rem-calc`, `visually-hidden`, `border-radius`.
- Wrap hover states in `@include breakpoints.media-hover`.

## 7. HTML & Accessibility (WCAG 2.2 AA)

- Use semantic HTML.
- Actions: `<button type="button">`.
- Ensure keyboard accessibility.
- Headings: Use correct levels. Start components with `h2` if in doubt; only one `h1` per page.

## 8. Resource Texts (Simplified i18n)

Define all UI text in a `.resources.ts` file next to the component.

```typescript
export type ButtonResources = {
  label: string;
  message: (params: {name: string}) => string;
};

export const resources: ButtonResources = {
  label: "Submit",
  message: ({name}) => `Hello ${name}`,
};
```

## 9. Forms & Images

- **Forms**: Use `react-hook-form` via `useFormContext`.
- **Images**: Use Next.js `Image` component.

## 10. Checklist for PRs

- [ ] Component, Styles, Resources, and Story created.
- [ ] Props are fully typed.
- [ ] SCSS Modules used with `@use` and `rem-calc()`.
- [ ] No hardcoded colors (use variables).
- [ ] Breakpoints via mixins (min-width).
- [ ] Semantic HTML and Accessibility (WCAG 2.2 AA) verified.
- [ ] Import order: React -> Third-party -> Components -> Types -> Utils -> Styles -> Resources.
