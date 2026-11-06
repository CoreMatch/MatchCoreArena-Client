import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Refresh as RefreshIcon,
  Leaderboard as LeaderboardIcon,
} from '@mui/icons-material';
import { GetTopRankings } from '../../wailsjs/go/main/App';
import { authFetch } from '../session';
import { t, loadErrorMessage } from '../i18n';
import { tokens } from '../theme';
import RankCard from './RankCard';
import { EmptyState, ErrorState, LoadingList } from './StateViews';

interface RankingEntry {
  id: number;
  user_uid: number;
  rank_type: string;
  score: number;
  rank_position: number;
  season: number;
  updated_at: string;
}

interface RankingViewProps {
  winsCount?: number;
}

export default function RankingView({ winsCount }: RankingViewProps) {
  const msg = t();
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
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
      // Fetch top rankings using Go bindings (authFetch refreshes expired tokens)
      const rankingsResp = await authFetch(() => GetTopRankings(rankType, limit, season));
      const response = rankingsResp?.data ?? rankingsResp;
      // New server format: {rankings: [...], total_count: N}
      // Legacy fallback: plain array
      if (Array.isArray(response)) {
        setRankings(response);
        setTotalCount(response.length);
      } else {
        setRankings(response?.rankings ?? []);
        setTotalCount(response?.total_count ?? 0);
      }
    } catch {
      setError(loadErrorMessage(t().common.dataRankings));
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (position: number) => {
    switch (position) {
      case 1: return tokens.color.gold;
      case 2: return tokens.color.silver;
      case 3: return tokens.color.bronze;
      default: return 'text.secondary';
    }
  };

  const getRankIcon = (position: number) => {
    if (position <= 3) {
      return <TrophyIcon sx={{ color: getRankColor(position), mr: 1 }} />;
    }
    return null;
  };

  const topLabel = (count: number) => msg.rankings.topTemplate.replace('{count}', String(count));
  const playerLabel = (uid: number) => msg.rankings.playerTemplate.replace('{uid}', String(uid));

  if (loading) {
    return (
      <Box>
        <Skeleton width={220} height={48} sx={{ mb: 3 }} />
        <Box sx={{ mb: 3 }}>
          <Card>
            <LoadingList rows={2} />
          </Card>
        </Box>
        <Card>
          <LoadingList rows={8} rowHeight={48} />
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {msg.nav.rankings}
          {totalCount > 0 && ` (${totalCount})`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 120 }} size="small">
            <InputLabel>{msg.rankings.type}</InputLabel>
            <Select
              value={rankType}
              label={msg.rankings.type}
              onChange={(e) => setRankType(e.target.value)}
            >
              <MenuItem value="1v1">1v1</MenuItem>
              <MenuItem value="2v2">2v2</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 100 }} size="small">
            <InputLabel>{msg.rankings.season}</InputLabel>
            <Select
              value={season}
              label={msg.rankings.season}
              onChange={(e) => setSeason(e.target.value as number)}
            >
              <MenuItem value={1}>{msg.rankCard.season} 1</MenuItem>
              <MenuItem value={2}>{msg.rankCard.season} 2</MenuItem>
              <MenuItem value={3}>{msg.rankCard.season} 3</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 100 }} size="small">
            <InputLabel>{msg.rankings.limit}</InputLabel>
            <Select
              value={limit}
              label={msg.rankings.limit}
              onChange={(e) => setLimit(e.target.value as number)}
            >
              <MenuItem value={50}>{topLabel(50)}</MenuItem>
              <MenuItem value={100}>{topLabel(100)}</MenuItem>
              <MenuItem value={200}>{topLabel(200)}</MenuItem>
              <MenuItem value={500}>{topLabel(500)}</MenuItem>
            </Select>
          </FormControl>

          <IconButton onClick={fetchRankings} title={msg.common.refresh}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* My Rank Card (A4) */}
      <Box sx={{ mb: 3 }}>
        <RankCard rankType={rankType} season={season} winsCount={winsCount} />
      </Box>

      {/* Rankings Table */}
      {error ? (
        <Card>
          <ErrorState message={error} onRetry={fetchRankings} />
        </Card>
      ) : (
        <Card>
          <TableContainer component={Paper} sx={{ backgroundColor: 'transparent' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 'bold',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {msg.rankings.colRank}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 'bold',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {msg.rankings.colPlayer}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 'bold',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      textAlign: 'right',
                    }}
                  >
                    {msg.rankings.colScore}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rankings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ borderBottom: 'none' }}>
                      <EmptyState
                        icon={<LeaderboardIcon />}
                        title={msg.rankings.emptyTitle}
                        hint={msg.rankings.emptyHint}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rankings.map((entry) => (
                    <TableRow
                      key={entry.id}
                      sx={{
                        '&:last-child td': {
                          borderBottom: 0,
                        },
                      }}
                    >
                      <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getRankIcon(entry.rank_position)}
                          <Typography sx={{ color: getRankColor(entry.rank_position), fontWeight: 'bold' }}>
                            {entry.rank_position}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, mr: 1, fontSize: '0.875rem' }}>
                            P
                          </Avatar>
                          <Typography>{playerLabel(entry.user_uid)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell
                        sx={{
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          textAlign: 'right',
                          fontWeight: 'bold',
                        }}
                      >
                        {entry.score.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Box>
  );
}
