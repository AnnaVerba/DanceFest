import { Outlet } from 'react-router-dom';
import PublicTopBar from './PublicTopBar';
import CabinetSidebar from './CabinetSidebar';
import { getSession } from '../lib/auth';
import styles from './AppShell.module.css';

// The top bar is on every page. A signed-in user also gets the fixed
// left-hand nav rail everywhere; a logged-out visitor sees no rail.
export default function AppShell() {
  const signedIn = !!getSession();

  return (
    <>
      <PublicTopBar />
      {signedIn ? (
        <div className={styles.withNav}>
          <aside className={styles.rail}>
            <CabinetSidebar />
          </aside>
          <div className={styles.body}>
            <Outlet />
          </div>
        </div>
      ) : (
        <Outlet />
      )}
    </>
  );
}
