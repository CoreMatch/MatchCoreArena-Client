import { useState, useEffect } from 'react';
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
  Divider
} from '@mui/material';
import { 
  Home, 
  Group, 
  Leaderboard, 
  Logout, 
  Person, 
  Menu as MenuIcon,
  ChevronLeft
} from '@mui/icons-material';
import LoginView from './components/LoginView';
import FriendList from './components/FriendList';
import RankingView from './components/RankingView';
import HomeView from './components/HomeView';

const drawerWidth = 240;

interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'friends', label: 'Friends', icon: Group },
  { id: 'rankings', label: 'Rankings', icon: Leaderboard },
];

export default function App() {
  const [selectedView, setSelectedView] = useState<string>('home');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token');
    if (token) {
      // Validate token and get user info
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      // TODO: Implement token validation and user info fetch
      // For now, just check if token exists
      const token = localStorage.getItem('access_token');
      if (token) {
        setIsLoggedIn(true);
        // TODO: Fetch user info from /api/users/me
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setIsLoggedIn(false);
    }
  };

  const handleLoginSuccess = (tokenData: any) => {
    localStorage.setItem('access_token', tokenData.access_token);
    localStorage.setItem('refresh_token', tokenData.refresh_token);
    setIsLoggedIn(true);
    // TODO: Fetch user info
    setSelectedView('home');
  };

  const handleLogout = async () => {
    try {
      // TODO: Call /api/auth/logout
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setIsLoggedIn(false);
      setUser(null);
      setSelectedView('home');
    } catch (error) {
      console.error('Logout failed:', error);
    }
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
      case 'friends':
        return <FriendList />;
      case 'rankings':
        return <RankingView />;
      default:
        return <HomeView user={user} />;
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: '#1a1a2e',
          color: 'white'
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
              <IconButton
                color="inherit"
                onClick={handleMenuOpen}
                sx={{ p: 0 }}
              >
                <Avatar sx={{ bgcolor: '#e94560' }}>
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
                      backgroundColor: '#16213e',
                      color: 'white',
                      minWidth: 200,
                    }
                  }
                }}
              >
                <MenuItem onClick={() => { setSelectedView('profile'); handleMenuClose(); }}>
                  <ListItemIcon>
                    <Person fontSize="small" sx={{ color: 'white' }} />
                  </ListItemIcon>
                  Profile
                </MenuItem>
                <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <Logout fontSize="small" sx={{ color: 'white' }} />
                  </ListItemIcon>
                  Logout
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
              backgroundColor: '#16213e',
              color: 'white',
              marginTop: '64px', // Height of AppBar
            },
          }}
        >
          <Box sx={{ overflow: 'auto', marginTop: '16px' }}>
            <List>
              {navItems.map((item) => (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton
                    selected={selectedView === item.id}
                    onClick={() => setSelectedView(item.id)}
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(233, 69, 96, 0.2)',
                        '&:hover': {
                          backgroundColor: 'rgba(233, 69, 96, 0.3)',
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                      <item.icon />
                    </ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                </ListItem>
              ))}
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
          backgroundColor: '#0f3460',
          minHeight: '100vh',
        }}
      >
        {renderContent()}
      </Box>
    </Box>
  );
}