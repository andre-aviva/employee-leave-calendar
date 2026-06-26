import { createBrowserRouter, Navigate } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/calendar" replace />,
  },
  {
    path: '/sign-in',
    async lazy() {
      const { SignInPage } = await import('../pages/SignIn/SignInPage');
      return { Component: SignInPage };
    },
  },
  {
    path: '/',
    async lazy() {
      const { BaseLayout } = await import('../components/layout/BaseLayout/BaseLayout');
      return { Component: BaseLayout };
    },
    children: [
      {
        path: 'calendar',
        async lazy() {
          const { CalendarOverviewPage } = await import('../pages/Calendar/CalendarOverviewPage');
          return { Component: CalendarOverviewPage };
        },
      },
      {
        path: 'my-leave',
        async lazy() {
          const { MyLeavePage } = await import('../pages/MyLeave/MyLeavePage');
          return { Component: MyLeavePage };
        },
      },
      {
        path: 'admin/leave',
        async lazy() {
          const { AdminLeavePage } = await import('../pages/AdminLeave/AdminLeavePage');
          return { Component: AdminLeavePage };
        },
      },
    ],
  },
]);
