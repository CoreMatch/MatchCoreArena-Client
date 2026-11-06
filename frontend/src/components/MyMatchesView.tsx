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
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Refresh as RefreshIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  History as HistoryIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import { GetMyMatches, GetMatch } from '../../wailsjs/go/main/App';
import { t, loadErrorMessage } from '../i18n';
import { authFetch } from '../session';
import { accentTint } from '../theme';
import { EmptyState, ErrorState, LoadingList } from './StateViews';

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

interface MyMatchesViewProps {
  // uid of the signed-in user (when the profile is provisioned); used to
  // highlight the player's own result in the match detail.
  userUid?: number;
  // When set (deep navigation from Play), open this match's detail once.
  focusMatchId?: number | null;
  onConsumeFocus?: () => void;
  // Empty-state next action: jump back to the Play queue.
  onFindMatch?: () => void;
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

function formatPts(delta: number): string {
  return `${delta >= 0 ? '+' : ''}${delta} ${t().common.pts}`;
}

function resultChip(p: ParticipantDetail): { text: string; color: 'success' | 'error' | 'default' } {
  const msg = t().career;
  if (p.is_draw) return { text: msg.resultDraw, color: 'default' };
  if (p.is_winner) return { text: msg.resultWin, color: 'success' };
  return { text: msg.resultLose, color: 'error' };
}

export default function MyMatchesView({ userUid, focusMatchId, onConsumeFocus, onFindMatch }: MyMatchesViewProps) {
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
      const resp = await authFetch(() => GetMyMatches(pageNum, pageSize));
      const data = resp?.data ?? resp;
      setMatches(Array.isArray(data) ? data : []);
    } catch {
      setError(loadErrorMessage(t().common.dataMatches));
    } finally {
      setLoading(false);
    }
  }, [pageNum, pageSize]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Deep navigation from Play: open the requested match detail once.
  useEffect(() => {
    if (focusMatchId != null) {
      openDetail(focusMatchId);
      onConsumeFocus?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMatchId]);

  const openDetail = async (id: number) => {
    setDetail({ id } as MatchDetail);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const resp = await authFetch(() => GetMatch(id));
      const data = (resp?.data ?? resp) as MatchDetail;
      setDetail(data);
    } catch {
      setDetailError(loadErrorMessage(t().common.dataMatchDetail));
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

  // Own settlement in the open detail (when the signed-in user participated).
  const myParticipant =
    detail && userUid !== undefined && detail.participants
      ? detail.participants.find((p) => p.uid === userUid)
      : undefined;

  const myResultChip = myParticipant
    ? myParticipant.is_draw
      ? { text: msg.career.drawResult, color: 'default' as const }
      : myParticipant.is_winner
        ? { text: msg.career.victory, color: 'success' as const }
        : { text: msg.career.defeat, color: 'error' as const }
    : undefined;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">{msg.career.title}</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 110 }} size="small">
            <InputLabel>{msg.career.pageSize}</InputLabel>
            <Select
              value={pageSize}
              label={msg.career.pageSize}
              onChange={(e) => handlePageSizeChange(e.target.value as number)}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={fetchMatches} title={msg.common.refresh}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {error ? (
        <Card>
          <ErrorState message={error} onRetry={fetchMatches} />
        </Card>
      ) : (
        <Card>
          {loading ? (
            <LoadingList rows={6} />
          ) : matches.length === 0 ? (
            <EmptyState
              icon={<HistoryIcon />}
              title={msg.career.emptyTitle}
              hint={msg.career.emptyHint}
              action={
                onFindMatch && (
                  <Button variant="contained" startIcon={<PlayIcon />} onClick={onFindMatch}>
                    {msg.play.findMatch}
                  </Button>
                )
              }
            />
          ) : (
            <>
              <TableContainer component={Paper} sx={{ backgroundColor: 'transparent' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {msg.career.headers.map((h) => (
                        <TableCell
                          key={h}
                          sx={{
                            color: 'text.secondary',
                            fontWeight: 'bold',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {matches.map((m) => (
                      <TableRow
                        key={m.id}
                        hover
                        onClick={() => openDetail(m.id)}
                        sx={{
                          cursor: 'pointer',
                          '&:last-child td': { borderBottom: 0 },
                        }}
                      >
                        <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          {formatTime(m.finished_at)}
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Chip label={m.match_type} size="small" sx={accentTint} />
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          {m.map_name || '—'}
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          {winnerLabel(m.winner_team_id)}
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          {formatDuration(m.duration_seconds)}
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          {m.source || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, p: 2 }}>
                <IconButton
                  onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                  disabled={pageNum <= 1}
                  title={msg.career.previousPage}
                >
                  <PrevIcon />
                </IconButton>
                <Typography variant="body2" color="text.secondary">
                  {msg.career.page} {pageNum}
                </Typography>
                <IconButton
                  onClick={() => setPageNum((p) => p + 1)}
                  disabled={matches.length < pageSize}
                  title={msg.career.nextPage}
                >
                  <NextIcon />
                </IconButton>
              </Box>
            </>
          )}
        </Card>
      )}

      {/* Match detail dialog */}
      <Dialog open={detail !== null} onClose={closeDetail} maxWidth="md" fullWidth>
        <DialogTitle>
          {msg.career.title} {detail ? `#${detail.id}` : ''}
        </DialogTitle>
        <DialogContent>
          {detailLoading && <LoadingList rows={5} />}
          {detailError && (
            <ErrorState
              message={detailError}
              onRetry={detail ? () => openDetail(detail.id) : undefined}
            />
          )}
          {!detailLoading && !detailError && detail && (
            <Box>
              <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                {myResultChip && (
                  <Chip
                    label={
                      myParticipant && !myParticipant.is_draw
                        ? `${myResultChip.text} · ${formatPts(myParticipant.rank_score_delta)}`
                        : myResultChip.text
                    }
                    color={myResultChip.color}
                    sx={{ fontWeight: 'bold' }}
                  />
                )}
                <Chip label={`${msg.career.detailType}: ${detail.match_type}`} size="small" sx={accentTint} />
                <Chip label={`${msg.career.detailSource}: ${detail.source || '—'}`} size="small" />
                <Chip label={`${msg.career.detailMap}: ${detail.map_name || '—'}`} size="small" />
                <Chip
                  label={
                    detail.winner_team_id
                      ? `${msg.career.detailWinner}: ${msg.common.team} ${detail.winner_team_id}`
                      : msg.common.draw
                  }
                  size="small"
                  color={detail.winner_team_id ? 'success' : 'default'}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {msg.career.detailStarted} {formatTime(detail.started_at)} · {msg.career.detailFinished}{' '}
                {formatTime(detail.finished_at)} · {msg.career.detailDuration}{' '}
                {formatDuration(detail.duration_seconds)}
              </Typography>

              {detail.participants && detail.participants.length > 0 ? (
                <TableContainer component={Paper} sx={{ backgroundColor: 'action.hover' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {msg.career.detailHeaders.map((h) => (
                          <TableCell key={h} sx={{ color: 'text.secondary' }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.participants.map((p) => {
                        const result = resultChip(p);
                        const isMe = userUid !== undefined && p.uid === userUid;
                        return (
                          <TableRow
                            key={`${p.uid}-${p.team_id}`}
                            sx={isMe ? { backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12) } : undefined}
                          >
                            <TableCell sx={{ fontWeight: isMe ? 'bold' : 'normal' }}>#{p.uid}</TableCell>
                            <TableCell>{p.team_id}</TableCell>
                            <TableCell>
                              <Chip label={result.text} size="small" color={result.color} />
                            </TableCell>
                            <TableCell>{p.kills}</TableCell>
                            <TableCell>{p.deaths}</TableCell>
                            <TableCell>{formatDuration(p.survival_time)}</TableCell>
                            <TableCell sx={{ color: p.rank_score_delta >= 0 ? 'success.main' : 'error.main' }}>
                              {formatPts(p.rank_score_delta)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.disabled">
                  {msg.career.noParticipants}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDetail} color="inherit">
            {msg.common.close}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
