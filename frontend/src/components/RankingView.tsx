import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Refresh as RefreshIcon,
  Star as StarIcon
} from '@mui/icons-material';

interface RankingEntry {
  id: number;
  user_uid: number;
  rank_type: string;
  score: number;
  rank_position: number;
  season: number;
  updated_at: string;
  username?: string;
  level?: number;
}

export default function RankingView() {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [myRanking, setMyRanking] = useState<RankingEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankType, setRankType] = useState('1v1');
  const [season, setSeason] = useState(1);
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    fetchRankings();
  }, [rankType, season, limit]);

  const fetchRankings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Fetch top rankings
      const rankingsResponse = await fetch(
        `/api/rankings/${rankType}?limit=${limit}&season=${season}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const rankingsData = await rankingsResponse.json();

      if (!rankingsResponse.ok) {
        throw new Error(rankingsData.message || 'Failed to fetch rankings');
      }

      setRankings(rankingsData.data || []);

      // Fetch my ranking
      const myRankResponse = await fetch(
        `/api/rankings/me?type=${rankType}&season=${season}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (myRankResponse.ok) {
        const myRankData = await myRankResponse.json();
        setMyRanking(myRankData.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load rankings');
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (position: number) => {
    switch (position) {
      case 1: return '#ffd700'; // Gold
      case 2: return '#c0c0c0'; // Silver
      case 3: return '#cd7f32'; // Bronze
      default: return 'rgba(255,255,255,0.7)';
    }
  };

  const getRankIcon = (position: number) => {
    if (position <= 3) {
      return <TrophyIcon sx={{ color: getRankColor(position), mr: 1 }} />;
    }
    return null;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#e94560' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white' }}>
          Rankings
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Type</InputLabel>
            <Select
              value={rankType}
              label="Type"
              onChange={(e) => setRankType(e.target.value)}
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.3)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e94560',
                },
                '& .MuiSvgIcon-root': {
                  color: 'white',
                },
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      backgroundColor: '#16213e',
                      color: 'white',
                    },
                  }
                }
              }}
            >
              <MenuItem value="1v1">1v1</MenuItem>
              <MenuItem value="2v2">2v2</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl sx={{ minWidth: 100 }}>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Season</InputLabel>
            <Select
              value={season}
              label="Season"
              onChange={(e) => setSeason(e.target.value as number)}
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.3)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e94560',
                },
                '& .MuiSvgIcon-root': {
                  color: 'white',
                },
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      backgroundColor: '#16213e',
                      color: 'white',
                    },
                  }
                }
              }}
            >
              <MenuItem value={1}>Season 1</MenuItem>
              <MenuItem value={2}>Season 2</MenuItem>
              <MenuItem value={3}>Season 3</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl sx={{ minWidth: 100 }}>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Limit</InputLabel>
            <Select
              value={limit}
              label="Limit"
              onChange={(e) => setLimit(e.target.value as number)}
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.3)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e94560',
                },
                '& .MuiSvgIcon-root': {
                  color: 'white',
                },
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      backgroundColor: '#16213e',
                      color: 'white',
                    },
                  }
                }
              }}
            >
              <MenuItem value={50}>Top 50</MenuItem>
              <MenuItem value={100}>Top 100</MenuItem>
              <MenuItem value={200}>Top 200</MenuItem>
              <MenuItem value={500}>Top 500</MenuItem>
            </Select>
          </FormControl>
          
          <IconButton 
            onClick={fetchRankings} 
            sx={{ color: 'white' }}
            title="Refresh"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(211, 47, 47, 0.1)', color: '#ff6b6b' }}>
          {error}
        </Alert>
      )}

      {/* My Ranking Card */}
      {myRanking && (
        <Card sx={{ 
          backgroundColor: '#16213e', 
          color: 'white',
          mb: 3,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          border: '2px solid #e94560'
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <StarIcon sx={{ color: '#ffd700', mr: 1, fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Your Ranking
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {rankType} • Season {season}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h4" sx={{ 
                  color: getRankColor(myRanking.rank_position),
                  fontWeight: 'bold'
                }}>
                  #{myRanking.rank_position}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Score: {myRanking.score.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Rankings Table */}
      <Card sx={{ 
        backgroundColor: '#16213e', 
        color: 'white',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <TableContainer component={Paper} sx={{ backgroundColor: 'transparent' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontWeight: 'bold',
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                  Rank
                </TableCell>
                <TableCell sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontWeight: 'bold',
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                  Player
                </TableCell>
                <TableCell sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontWeight: 'bold',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  textAlign: 'right'
                }}>
                  Score
                </TableCell>
                <TableCell sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontWeight: 'bold',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  textAlign: 'right'
                }}>
                  Level
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rankings.map((entry) => (
                <TableRow 
                  key={entry.id}
                  sx={{ 
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    },
                    '&:last-child td': {
                      borderBottom: 0
                    }
                  }}
                >
                  <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getRankIcon(entry.rank_position)}
                      <Typography sx={{ 
                        color: getRankColor(entry.rank_position),
                        fontWeight: 'bold'
                      }}>
                        {entry.rank_position}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ 
                        bgcolor: '#e94560', 
                        width: 32, 
                        height: 32,
                        mr: 1,
                        fontSize: '0.875rem'
                      }}>
                        {entry.username?.charAt(0)?.toUpperCase() || 'U'}
                      </Avatar>
                      <Typography>
                        {entry.username || `User ${entry.user_uid}`}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    textAlign: 'right',
                    fontWeight: 'bold'
                  }}>
                    {entry.score.toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    textAlign: 'right'
                  }}>
                    <Chip 
                      label={`Lv. ${entry.level || '?'}`} 
                      size="small" 
                      sx={{ 
                        backgroundColor: 'rgba(233, 69, 96, 0.2)',
                        color: '#e94560',
                      }} 
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}