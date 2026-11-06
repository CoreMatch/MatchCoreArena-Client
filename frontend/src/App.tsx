import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  CssBaseline,
} from '@mui/material';
import { ThemeProvider, alpha } from '@mui/material/styles';
import {
  PlayCircle,
  Group,
  Leaderboard,
  Logout,
  Person,
  Menu as MenuIcon,
  ChevronLeft,
  History,
  Settings,
} from '@mui/icons-material';
import { GetCurrentUser, Logout as LogoutAPI, SetToken } from '../wailsjs/go/main/App';
import { t } from './i18n';
import { authFetch, SESSION_EXPIRED_EVENT } from './session';
import { buildTheme, type ThemeMode } from './theme';
import LoginView, { type TokenData } from './components/LoginView';
import FriendList from './components/FriendList';
import RankingView from './components/RankingView';
import PlayView from './components/PlayView';
import SettingsView from './components/SettingsView';
import MyMatchesView from './components/MyMatchesView';
import type { UserProfile } from './types';

const drawerWidth = 240;
const THEME_MODE_KEY = 'theme_mode';

interface NavItem {
  id: string;
  label: string;
  icon: typeof PlayCircle;
}

const navItems: NavItem[] = [
  { id: 'play', label: t().nav.play, icon: PlayCircle },
  { id: 'matches', label: t().nav.career, icon: History },
  { id: 'rankings', label: t().nav.rankings, icon: Leaderboard },
  { id: 'friends', label: t().nav.friends, icon: Group },
  { id: 'settings', label: t().nav.settings, icon: Settings },
];

function initialThemeMode(): ThemeMode {
  const stored = localStorage.getItem(THEME_MODE_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

export default function App() {
  const [selectedView, setSelectedView] = useState<string>('play');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialThemeMode);
  // When set, Career opens this match's detail as soon as it renders
  // (deep navigation from Play's settled match / recent matches).
  const [careerFocusMatchId, setCareerFocusMatchId] = useState<number | null>(null);

  const theme = useMemo(() => buildTheme(themeMode), [themeMode]);

  const changeThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem(THEME_MODE_KEY, mode);
  };

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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
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
        return <SettingsView user={user} themeMode={themeMode} onThemeModeChange={changeThemeMode} />;
      default:
        return <PlayView user={user} onViewMatch={handleViewMatch} />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        {/* App Bar */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            backgroundColor: 'background.paper',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar>
            {isLoggedIn && (
              <IconButton
                color="inherit"
                aria-label="toggle drawer"
                onClick={toggleDrawer}
                edge="start"
                sx={{ mr: 2 }}
              >
                {drawerOpen ? <ChevronLeft /> : <MenuIcon />}
              </IconButton>
            )}
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              MatchCoreArena
            </Typography>
            {isLoggedIn && (
              <>
                <IconButton color="inherit" onClick={handleMenuOpen} sx={{ p: 0 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  slotProps={{
                    paper: {
                      sx: {
                        minWidth: 200,
                        border: '1px solid',
                        borderColor: 'divider',
                      },
                    },
                  }}
                >
                  <MenuItem onClick={() => { setSelectedView('settings'); handleMenuClose(); }}>
                    <ListItemIcon>
                      <Person fontSize="small" sx={{ color: 'text.primary' }} />
                    </ListItemIcon>
                    {t().common.profile}
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <Logout fontSize="small" sx={{ color: 'text.primary' }} />
                    </ListItemIcon>
                    {t().common.logout}
                  </MenuItem>
                </Menu>
              </>
            )}
          </Toolbar>
        </AppBar>

        {/* Sidebar */}
        {isLoggedIn && (
          <Drawer
            variant="persistent"
            open={drawerOpen}
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
                backgroundColor: 'background.paper',
                color: 'text.primary',
                borderRight: '1px solid',
                borderColor: 'divider',
                marginTop: '64px', // Height of AppBar
              },
            }}
          >
            <Box sx={{ overflow: 'auto', mt: 2 }}>
              <List>
                {navItems.map((item) => {
                  const selected = selectedView === item.id;
                  return (
                    <ListItem key={item.id} disablePadding>
                      <ListItemButton
                        selected={selected}
                        onClick={() => setSelectedView(item.id)}
                        sx={{
                          '&.Mui-selected': {
                            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.16),
                            '&:hover': {
                              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.24),
                            },
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 40,
                            color: selected ? 'primary.main' : 'text.secondary',
                          }}
                        >
                          <item.icon />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          slotProps={{
                            primary: {
                              sx: {
                                color: selected ? 'primary.main' : 'text.primary',
                                fontWeight: selected ? 600 : 400,
                              },
                            },
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          </Drawer>
        )}

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            marginTop: '64px', // Height of AppBar
            marginLeft: isLoggedIn && drawerOpen ? `${drawerWidth}px` : 0,
            transition: 'margin-left 0.3s ease',
            backgroundColor: 'background.default',
            minHeight: '100vh',
          }}
        >
          {renderContent()}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
