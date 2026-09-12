import { Box, Typography, Card, CardContent, Grid, Avatar, Chip } from '@mui/material';
import { 
  EmojiEvents as TrophyIcon, 
  People as PeopleIcon, 
  TrendingUp as TrendingUpIcon 
} from '@mui/icons-material';

interface HomeViewProps {
  user: any;
}

export default function HomeView({ user }: HomeViewProps) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ color: 'white', mb: 4 }}>
        Welcome back, {user?.username || 'Player'}!
      </Typography>

      <Grid container spacing={3}>
        {/* User Stats Card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ 
            backgroundColor: '#16213e', 
            color: 'white',
            height: '100%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ 
                  bgcolor: '#e94560', 
                  width: 56, 
                  height: 56,
                  mr: 2,
                  fontSize: '1.5rem'
                }}>
                  {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="h6">{user?.username || 'Player'}</Typography>
                  <Chip 
                    label={`Level ${user?.level || 1}`} 
                    size="small" 
                    sx={{ 
                      backgroundColor: 'rgba(233, 69, 96, 0.2)',
                      color: '#e94560',
                      fontWeight: 'bold'
                    }} 
                  />
                </Box>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Experience Points
                </Typography>
                <Typography variant="h5" sx={{ color: '#4ecca3' }}>
                  {user?.experience?.toLocaleString() || '0'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Rank Card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ 
            backgroundColor: '#16213e', 
            color: 'white',
            height: '100%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrophyIcon sx={{ fontSize: 40, color: '#ffd700', mr: 2 }} />
                <Typography variant="h6">Current Rank</Typography>
              </Box>
              
              <Typography variant="h3" sx={{ color: '#ffd700', fontWeight: 'bold' }}>
                {user?.rank_score || '—'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Rank Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Friends Card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ 
            backgroundColor: '#16213e', 
            color: 'white',
            height: '100%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon sx={{ fontSize: 40, color: '#4ecca3', mr: 2 }} />
                <Typography variant="h6">Friends</Typography>
              </Box>
              
              <Typography variant="h3" sx={{ color: '#4ecca3', fontWeight: 'bold' }}>
                {user?.friend_count || '0'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Online Friends
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ 
            backgroundColor: '#16213e', 
            color: 'white',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recent Activity
              </Typography>
              
              <Box sx={{ 
                p: 2, 
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 1,
                textAlign: 'center'
              }}>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  No recent activity to display
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1 }}>
                  Start playing to see your match history here!
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}