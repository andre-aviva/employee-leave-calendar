---
sessionId: session-260625-211753-15br
---

# Requirements

### Overview & Goals
The goal is to implement the full frontend for the 'Employee Leave Calendar' application in `src/frontend`. The application will allow employees to manage their leave and view a company-wide calendar, while administrators will have full control over all leave records.

### Scope
- **In Scope**:
    - Implementation of all screens: Sign In, Calendar Overview, My Leave, and Leave Management.
    - Creation of a reusable component library following project standards.
    - Integration with the existing .NET 10 backend.
    - Storybook setup and component documentation.
    - WCAG 2.2 AA accessibility compliance.
    - I18n support via `.resources.ts`.

- **Out of Scope**:
    - Backend modifications.
    - Deployment pipeline configuration (beyond ensuring a successful build).

### User Stories
- **As an employee**, I want to sign in so that I can access my leave information.
- **As an employee**, I want to register my leave so that my team knows when I'm away.
- **As an employee**, I want to view a team calendar so I can see colleagues' availability.
- **As an admin**, I want to manage everyone's leave so I can keep the records up to date.

### Functional Requirements
- **Role-based access**: Employees manage their own leave; Admins manage all leave.
- **Calendar**: Visual grid showing absences and leave types.
- **Leave Registration**: Form with date range, leave type, and description.
- **Date Handling**: All dates displayed as DD-MM-YYYY; communication with backend in ISO 8601.
- **Responsive Design**: Support for various screen sizes (via SCSS breakpoints). Custom breakpoints will be added for optimal mobile support (e.g., horizontal scrolling for tables).

# Technical Design

### Current Implementation
The project has a scaffolded React application in `src/frontend` and a mature .NET 10 backend in `src/backend`. The frontend folders for components and pages exist but are currently empty.

### Key Decisions
- **Framework**: React 19 with Vite.
- **Styling**: SCSS Modules with design tokens and rem-calc utility.
- **State Management**: `useSWR` for API state management to ensure "stale-while-revalidate" behavior, preventing complete loading screens and showing existing data while updating.
- **Forms**: `react-hook-form` for all data entry.
- **Icons**: `lucide-react` for consistent, accessible iconography. Exactly matching SVG icons from Figma will be used where they deviate from standard Lucide icons.
- **Routing**: `react-router-dom` for client-side navigation.

### Proposed Architecture
The frontend will follow a modular architecture:
- **`api/`**: Service layer for communicating with backend endpoints.
- **`components/`**: Atomic and molecular components (core, forms, layout, feature-specific).
- **`pages/`**: Page-level components that compose features and layouts.
- **`utils/`**: Helper functions for date formatting and data transformation.
- **`styles/`**: Global styles, mixins, and variables.

### File Structure
```
src/frontend/src/
├── api/          # API service classes/functions
├── components/   # Reusable components
│   ├── core/
│   ├── forms/
│   ├── layout/
│   └── [feature]/
├── pages/        # Page components
├── router/       # Route definitions
├── styles/       # Global SCSS
└── utils/        # Date helpers, etc.
```

### Component Patterns
Each component will consist of:
- `ComponentName.tsx`: Logic and markup.
- `ComponentName.module.scss`: Scoped styles.
- `ComponentName.resources.ts`: Static text strings.
- `ComponentName.stories.tsx`: Storybook documentation.
- `exampleData.ts`: Mock data for development/testing.

# Testing

### Validation Approach
- **Visual Testing**: Verify designs against Figma using Storybook.
- **Accessibility Testing**: Use automated tools and manual keyboard navigation checks to ensure WCAG 2.2 AA.
- **Integration Testing**: Verify end-to-end flows (Sign in -> Register leave -> View on calendar) against the running backend.
- **Build Validation**: Ensure `npm run build` completes without errors.

### Key Scenarios
- Successful login redirects to Calendar Overview.
- Registering leave shows an error if dates overlap.
- Calendar displays different colors/badges for different leave types.
- Admin can see the "Leave Management" link while regular employees cannot.

# Delivery Steps

### ✓ Step 1: Project Setup & Foundation
Establish the foundation for the frontend application.

- Add necessary dependencies: `react-router-dom`, `react-hook-form`, `swr`, `sass`, `clsx`, `lucide-react`.
- Initialize Storybook.
- Set up global SCSS variables, mixins (rem-calc, breakpoints), and base styles in `src/frontend/src/styles`.
- Configure the basic App router and API client utility with a global SWR configuration.

### ✓ Step 2: Implement Core Components
Build the fundamental UI building blocks.

- Implement `Button`, `TextField`, `Dropdown`, and `Badge` components in `src/frontend/src/components/core` and `forms`.
- Each component will include `.tsx`, `.module.scss`, `.resources.ts`, and `.stories.tsx`.
- Ensure accessibility (ARIA labels, keyboard nav) and design token usage.

### ✓ Step 3: Layout & Authentication
Create the main application shell.

- Implement `NavigationBar` with role-based links (Employee vs Admin).
- Implement `BaseLayout` for authenticated routes.
- Create a basic `SignInPage` and integrate with the Auth API.

### ✓ Step 4: My Leave Feature
Implement personal leave management.

- Create `LeaveTypeBadge` and `LeaveDataTable` components.
- Build the `MyLeavePage` showing the current user's leave registrations, using `useSWR` for data fetching.
- Implement the `RegisterLeave` modal and form using `react-hook-form`.
- Connect to `ListMyLeave`, `RegisterMyLeave`, `EditMyLeave`, and `DeleteMyLeave` API endpoints, using SWR mutations for revalidation.

### ✓ Step 5: Calendar Overview Feature
Develop the team-wide calendar view.

- Implement `CalendarGrid`, `CalendarDateCell`, and `EmployeeLeaveChip` components.
- Create the `FilterBar` for filtering by employee or leave type.
- Build the `CalendarOverviewPage` and connect to the `/api/calendar` endpoint using `useSWR`.
- Ensure the calendar remains interactive while data is revalidating in the background.

### ✓ Step 6: Leave Management Feature (Admin)
Implement administrative capabilities.

- Build the `LeaveManagementPage` with the ability to view, edit, and delete any employee's leave, using `useSWR` for data management.
- Reuse `LeaveDataTable` and `RegisterLeave` form with admin-specific permissions.
- Connect to Admin API endpoints.

### ✓ Step 7: Final Polish & Quality Assurance
Final polish and validation.

- Conduct a full accessibility audit (WCAG 2.2 AA).
- Verify responsive behavior across all screens, ensuring horizontal scroll for tables on mobile.
- Ensure all components have complete Storybook stories with example data.
- Verify the full build and correct API communication.
- Run all tests to ensure they pass before final PR.