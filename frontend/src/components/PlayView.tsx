import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  TextField,
  Button,
  Alert,
  IconButton,
  Stack,
  Collapse,
  Skeleton,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Groups as GroupsIcon,
} from '@mui/icons-material';
import {
  GetMatchmakingStatus,
  JoinMatchmaking,
  LeaveMatchmaking,
  GetMyMatches,
  PrepareHandoff,
  GetHandoffStatus,
} from '../../wailsjs/go/main/App';
import { t } from '../i18n';
import { authFetch } from '../session';
import RankCard from './RankCard';
import type { UserProfile } from '../types';

interface QueueEntryView {
  uid: number;
  match_type: string;
  rank_score: number;
  party_id?: number;
  enqueued_at: string;
}

interface GroupMemberView {
  uid: number;
  team_id: string;
  rank_score: number;
  party_id?: number;
}

interface FormedGroupView {
  group_id: number;
  match_type: string;
  formed_at: string;
  members: GroupMemberView[];
  // Game server address attached by the arena server (contract v1.6.0);
  // omitted when the server has none configured.
  join_target?: { host: string; port: number };
}

interface MatchmakingStatusView {
  in_queue: boolean;
  queue_entry?: QueueEntryView;
  recent_groups: FormedGroupView[];
}

interface MatchSummary {
  id: number;
  match_type: string;
  source: string;
  map_name: string;
  winner_team_id: string;
  duration_seconds: number;
  finished_at: string;
}

// HandoffStatus mirrors the Go interop.Status delivered over the binding.
interface HandoffStatus {
  state: string;
  handoff_id?: string;
  match_id?: string;
  host?: string;
  port?: number;
  game_reachable: boolean;
  detail?: string;
}

// Queue phases of one matchmaking cycle:
// idle → queued (wait timer) → found → in_match → settled
type QueuePhase = 'idle' | 'joining' | 'queued' | 'found' | 'in_match' | 'settled';

const POLL_MS = 3000;
const HANDOFF_POLL_MS = 2000;

function normalizeUuid(raw: string): string {
  return raw.replace(/-/g, '').toLowerCase();
}

function formatWait(enqueuedAt: string, now: number): string {
  const start = new Date(enqueuedAt).getTime();
  if (Number.isNaN(start)) return '0:00';
  const secs = Math.max(0, Math.floor((now - start) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface PlayViewProps {
  user: UserProfile | null;
  onViewMatch: (id: number) => void;
}

export default function PlayView({ user, onViewMatch }: PlayViewProps) {
  const msg = t();

  const [phase, setPhase] = useState<QueuePhase>('idle');
  const [mode, setMode] = useState('1v1');
  const [partyOpen, setPartyOpen] = useState(false);
  const [partyInput, setPartyInput] = useState('');
  const [partyMembers, setPartyMembers] = useState<string[]>([]);
  const [partyError, setPartyError] = useState<string | null>(null);

  const [queueEntry, setQueueEntry] = useState<QueueEntryView | null>(null);
  const [activeGroup, setActiveGroup] = useState<FormedGroupView | null>(null);
  const [settledMatch, setSettledMatch] = useState<MatchSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [recentMatches, setRecentMatches] = useState<MatchSummary[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  // Match handoff (INTEROP-SPEC v1 sender side): started automatically once
  // a cycle settles; never carries credentials.
  const [handoff, setHandoff] = useState<HandoffStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const handoffStartedFor = useRef<number | null>(null);

  // Cycle snapshots: groups known before joining and the highest match id
  // seen before joining. A new group/match beyond these snapshots drives the
  // found/settled transitions (the server exposes no group→match link).
  const baselineGroupIds = useRef<Set<number>>(new Set());
  const maxKnownMatchId = useRef(0);
  const phaseRef = useRef<QueuePhase>('idle');
  phaseRef.current = phase;

  const refreshRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const resp = await authFetch(() => GetMyMatches(1, 5));
      const data = resp?.data ?? resp;
      setRecentMatches(Array.isArray(data) ? data : []);
    } catch {
      setRecentMatches([]);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  const snapshotMatches = useCallback(async () => {
    try {
      const resp = await authFetch(() => GetMyMatches(1, 1));
      const data = resp?.data ?? resp;
      const head = Array.isArray(data) && data.length > 0 ? data[0] : null;
      maxKnownMatchId.current = head ? head.id : 0;
    } catch {
      maxKnownMatchId.current = 0;
    }
  }, []);

  const checkSettlement = useCallback(async (): Promise<boolean> => {
    try {
      const resp = await authFetch(() => GetMyMatches(1, 10));
      const data = resp?.data ?? resp;
      const rows: MatchSummary[] = Array.isArray(data) ? data : [];
      const fresh = rows.find((m) => m.id > maxKnownMatchId.current);
      if (fresh) {
        setSettledMatch(fresh);
        setPhase('settled');
        refreshRecent();
        return true;
      }
    } catch {
      // transient — the next poll tick retries
    }
    return false;
  }, [refreshRecent]);

  const poll = useCallback(async () => {
    let status: MatchmakingStatusView;
    try {
      const resp = await authFetch(() => GetMatchmakingStatus());
      status = (resp?.data ?? resp) as MatchmakingStatusView;
    } catch {
      return; // transient — the next tick retries
    }

    const current = phaseRef.current;

    if (current === 'queued') {
      setQueueEntry(status.queue_entry ?? null);
      const freshGroup = (status.recent_groups ?? []).find(
        (g) => !baselineGroupIds.current.has(g.group_id),
      );
      if (freshGroup) {
        setActiveGroup(freshGroup);
        setPhase('found');
        await checkSettlement();
      } else if (!status.in_queue) {
        // Left the queue without a formed group (e.g. removed server-side).
        setPhase('idle');
      }
    } else if (current === 'found') {
      if (await checkSettlement()) return;
      setPhase('in_match');
    } else if (current === 'in_match') {
      await checkSettlement();
    }
  }, [checkSettlement]);

  // Poll while a cycle is active; tick the wait timer while queued.
  useEffect(() => {
    if (phase !== 'queued' && phase !== 'found' && phase !== 'in_match') {
      return;
    }
    poll();
    const pollHandle = setInterval(poll, POLL_MS);
    const tickHandle = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(pollHandle);
      clearInterval(tickHandle);
    };
  }, [phase, poll]);

  // Restore an interrupted cycle (app restart while queued) and load the
  // recent-matches list.
  useEffect(() => {
    refreshRecent();
    (async () => {
      try {
        const resp = await authFetch(() => GetMatchmakingStatus());
        const status = (resp?.data ?? resp) as MatchmakingStatusView;
        baselineGroupIds.current = new Set((status.recent_groups ?? []).map((g) => g.group_id));
        if (status.in_queue) {
          await snapshotMatches();
          setQueueEntry(status.queue_entry ?? null);
          setPhase('queued');
        }
      } catch {
        // not queued / transient — stay idle
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const findMatch = async () => {
    setError(null);
    setErrorDetail(null);
    setPhase('joining');
    try {
      await snapshotMatches();
      const statusResp = await authFetch(() => GetMatchmakingStatus());
      const status = (statusResp?.data ?? statusResp) as MatchmakingStatusView;
      baselineGroupIds.current = new Set((status.recent_groups ?? []).map((g) => g.group_id));

      await authFetch(() => JoinMatchmaking(mode.trim(), partyMembers));
      setQueueEntry(null);
      setPhase('queued');
    } catch (err: unknown) {
      setPhase('idle');
      setError(msg.play.joinError);
      const raw = err instanceof Error ? err.message : String(err);
      setErrorDetail(raw || null);
    }
  };

  const cancelQueue = async () => {
    setError(null);
    setErrorDetail(null);
    try {
      await authFetch(() => LeaveMatchmaking());
      setPhase('idle');
      setQueueEntry(null);
      setActiveGroup(null);
    } catch (err: unknown) {
      setError(msg.play.leaveError);
      const raw = err instanceof Error ? err.message : String(err);
      setErrorDetail(raw || null);
    }
  };

  const resetCycle = () => {
    setPhase('idle');
    setActiveGroup(null);
    setSettledMatch(null);
    setQueueEntry(null);
    setHandoff(null);
    handoffStartedFor.current = null;
    baselineGroupIds.current = new Set();
    maxKnownMatchId.current = 0;
  };

  const startHandoff = useCallback(async (m: MatchSummary, jt?: { host: string; port: number }) => {
    try {
      const resp = await authFetch(() =>
        PrepareHandoff(m.id, m.match_type, m.map_name ?? '', jt?.host ?? '', jt?.port ?? 0),
      );
      setHandoff((resp?.data ?? resp) as HandoffStatus);
    } catch {
      setHandoff({ state: 'error', game_reachable: false });
    }
  }, []);

  // Auto-start the handoff once per settled match. The server-provided
  // join_target (when present) takes precedence over the local fallback
  // configuration — the Go side applies that precedence.
  useEffect(() => {
    if (phase === 'settled' && settledMatch && handoffStartedFor.current !== settledMatch.id) {
      handoffStartedFor.current = settledMatch.id;
      startHandoff(settledMatch, activeGroup?.join_target);
    }
  }, [phase, settledMatch, activeGroup, startHandoff]);

  // Poll transient handoff states until delivery settles.
  useEffect(() => {
    if (!handoff || (handoff.state !== 'delivering' && handoff.state !== 'waiting_receiver')) {
      return;
    }
    const handle = setInterval(async () => {
      try {
        const resp = await authFetch(() => GetHandoffStatus());
        setHandoff((resp?.data ?? resp) as HandoffStatus);
      } catch {
        // transient — the next tick retries
      }
    }, HANDOFF_POLL_MS);
    return () => clearInterval(handle);
  }, [handoff?.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyJoinAddress = async () => {
    if (!handoff?.host || !handoff?.port) return;
    try {
      await navigator.clipboard.writeText(`${handoff.host}:${handoff.port}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the address stays visible for manual copy.
    }
  };

  const addPartyMember = () => {
    setPartyError(null);
    const uuid = normalizeUuid(partyInput.trim());
    if (!/^[0-9a-f]{32}$/.test(uuid)) {
      setPartyError(msg.play.partyInvalidUuid);
      return;
    }
    if (partyMembers.includes(uuid)) {
      setPartyError(msg.play.partyDuplicate);
      return;
    }
    setPartyMembers((prev) => [...prev, uuid]);
    setPartyInput('');
  };

  const teamsOfGroup = (group: FormedGroupView) => {
    const teams = new Map<string, GroupMemberView[]>();
    for (const m of group.members ?? []) {
      const list = teams.get(m.team_id) ?? [];
      list.push(m);
      teams.set(m.team_id, list);
    }
    return Array.from(teams.entries()).sort(([a], [b]) => a.localeCompare(b));
  };

  const stateChip = () => {
    switch (phase) {
      case 'queued':
        return <Chip label={msg.play.stateQueued} color="warning" size="small" />;
      case 'found':
        return <Chip label={msg.play.stateFound} color="success" size="small" />;
      case 'in_match':
        return <Chip label={msg.play.stateInMatch} color="info" size="small" />;
      case 'settled':
        return <Chip label={msg.play.stateSettled} color="default" size="small" />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4" sx={{ color: 'white' }}>
          {msg.play.title}
        </Typography>
        {stateChip()}
      </Box>

      <Alert severity="info" sx={{ mb: 3, backgroundColor: 'rgba(2, 136, 209, 0.12)', color: '#8ecdf5' }}>
        {msg.readOnly.notice}
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(211, 47, 47, 0.1)', color: '#ff6b6b' }}>
          {error}
          {errorDetail && (
            <Typography variant="caption" component="div" sx={{ mt: 0.5, opacity: 0.8 }}>
              {errorDetail}
            </Typography>
          )}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Player summary (merged from the former Home page) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ backgroundColor: '#16213e', color: 'white', height: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: '#e94560', width: 48, height: 48, mr: 2, fontSize: '1.25rem' }}>
                  {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="h6">{user?.username || 'Player'}</Typography>
                  <Chip
                    label={`${msg.play.level} ${user?.level || 1}`}
                    size="small"
                    sx={{ backgroundColor: 'rgba(233, 69, 96, 0.2)', color: '#e94560', fontWeight: 'bold' }}
                  />
                </Box>
              </Box>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {msg.play.experience}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#4ecca3' }}>
                    {(user?.experience ?? 0).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {msg.play.rankScore}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ffd700' }}>
                    {user?.rank_score ?? '—'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Rank card (A4) */}
        <Grid size={{ xs: 12, md: 8 }}>
          <RankCard rankType={mode.trim() || '1v1'} season={1} winsCount={user?.wins_count} />
        </Grid>

        {/* Queue card */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ backgroundColor: '#16213e', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {msg.play.queueCardTitle}
              </Typography>

              {(phase === 'idle' || phase === 'joining') && (
                <Box>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <TextField
                      label={msg.play.mode}
                      size="small"
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      sx={{
                        width: 160,
                        '& .MuiOutlinedInput-root': { color: 'white' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                    <Button
                      startIcon={<GroupsIcon />}
                      onClick={() => setPartyOpen((v) => !v)}
                      variant={partyOpen ? 'contained' : 'outlined'}
                      sx={
                        partyOpen
                          ? { backgroundColor: '#e94560' }
                          : { color: 'white', borderColor: 'rgba(255,255,255,0.4)' }
                      }
                    >
                      {msg.play.partyToggle}
                    </Button>
                  </Stack>

                  <Collapse in={partyOpen}>
                    <Alert severity="info" sx={{ mb: 1, backgroundColor: 'rgba(2,136,209,0.08)', color: '#8ecdf5' }}>
                      {msg.play.partyHint}
                    </Alert>
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder={msg.play.partyInputPlaceholder}
                        value={partyInput}
                        onChange={(e) => setPartyInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addPartyMember();
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': { color: 'white' },
                          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                        }}
                      />
                      <Button onClick={addPartyMember} startIcon={<AddIcon />} variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>
                        {msg.play.partyAdd}
                      </Button>
                    </Stack>
                    {partyError && (
                      <Typography variant="caption" sx={{ color: '#ff6b6b', display: 'block', mb: 1 }}>
                        {partyError}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {partyMembers.map((uuid) => (
                        <Chip
                          key={uuid}
                          label={uuid}
                          size="small"
                          onDelete={() => setPartyMembers((prev) => prev.filter((u) => u !== uuid))}
                          sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', fontFamily: 'monospace' }}
                        />
                      ))}
                    </Box>
                  </Collapse>

                  <Button
                    startIcon={<PlayIcon />}
                    onClick={findMatch}
                    disabled={phase === 'joining' || mode.trim() === ''}
                    variant="contained"
                    size="large"
                    sx={{ backgroundColor: '#e94560', '&:hover': { backgroundColor: '#c81e45' } }}
                  >
                    {phase === 'joining' ? msg.play.joining : msg.play.findMatch}
                  </Button>
                </Box>
              )}

              {phase === 'queued' && (
                <Box>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1 }}>
                    <Typography variant="h5" sx={{ color: '#ffd700', fontWeight: 'bold' }}>
                      {formatWait(queueEntry?.enqueued_at ?? '', now)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      {msg.play.waiting} · {queueEntry?.match_type ?? mode}
                      {queueEntry?.party_id ? ` · ${msg.play.partyToggle}` : ''}
                    </Typography>
                  </Stack>
                  <Button
                    startIcon={<CancelIcon />}
                    onClick={cancelQueue}
                    variant="outlined"
                    sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}
                  >
                    {msg.play.cancelQueue}
                  </Button>
                </Box>
              )}

              {(phase === 'found' || phase === 'in_match') && activeGroup && (
                <Box>
                  <Typography variant="h6" sx={{ color: '#66bb6a', mb: 1 }}>
                    {phase === 'found' ? msg.play.stateFound : msg.play.stateInMatch} ·{' '}
                    {msg.play.groupLabel} #{activeGroup.group_id}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                    {msg.play.waitingResults}
                  </Typography>
                  <Stack spacing={1}>
                    {teamsOfGroup(activeGroup).map(([teamId, members]) => (
                      <Box key={teamId} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Chip
                          label={`${msg.common.team} ${teamId}`}
                          size="small"
                          sx={{ backgroundColor: 'rgba(233, 69, 96, 0.2)', color: '#e94560' }}
                        />
                        {members.map((m) => (
                          <Chip
                            key={m.uid}
                            label={`#${m.uid} · ${m.rank_score}`}
                            size="small"
                            sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                          />
                        ))}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {phase === 'settled' && settledMatch && (
                <Box>
                  <Typography variant="h6" sx={{ color: '#66bb6a', mb: 1 }}>
                    {msg.play.matchRecorded} · #{settledMatch.id}
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      onClick={() => onViewMatch(settledMatch.id)}
                      sx={{ backgroundColor: '#e94560', '&:hover': { backgroundColor: '#c81e45' } }}
                    >
                      {msg.play.viewDetails}
                    </Button>
                    <Button variant="outlined" onClick={resetCycle} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>
                      {msg.play.queueAgain}
                    </Button>
                  </Stack>

                  {/* Match handoff (INTEROP-SPEC v1) */}
                  {handoff && (
                    <Box sx={{ mt: 3, p: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.05)' }}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        {msg.handoff.title}
                      </Typography>

                      {handoff.state === 'delivering' && (
                        <Alert severity="info" sx={{ backgroundColor: 'rgba(2,136,209,0.08)', color: '#8ecdf5' }}>
                          {msg.handoff.delivering}
                        </Alert>
                      )}
                      {handoff.state === 'waiting_receiver' && (
                        <Alert severity="info" sx={{ backgroundColor: 'rgba(2,136,209,0.08)', color: '#8ecdf5' }}>
                          {msg.handoff.waitingReceiver}
                        </Alert>
                      )}
                      {handoff.state === 'delivered' && (
                        <Alert severity="success" sx={{ backgroundColor: 'rgba(102,187,106,0.1)', color: '#a5d6a7' }}>
                          {msg.handoff.delivered}
                        </Alert>
                      )}
                      {(handoff.state === 'busy' ||
                        handoff.state === 'timeout' ||
                        handoff.state === 'no_receiver' ||
                        handoff.state === 'version_mismatch' ||
                        handoff.state === 'error') && (
                        <Alert
                          severity="warning"
                          sx={{ backgroundColor: 'rgba(255,167,38,0.1)', color: '#ffcc80' }}
                          action={
                            <Button color="inherit" size="small" onClick={() => startHandoff(settledMatch, activeGroup?.join_target)}>
                              {msg.handoff.retry}
                            </Button>
                          }
                        >
                          {handoff.state === 'busy' && msg.handoff.busy}
                          {handoff.state === 'timeout' && msg.handoff.timeout}
                          {handoff.state === 'no_receiver' && msg.handoff.noReceiver}
                          {handoff.state === 'version_mismatch' && msg.handoff.versionMismatch}
                          {handoff.state === 'error' && (handoff.detail || msg.handoff.error)}
                        </Alert>
                      )}
                      {handoff.state === 'missing_config' && (
                        <Alert severity="info" sx={{ backgroundColor: 'rgba(2,136,209,0.08)', color: '#8ecdf5' }}>
                          {msg.handoff.missingConfig}
                        </Alert>
                      )}

                      {handoff.host && handoff.port && handoff.state !== 'delivered' && (
                        <Box sx={{ mt: 2 }}>
                          {!handoff.game_reachable && (
                            <Typography variant="caption" sx={{ color: '#ffcc80', display: 'block', mb: 1 }}>
                              {msg.handoff.gameUnreachable}
                            </Typography>
                          )}
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                            {msg.handoff.manualJoinHint}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: 'monospace', color: 'white', backgroundColor: '#0f3460', px: 1.5, py: 0.5, borderRadius: 1 }}
                            >
                              {handoff.host}:{handoff.port}
                            </Typography>
                            <Button size="small" onClick={copyJoinAddress} sx={{ color: '#e94560' }}>
                              {copied ? msg.handoff.copied : msg.handoff.copy}
                            </Button>
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent matches */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ backgroundColor: '#16213e', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">{msg.play.recentMatches}</Typography>
                <IconButton onClick={refreshRecent} sx={{ color: 'white' }} title={msg.common.refresh}>
                  <RefreshIcon />
                </IconButton>
              </Box>
              {recentLoading ? (
                <Box sx={{ p: 1 }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} height={40} sx={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                  ))}
                </Box>
              ) : recentMatches.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  {msg.play.noRecentMatches}
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {recentMatches.map((m) => (
                    <Box
                      key={m.id}
                      onClick={() => onViewMatch(m.id)}
                      sx={{
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: '#0f3460',
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'rgba(15, 52, 96, 0.7)' },
                      }}
                    >
                      <Chip
                        label={m.match_type}
                        size="small"
                        sx={{ backgroundColor: 'rgba(233, 69, 96, 0.2)', color: '#e94560' }}
                      />
                      <Typography variant="body2" sx={{ color: 'white', flexGrow: 1 }}>
                        {m.map_name || '—'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {new Date(m.finished_at).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
