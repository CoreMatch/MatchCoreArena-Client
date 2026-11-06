import { useState, useEffect } from 'react';
import { History, LogOut, Settings, Swords, Trophy, User, Users } from 'lucide-react';
import { Menu, MenuItem, MenuSeparator, Icon } from '@ha/ui';
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
  icon: typeof Swords;
}

const navItems: NavItem[] = [
  { id: 'play', label: t().nav.play, icon: Swords },
  { id: 'matches', label: t().nav.career, icon: History },
  { id: 'rankings', label: t().nav.rankings, icon: Trophy },
  { id: 'friends', label: t().nav.friends, icon: Users },
  { id: 'settings', label: t().nav.settings, icon: Settings },
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
        <aside className="fixed inset-y-0 left-0 z-10 flex w-56 flex-col border-r border-edge bg-panel">
          <div className="border-b border-edge px-5 py-5">
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-ink">
              MatchCore<span className="text-accent">Arena</span>
            </div>
            <div className="mt-0.5 text-[11px] uppercase tracking-wider text-ink-faint">
              Competitive Client
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-3">
            {navItems.map((item) => {
              const selected = selectedView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedView(item.id)}
                  className={`flex w-full items-center gap-3 border-l-2 px-5 py-2.5 text-sm font-semibold
                    transition-colors duration-150 ease-standard
                    ${selected
                      ? 'border-accent bg-raised text-ink'
                      : 'border-transparent text-ink-muted hover:bg-raised/60 hover:text-ink'}`}
                >
                  <Icon as={item.icon} className={selected ? 'text-accent' : ''} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User block */}
          <div className="border-t border-edge p-3">
            <Menu
              trigger={
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-150 hover:bg-raised"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent font-bold text-on-accent">
                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {user?.username || 'Player'}
                    </span>
                    <span className="block truncate font-mono text-xs text-ink-faint">
                      #{user?.uid ?? '—'}
                    </span>
                  </span>
                </button>
              }
            >
              <MenuItem onSelect={() => setSelectedView('settings')}>
                <Icon as={User} size={16} />
                {t().common.profile}
              </MenuItem>
              <MenuSeparator />
              <MenuItem onSelect={handleLogout}>
                <Icon as={LogOut} size={16} />
                {t().common.logout}
              </MenuItem>
            </Menu>
          </div>
        </aside>
      )}

      {/* Main content — single column */}
      <main className={`flex-1 overflow-y-auto ${isLoggedIn ? 'ml-56' : ''}`}>
        <div className="mx-auto max-w-5xl px-8 py-8">{renderContent()}</div>
      </main>
    </div>
  );
}
