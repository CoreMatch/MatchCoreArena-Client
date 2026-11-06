import { useState, useEffect, useCallback } from 'react';
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
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
} from '@mui/icons-material';
import { GetMyMatches, GetMatch } from '../../wailsjs/go/main/App';
import { t } from '../i18n';

interface MatchSummary {
  id: number;
  match_type: string;
  source: string;
  map_name: string;
  winner_team_id: string;
  survival_rate: number;
  duration_seconds: number;
  started_at: string;
  finished_at: string;
  created_at: string;
}

interface ParticipantDetail {
  uid: number;
  team_id: string;
  is_winner: boolean;
  is_draw: boolean;
  rank_score_before: number;
  rank_score_delta: number;
  survival_time: number;
  kills: number;
  deaths: number;
}

interface MatchDetail extends MatchSummary {
  participants?: ParticipantDetail[];
}

function formatTime(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function resultLabel(p: ParticipantDetail): { text: string; color: 'success' | 'error' | 'default' } {
  const msg = t().myMatches;
  if (p.is_draw) return { text: msg.resultDraw, color: 'default' };
  if (p.is_winner) return { text: msg.resultWin, color: 'success' };
  return { text: msg.resultLose, color: 'error' };
}

export default function MyMatchesView() {
  const msg = t();

  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await GetMyMatches(pageNum, pageSize);
      const data = resp?.data ?? resp;
      setMatches(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message || String(err) : String(err)) || t().myMatches.loadError);
    } finally {
      setLoading(false);
    }
  }, [pageNum, pageSize]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const openDetail = async (id: number) => {
    setDetail({ id } as MatchDetail);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const resp = await GetMatch(id);
      const data = (resp?.data ?? resp) as MatchDetail;
      setDetail(data);
    } catch (err: unknown) {
      setDetailError(
        (err instanceof Error ? err.message || String(err) : String(err)) || t().myMatches.detailLoadError,
      );
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setDetailError(null);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageNum(1);
  };

  const winnerLabel = (winnerTeamId: string) =>
    winnerTeamId ? `${msg.common.team} ${winnerTeamId}` : msg.common.draw;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ color: 'white' }}>
          {msg.myMatches.title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 110 }}>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>{msg.myMatches.pageSize}</InputLabel>
            <Select
              value={pageSize}
              label={msg.myMatches.pageSize}
              onChange={(e) => handlePageSizeChange(e.target.value as number)}
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                '& .MuiSvgIcon-root': { color: 'white' },
              }}
              MenuProps={{
                slotProps: {
                  paper: { sx: { backgroundColor: '#16213e', color: 'white' } },
                },
              }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={fetchMatches} sx={{ color: 'white' }} title={msg.common.refresh}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 2, backgroundColor: 'rgba(2, 136, 209, 0.12)', color: '#8ecdf5' }}>
        {msg.readOnly.matchesNotice}
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(211, 47, 47, 0.1)', color: '#ff6b6b' }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <CircularProgress sx={{ color: '#e94560' }} />
        </Box>
      ) : (
        <Card sx={{ backgroundColor: '#16213e', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <TableContainer component={Paper} sx={{ backgroundColor: 'transparent' }}>
            <Table>
              <TableHead>
                <TableRow>
                  {msg.myMatches.headers.map((h) => (
                    <TableCell
                      key={h}
                      sx={{
                        color: 'rgba(255,255,255,0.7)',
                        fontWeight: 'bold',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {matches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ borderBottom: 'none' }}>
                      <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                          {msg.myMatches.emptyTitle}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          {msg.myMatches.emptyHint}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  matches.map((m) => (
                    <TableRow
                      key={m.id}
                      hover
                      onClick={() => openDetail(m.id)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#e94560', fontWeight: 'bold' }}>
                        #{m.id}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <Chip label={m.match_type} size="small" sx={{ backgroundColor: 'rgba(233, 69, 96, 0.2)', color: '#e94560' }} />
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{m.source || '—'}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{m.map_name || '—'}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{winnerLabel(m.winner_team_id)}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        {formatDuration(m.duration_seconds)}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        {formatTime(m.finished_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, p: 2 }}>
            <IconButton
              onClick={() => setPageNum((p) => Math.max(1, p - 1))}
              disabled={pageNum <= 1}
              sx={{ color: 'white' }}
              title={msg.myMatches.previousPage}
            >
              <PrevIcon />
            </IconButton>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {msg.myMatches.page} {pageNum}
            </Typography>
            <IconButton
              onClick={() => setPageNum((p) => p + 1)}
              disabled={matches.length < pageSize}
              sx={{ color: 'white' }}
              title={msg.myMatches.nextPage}
            >
              <NextIcon />
            </IconButton>
          </Box>
        </Card>
      )}

      {/* Match detail dialog */}
      <Dialog
        open={detail !== null}
        onClose={closeDetail}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: { sx: { backgroundColor: '#16213e', color: 'white' } },
        }}
      >
        <DialogTitle>
          {msg.myMatches.title} {detail ? `#${detail.id}` : ''}
        </DialogTitle>
        <DialogContent>
          {detailLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress sx={{ color: '#e94560' }} />
            </Box>
          )}
          {detailError && (
            <Alert severity="error" sx={{ backgroundColor: 'rgba(211, 47, 47, 0.1)', color: '#ff6b6b' }}>
              {detailError}
            </Alert>
          )}
          {!detailLoading && !detailError && detail && (
            <Box>
              <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  label={`${msg.myMatches.detailType}: ${detail.match_type}`}
                  size="small"
                  sx={{ backgroundColor: 'rgba(233, 69, 96, 0.2)', color: '#e94560' }}
                />
                <Chip
                  label={`${msg.myMatches.detailSource}: ${detail.source || '—'}`}
                  size="small"
                  sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                />
                <Chip
                  label={`${msg.myMatches.detailMap}: ${detail.map_name || '—'}`}
                  size="small"
                  sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                />
                <Chip
                  label={
                    detail.winner_team_id
                      ? `${msg.myMatches.detailWinner}: ${msg.common.team} ${detail.winner_team_id}`
                      : msg.common.draw
                  }
                  size="small"
                  color={detail.winner_team_id ? 'success' : 'default'}
                />
              </Stack>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                {msg.myMatches.detailStarted} {formatTime(detail.started_at)} · {msg.myMatches.detailFinished}{' '}
                {formatTime(detail.finished_at)} · {msg.myMatches.detailDuration}{' '}
                {formatDuration(detail.duration_seconds)}
              </Typography>

              {detail.participants && detail.participants.length > 0 ? (
                <TableContainer component={Paper} sx={{ backgroundColor: '#0f3460' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {msg.myMatches.detailHeaders.map((h) => (
                          <TableCell key={h} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.participants.map((p) => {
                        const result = resultLabel(p);
                        return (
                          <TableRow key={`${p.uid}-${p.team_id}`}>
                            <TableCell sx={{ color: 'white' }}>{p.uid}</TableCell>
                            <TableCell sx={{ color: 'white' }}>{p.team_id}</TableCell>
                            <TableCell>
                              <Chip label={result.text} size="small" color={result.color} />
                            </TableCell>
                            <TableCell sx={{ color: 'white' }}>{p.rank_score_before}</TableCell>
                            <TableCell sx={{ color: p.rank_score_delta >= 0 ? '#66bb6a' : '#ef5350' }}>
                              {p.rank_score_delta >= 0 ? '+' : ''}
                              {p.rank_score_delta}
                            </TableCell>
                            <TableCell sx={{ color: 'white' }}>{p.kills}</TableCell>
                            <TableCell sx={{ color: 'white' }}>{p.deaths}</TableCell>
                            <TableCell sx={{ color: 'white' }}>{formatDuration(p.survival_time)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  {msg.myMatches.noParticipants}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDetail} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {msg.common.close}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
