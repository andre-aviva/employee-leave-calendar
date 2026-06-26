import { Outlet, Navigate } from 'react-router-dom';
import { NavigationBar } from '../NavigationBar/NavigationBar';
import { useAuth } from '../../../context/AuthContext';
import styles from './BaseLayout.module.scss';

export function BaseLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <div className={styles.container}>
      <NavigationBar userName={user.name} role={user.role} />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
