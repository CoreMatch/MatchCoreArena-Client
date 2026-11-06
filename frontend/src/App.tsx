import { useState, useEffect } from 'react';
import { LogOut, User } from 'lucide-react';
import { Asset, Menu, MenuItem, MenuSeparator, Icon, type AssetId } from '@ha/ui';
import { GetCurrentUser, Logout as LogoutAPI, SetToken } from '../wailsjs/go/main/App';
import { t } from './i18n';
import { authFetch, SESSION_EXPIRED_EVENT } from './session';
import LoginView, { type TokenData } from './components/LoginView';
import FriendList from './components/FriendList';
import RankingView from './components/RankingView';
import PlayView from './components/PlayView';
import SettingsView from './components/SettingsView';
import MyMatchesView from './components/MyMatchesView';
import type { UserProfile } from './types';

interface NavItem {
  id: string;
  label: string;
  icon: AssetId;
}

const navItems: NavItem[] = [
  { id: 'play', label: t().nav.play, icon: 'icon-play' },
  { id: 'matches', label: t().nav.career, icon: 'icon-career-history' },
  { id: 'rankings', label: t().nav.rankings, icon: 'icon-rankings' },
  { id: 'friends', label: t().nav.friends, icon: 'icon-friends' },
  { id: 'settings', label: t().nav.settings, icon: 'icon-settings' },
];

export default function App() {
  const [selectedView, setSelectedView] = useState<string>('play');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  // When set, Career opens this match's detail as soon as it renders
  // (deep navigation from Play's settled match / recent matches).
  const [careerFocusMatchId, setCareerFocusMatchId] = useState<number | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token');
    if (token) {
      // Restore token to Go backend on refresh
      SetToken(token).then(() => {
        setIsLoggedIn(true);
        fetchUserProfile();
      }).catch(err => {
        console.error('Failed to restore session:', err);
        handleLogout();
      });
    }
  }, []);

  useEffect(() => {
    // Session expiry (refresh failed) returns the user to the login screen.
    const onSessionExpired = () => {
      handleLogout();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  const fetchUserProfile = async () => {
    try {
      // authFetch transparently refreshes the access token on 401.
      const resp = await authFetch(() => GetCurrentUser());
      const userData = resp?.data ?? resp;
      setUser(userData);
    } catch (error) {
      // Non-auth failures (e.g. the profile row is not provisioned until the
      // first settled match) keep the session and render the empty profile.
      console.error('Failed to fetch user profile:', error);
      setUser(null);
    }
  };

  const handleLoginSuccess = (tokenData: TokenData) => {
    localStorage.setItem('access_token', tokenData.access_token);
    localStorage.setItem('refresh_token', tokenData.refresh_token);
    setIsLoggedIn(true);
    fetchUserProfile();
    setSelectedView('play');
  };

  const handleLogout = async () => {
    try {
      await LogoutAPI();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setIsLoggedIn(false);
      setUser(null);
      setSelectedView('play');
    }
  };

  const handleViewMatch = (id: number) => {
    setCareerFocusMatchId(id);
    setSelectedView('matches');
  };

  const renderContent = () => {
    if (!isLoggedIn) {
      return <LoginView onLoginSuccess={handleLoginSuccess} />;
    }

    switch (selectedView) {
      case 'matches':
        return (
          <MyMatchesView
            userUid={user?.uid}
            focusMatchId={careerFocusMatchId}
            onConsumeFocus={() => setCareerFocusMatchId(null)}
            onFindMatch={() => setSelectedView('play')}
          />
        );
      case 'rankings':
        return <RankingView winsCount={user?.wins_count} />;
      case 'friends':
        return <FriendList />;
      case 'settings':
        return <SettingsView user={user} />;
      default:
        return (
          <PlayView
            user={user}
            onViewMatch={handleViewMatch}
            onOpenRankings={() => setSelectedView('rankings')}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-base text-ink">
      {/* Persistent sidebar */}
      {isLoggedIn && (
        <aside className="fixed inset-y-0 left-0 z-10 flex w-64 flex-col border-r border-edge bg-panel">
          <div className="flex items-center gap-3 border-b border-edge px-6 py-6">
            <Asset id="brand-mca" size={34} className="text-accent" />
            <div className="text-sm font-bold uppercase tracking-[0.14em] text-ink">
              MatchCore<span className="text-accent">Arena</span>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            {navItems.map((item) => {
              const selected = selectedView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedView(item.id)}
                  className={`flex w-full items-center gap-3.5 border-l-2 px-6 py-3 text-base font-semibold
                    transition-colors duration-150 ease-standard
                    ${selected
                      ? 'border-accent bg-raised text-ink'
                      : 'border-transparent text-ink-muted hover:bg-raised/60 hover:text-ink'}`}
                >
                  <Asset id={item.icon} size={20} className={selected ? 'text-accent' : ''} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User block */}
          <div className="border-t border-edge p-4">
            <Menu
              trigger={
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors duration-150 hover:bg-raised"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent text-base font-bold text-on-accent">
                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold text-ink">
                      {user?.username || 'Player'}
                    </span>
                    <span className="block truncate font-mono text-sm text-ink-faint">
                      #{user?.uid ?? '—'}
                    </span>
                  </span>
                </button>
              }
            >
              <MenuItem onSelect={() => setSelectedView('settings')}>
                <Icon as={User} size={18} />
                {t().common.profile}
              </MenuItem>
              <MenuSeparator />
              <MenuItem onSelect={handleLogout}>
                <Icon as={LogOut} size={18} />
                {t().common.logout}
              </MenuItem>
            </Menu>
          </div>
        </aside>
      )}

      {/* Main content — single column, generous margins */}
      <main className={`flex-1 overflow-y-auto ${isLoggedIn ? 'ml-64' : ''}`}>
        <div className="mx-auto max-w-6xl px-12 py-10">{renderContent()}</div>
      </main>
    </div>
  );
}
