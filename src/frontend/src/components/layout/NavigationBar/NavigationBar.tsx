import { NavLink, Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import styles from './NavigationBar.module.scss';
import { resources } from './NavigationBar.resources';

export type NavigationBarProps = {
  userName: string;
  role: 'Employee' | 'Admin';
  className?: string;
};

export function NavigationBar({ userName, role, className }: NavigationBarProps) {
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = () => {
    localStorage.removeItem('auth_token');
    navigate('/sign-in');
  };

  return (
    <nav className={clsx(styles.container, className)} data-test="NavBar">
      <div className={styles.bar}>
        <div className={styles.left}>
          <Link to="/calendar" className={styles.logo} data-test="NavBar_AppName">
            <div className={styles.logoMark}>ELC</div>
            <span className={styles.appName}>{resources.appName}</span>
          </Link>

          <div className={styles.navLinks}>
            <NavLink
              to="/calendar"
              className={({ isActive }) => clsx(styles.navLink, isActive && styles['navLink--active'])}
              data-test="NavBar_CalendarLink"
            >
              {resources.calendarOverview}
            </NavLink>
            <NavLink
              to="/my-leave"
              className={({ isActive }) => clsx(styles.navLink, isActive && styles['navLink--active'])}
              data-test="NavBar_MyLeaveLink"
            >
              {resources.myLeave}
            </NavLink>
            {role === 'Admin' && (
              <NavLink
                to="/admin/leave"
                className={({ isActive }) => clsx(styles.navLink, isActive && styles['navLink--active'])}
                data-test="NavBar_LeaveManagementLink"
              >
                {resources.leaveManagement}
              </NavLink>
            )}
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.userArea}>
            <div className={styles.avatar}>{getInitials(userName)}</div>
            <span className={styles.userName} data-test="NavBar_UserName">{userName}</span>
            <div className={styles.divider} />
            <button 
              type="button" 
              className={styles.signOut} 
              onClick={handleSignOut}
              data-test="NavBar_SignOutButton"
            >
              {resources.signOut}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
