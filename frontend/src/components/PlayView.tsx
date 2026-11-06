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
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Groups as GroupsIcon,
  CheckCircle as CheckCircleIcon,
  ContentCopy as ContentCopyIcon,
  History as HistoryIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
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
import { accentTint } from '../theme';
import RankCard from './RankCard';
import { EmptyState, LoadingList } from './StateViews';
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
  // Global queue busyness (contract v1.7.0, display-only).
  queue_stats?: QueueStatsView;
}

interface QueueStatsView {
  players: number;
  parties: number;
  average_wait_seconds: number;
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

// Step order of the phase indicator shown while a cycle is active.
const PHASE_STEPS = ['stateQueued', 'stateFound', 'stateInMatch', 'stateSettled'] as const;

function phaseStepIndex(phase: QueuePhase): number {
  switch (phase) {
    case 'queued':
      return 0;
    case 'found':
      return 1;
    case 'in_match':
      return 2;
    case 'settled':
      return 3;
    default:
      return -1;
  }
}

function normalizeUuid(raw: string): string {
  return raw.replace(/-/g, '').toLowerCase();
}

function waitSeconds(enqueuedAt: string, now: number): number {
  const start = new Date(enqueuedAt).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((now - start) / 1000));
}

function formatWait(enqueuedAt: string, now: number): string {
  const secs = waitSeconds(enqueuedAt, now);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSeconds(total: number): string {
  const secs = Math.max(0, Math.floor(total));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Expectation management for unusually long waits (research 04 §A2).
const LONG_WAIT_SECS = 60;

interface PlayViewProps {
  user: UserProfile | null;
  onViewMatch: (id: number) => void;
  // Get-started checklist entry into the rankings board.
  onOpenRankings?: () => void;
}

export default function PlayView({ user, onViewMatch, onOpenRankings }: PlayViewProps) {
  const msg = t();

  const [phase, setPhase] = useState<QueuePhase>('idle');
  const [mode, setMode] = useState('1v1');
  const [partyOpen, setPartyOpen] = useState(false);
  const [partyInput, setPartyInput] = useState('');
  const [partyMembers, setPartyMembers] = useState<string[]>([]);
  const [partyError, setPartyError] = useState<string | null>(null);

  const [queueEntry, setQueueEntry] = useState<QueueEntryView | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStatsView | null>(null);
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
  const [copiedJoin, setCopiedJoin] = useState(false);
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

    // Display-only queue busyness (contract v1.7.0); never feeds the
    // state machine.
    setQueueStats(status.queue_stats ?? null);

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
        setQueueStats(status.queue_stats ?? null);
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

  // Copy the formed group's server address (Match Found "join server" exit).
  const copyGroupAddress = async () => {
    const jt = activeGroup?.join_target;
    if (!jt) return;
    try {
      await navigator.clipboard.writeText(`${jt.host}:${jt.port}`);
      setCopiedJoin(true);
      setTimeout(() => setCopiedJoin(false), 2000);
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

  const stepIndex = phaseStepIndex(phase);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4">{msg.play.title}</Typography>
        {stateChip()}
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        {msg.readOnly.notice}
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
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
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, mr: 2, fontSize: '1.25rem' }}>
                  {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="h6">{user?.username || 'Player'}</Typography>
                  <Chip
                    label={`${msg.play.level} ${user?.level || 1}`}
                    size="small"
                    sx={{ ...accentTint, fontWeight: 'bold' }}
                  />
                </Box>
              </Box>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {msg.play.experience}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'success.main' }}>
                    {(user?.experience ?? 0).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {msg.play.rankScore}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'secondary.main' }}>
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

        {/* Get-started checklist (guidance state, research 04 §A6 first-run
            checklist) until the first settled match lands */}
        {(phase === 'idle' || phase === 'joining') && (user?.wins_count ?? 0) === 0 && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {msg.play.getStartedTitle}
                </Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {msg.play.getStartedSignIn}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {msg.play.getStartedQueue}
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PlayIcon />}
                      onClick={findMatch}
                      disabled={phase === 'joining' || mode.trim() === ''}
                    >
                      {msg.play.findMatch}
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {msg.play.getStartedRankings}
                    </Typography>
                    {onOpenRankings && (
                      <Button size="small" variant="outlined" onClick={onOpenRankings}>
                        {msg.play.viewRankings}
                      </Button>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Queue card */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {msg.play.queueCardTitle}
              </Typography>

              {/* Phase indicator: one glance tells where the cycle stands */}
              {stepIndex >= 0 && (
                <Stepper activeStep={stepIndex} sx={{ mb: 3 }}>
                  {PHASE_STEPS.map((key) => (
                    <Step key={key}>
                      <StepLabel>{msg.play[key]}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              )}

              {(phase === 'idle' || phase === 'joining') && (
                <Box>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <TextField
                      label={msg.play.mode}
                      size="small"
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      sx={{ width: 160 }}
                    />
                    <Button
                      startIcon={<GroupsIcon />}
                      onClick={() => setPartyOpen((v) => !v)}
                      variant={partyOpen ? 'contained' : 'outlined'}
                    >
                      {msg.play.partyToggle}
                    </Button>
                  </Stack>

                  <Collapse in={partyOpen}>
                    <Alert severity="info" sx={{ mb: 1 }}>
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
                      />
                      <Button onClick={addPartyMember} startIcon={<AddIcon />} variant="outlined">
                        {msg.play.partyAdd}
                      </Button>
                    </Stack>
                    {partyError && (
                      <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mb: 1 }}>
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
                          sx={{ fontFamily: 'monospace' }}
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
                  >
                    {phase === 'joining' ? msg.play.joining : msg.play.findMatch}
                  </Button>
                </Box>
              )}

              {phase === 'queued' && (
                <Box>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1 }}>
                    <Typography variant="h5" sx={{ color: 'warning.main' }}>
                      {formatWait(queueEntry?.enqueued_at ?? '', now)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {msg.play.waiting} · {queueEntry?.match_type ?? mode}
                      {queueEntry?.party_id ? ` · ${msg.play.partyToggle}` : ''}
                    </Typography>
                  </Stack>
                  {waitSeconds(queueEntry?.enqueued_at ?? '', now) >= LONG_WAIT_SECS && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {msg.play.queueLongWait}
                    </Typography>
                  )}
                  {queueStats && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {msg.play.queueStatsTemplate
                        .replace('{players}', String(queueStats.players))
                        .replace('{parties}', String(queueStats.parties))}
                      {queueStats.average_wait_seconds > 0 &&
                        ` · ${msg.play.avgWaitTemplate.replace('{time}', formatSeconds(queueStats.average_wait_seconds))}`}
                    </Typography>
                  )}
                  <Button startIcon={<CancelIcon />} onClick={cancelQueue} variant="outlined">
                    {msg.play.cancelQueue}
                  </Button>
                </Box>
              )}

              {(phase === 'found' || phase === 'in_match') && activeGroup && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography
                      variant="h5"
                      sx={{ color: phase === 'found' ? 'success.main' : 'info.main' }}
                    >
                      {phase === 'found' ? msg.play.stateFound : msg.play.stateInMatch} ·{' '}
                      {msg.play.groupLabel} #{activeGroup.group_id}
                    </Typography>
                  </Box>

                  <Stack spacing={1} sx={{ mb: 2 }}>
                    {teamsOfGroup(activeGroup).map(([teamId, members]) => (
                      <Box key={teamId} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Chip label={`${msg.common.team} ${teamId}`} size="small" sx={accentTint} />
                        {members.map((m) => (
                          <Chip key={m.uid} label={`#${m.uid} · ${m.rank_score}`} size="small" />
                        ))}
                      </Box>
                    ))}
                  </Stack>

                  {phase === 'found' && (
                    <Box sx={{ p: 2, borderRadius: 1, backgroundColor: 'action.hover', mb: 2 }}>
                      {activeGroup.join_target ? (
                        <>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: 'monospace',
                                backgroundColor: 'background.default',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1,
                              }}
                            >
                              {activeGroup.join_target.host}:{activeGroup.join_target.port}
                            </Typography>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<ContentCopyIcon />}
                              onClick={copyGroupAddress}
                            >
                              {copiedJoin ? msg.handoff.copied : msg.play.copyServerAddress}
                            </Button>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {msg.play.joinServerHint}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {msg.play.joinServerMissing}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {phase === 'in_match' && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {msg.play.waitingResults}
                    </Typography>
                  )}

                  {/* Client-side exit: the formed group itself stays on the
                      server; dismiss only stops tracking it here. */}
                  <Button size="small" color="inherit" onClick={resetCycle} sx={{ color: 'text.secondary' }}>
                    {msg.play.dismissMatch}
                  </Button>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                    {msg.play.dismissHint}
                  </Typography>
                </Box>
              )}

              {phase === 'settled' && settledMatch && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircleIcon color="success" />
                    <Typography variant="h6">
                      {msg.play.matchRecorded} · #{settledMatch.id}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={2}>
                    <Button variant="contained" onClick={() => onViewMatch(settledMatch.id)}>
                      {msg.play.viewDetails}
                    </Button>
                    <Button variant="outlined" onClick={resetCycle}>
                      {msg.play.queueAgain}
                    </Button>
                  </Stack>

                  {/* Match handoff (INTEROP-SPEC v1) */}
                  {handoff && (
                    <Box sx={{ mt: 3, p: 2, borderRadius: 1, backgroundColor: 'action.hover' }}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        {msg.handoff.title}
                      </Typography>

                      {handoff.state === 'delivering' && (
                        <Alert severity="info">{msg.handoff.delivering}</Alert>
                      )}
                      {handoff.state === 'waiting_receiver' && (
                        <Alert severity="info">{msg.handoff.waitingReceiver}</Alert>
                      )}
                      {handoff.state === 'delivered' && (
                        <Alert severity="success">{msg.handoff.delivered}</Alert>
                      )}
                      {(handoff.state === 'busy' ||
                        handoff.state === 'timeout' ||
                        handoff.state === 'no_receiver' ||
                        handoff.state === 'version_mismatch' ||
                        handoff.state === 'error') && (
                        <Alert
                          severity="warning"
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
                        <Alert severity="info">{msg.handoff.missingConfig}</Alert>
                      )}

                      {handoff.host && handoff.port && handoff.state !== 'delivered' && (
                        <Box sx={{ mt: 2 }}>
                          {!handoff.game_reachable && (
                            <Typography variant="caption" sx={{ color: 'warning.main', display: 'block', mb: 1 }}>
                              {msg.handoff.gameUnreachable}
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {msg.handoff.manualJoinHint}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: 'monospace',
                                backgroundColor: 'background.default',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1,
                              }}
                            >
                              {handoff.host}:{handoff.port}
                            </Typography>
                            <Button size="small" onClick={copyJoinAddress} startIcon={<ContentCopyIcon />}>
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
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">{msg.play.recentMatches}</Typography>
                <IconButton onClick={refreshRecent} title={msg.common.refresh}>
                  <RefreshIcon />
                </IconButton>
              </Box>
              {recentLoading ? (
                <LoadingList rows={3} rowHeight={40} />
              ) : recentMatches.length === 0 ? (
                <EmptyState
                  icon={<HistoryIcon />}
                  title={msg.play.noRecentMatches}
                />
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
                        backgroundColor: 'action.hover',
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'action.selected' },
                      }}
                    >
                      <Chip label={m.match_type} size="small" sx={accentTint} />
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>
                        {m.map_name || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
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
