import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Copy,
  History,
  ListChecks,
  Play,
  Plus,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  EmptyState,
  Field,
  Icon,
  Input,
  Inset,
  Panel,
  Skeleton,
  Stat,
  Stepper,
} from '@ha/ui';
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

// Expectation management for unusually long waits (research 04 §A2).
const LONG_WAIT_SECS = 60;

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

  const phaseBadge = () => {
    switch (phase) {
      case 'queued':
        return <Badge tone="warn" strong>{msg.play.stateQueued}</Badge>;
      case 'found':
        return <Badge tone="ok" strong>{msg.play.stateFound}</Badge>;
      case 'in_match':
        return <Badge tone="info" strong>{msg.play.stateInMatch}</Badge>;
      case 'settled':
        return <Badge tone="neutral" strong>{msg.play.stateSettled}</Badge>;
      default:
        return null;
    }
  };

  const stepIndex = phaseStepIndex(phase);
  const stepLabels = [msg.play.stateQueued, msg.play.stateFound, msg.play.stateInMatch, msg.play.stateSettled];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-display font-bold tracking-tight text-ink">{msg.play.title}</h1>
        {phaseBadge()}
      </div>

      <Banner tone="info">{msg.readOnly.notice}</Banner>

      {error && (
        <Banner tone="danger">
          {error}
          {errorDetail && <div className="mt-1 break-all text-xs opacity-80">{errorDetail}</div>}
        </Banner>
      )}

      {/* Player stat strip */}
      <Panel className="px-6 py-5">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-accent text-lg font-bold text-on-accent">
              {user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </span>
            <div>
              <div className="text-base font-bold text-ink">{user?.username || 'Player'}</div>
              <Badge tone="accent" strong>{msg.play.level} {user?.level || 1}</Badge>
            </div>
          </div>
          <Stat label={msg.play.experience} value={(user?.experience ?? 0).toLocaleString()} size="display" tone="ok" />
          <Stat label={msg.play.rankScore} value={user?.rank_score ?? '—'} size="display" tone="gold" />
        </div>
      </Panel>

      {/* Rank card (A4) */}
      <RankCard rankType={mode.trim() || '1v1'} season={1} winsCount={user?.wins_count} />

      {/* Get-started checklist (guidance state, research 04 §A6 first-run
          checklist) until the first settled match lands */}
      {(phase === 'idle' || phase === 'joining') && (user?.wins_count ?? 0) === 0 && (
        <Panel className="px-6 py-5">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
            <Icon as={ListChecks} size={16} />
            {msg.play.getStartedTitle}
          </h2>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <Icon as={CheckCircle2} className="text-ok" />
              <span className="flex-1 text-sm text-ink-muted">{msg.play.getStartedSignIn}</span>
            </li>
            <li className="flex items-center gap-3">
              <Icon as={Circle} className="text-ink-faint" />
              <span className="flex-1 text-sm text-ink">{msg.play.getStartedQueue}</span>
              <Button
                variant="primary"
                size="sm"
                onClick={findMatch}
                disabled={phase === 'joining' || mode.trim() === ''}
              >
                {msg.play.findMatch}
              </Button>
            </li>
            <li className="flex items-center gap-3">
              <Icon as={Circle} className="text-ink-faint" />
              <span className="flex-1 text-sm text-ink">{msg.play.getStartedRankings}</span>
              {onOpenRankings && (
                <Button variant="outline" size="sm" onClick={onOpenRankings}>
                  {msg.play.viewRankings}
                </Button>
              )}
            </li>
          </ul>
        </Panel>
      )}

      {/* Queue card */}
      <Panel className="px-6 py-5">
        <h2 className="mb-4 text-lg font-bold text-ink">{msg.play.queueCardTitle}</h2>

        {/* Phase indicator: one glance tells where the cycle stands */}
        {stepIndex >= 0 && (
          <div className="mb-6">
            <Stepper steps={stepLabels} active={stepIndex} />
          </div>
        )}

        {(phase === 'idle' || phase === 'joining') && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <Field label={msg.play.mode} className="w-40">
                <Input value={mode} onChange={(e) => setMode(e.target.value)} className="font-mono" />
              </Field>
              <Button
                variant={partyOpen ? 'primary' : 'outline'}
                onClick={() => setPartyOpen((v) => !v)}
                aria-expanded={partyOpen}
              >
                <Icon as={Users} size={16} />
                {msg.play.partyToggle}
              </Button>
            </div>

            {partyOpen && (
              <div className="space-y-3 rounded-md border border-edge bg-base/40 p-4">
                  <Banner tone="info">{msg.play.partyHint}</Banner>
                  <div className="flex gap-2">
                    <Input
                      placeholder={msg.play.partyInputPlaceholder}
                      value={partyInput}
                      onChange={(e) => setPartyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addPartyMember();
                        }
                      }}
                      className="font-mono"
                    />
                    <Button variant="outline" onClick={addPartyMember}>
                      <Icon as={Plus} size={16} />
                      {msg.play.partyAdd}
                    </Button>
                  </div>
                  {partyError && <div className="text-xs font-medium text-danger">{partyError}</div>}
                  {partyMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {partyMembers.map((uuid) => (
                        <span
                          key={uuid}
                          className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-raised px-2 py-1 font-mono text-xs text-ink-muted"
                        >
                          {uuid}
                          <button
                            type="button"
                            onClick={() => setPartyMembers((prev) => prev.filter((u) => u !== uuid))}
                            className="text-ink-faint transition-colors duration-150 hover:text-danger"
                            aria-label={`Remove ${uuid}`}
                          >
                            <XCircle size={13} aria-hidden />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
            )}

            <Button
              variant="primary"
              size="lg"
              onClick={findMatch}
              disabled={phase === 'joining' || mode.trim() === ''}
              className="w-full text-base uppercase tracking-widest"
            >
              <Icon as={Play} size={20} />
              {phase === 'joining' ? msg.play.joining : msg.play.findMatch}
            </Button>
          </div>
        )}

        {phase === 'queued' && (
          <div className="space-y-3">
            <div className="flex items-baseline gap-4">
              <span className="font-mono text-hero font-bold tabular-nums text-warn">
                {formatWait(queueEntry?.enqueued_at ?? '', now)}
              </span>
              <span className="text-sm text-ink-muted">
                {msg.play.waiting} · {queueEntry?.match_type ?? mode}
                {queueEntry?.party_id ? ` · ${msg.play.partyToggle}` : ''}
              </span>
            </div>
            {waitSeconds(queueEntry?.enqueued_at ?? '', now) >= LONG_WAIT_SECS && (
              <div className="text-xs text-ink-faint">{msg.play.queueLongWait}</div>
            )}
            {queueStats && (
              <div className="font-mono text-xs tabular-nums text-ink-faint">
                {msg.play.queueStatsTemplate
                  .replace('{players}', String(queueStats.players))
                  .replace('{parties}', String(queueStats.parties))}
                {queueStats.average_wait_seconds > 0 &&
                  ` · ${msg.play.avgWaitTemplate.replace('{time}', formatSeconds(queueStats.average_wait_seconds))}`}
              </div>
            )}
            <Button variant="outline" onClick={cancelQueue}>
              <Icon as={XCircle} size={16} />
              {msg.play.cancelQueue}
            </Button>
          </div>
        )}

        {(phase === 'found' || phase === 'in_match') && activeGroup && (
          <div className="space-y-4">
            <div
              className={`text-display font-bold tracking-tight ${
                phase === 'found' ? 'text-ok' : 'text-info'
              }`}
            >
              {phase === 'found' ? msg.play.stateFound : msg.play.stateInMatch}
              <span className="ml-3 text-base font-semibold text-ink-muted">
                {msg.play.groupLabel} #{activeGroup.group_id}
              </span>
            </div>

            <div className="space-y-2">
              {teamsOfGroup(activeGroup).map(([teamId, members]) => (
                <div key={teamId} className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent" strong>{msg.common.team} {teamId}</Badge>
                  {members.map((m) => (
                    <span
                      key={m.uid}
                      className="rounded-md border border-edge bg-raised px-2 py-1 font-mono text-xs text-ink-muted"
                    >
                      #{m.uid} · {m.rank_score}
                    </span>
                  ))}
                </div>
              ))}
            </div>

            {phase === 'found' && (
              <Inset className="space-y-3 p-4">
                {activeGroup.join_target ? (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-md border border-edge bg-base px-3 py-1.5 font-mono text-sm font-medium text-ink">
                        {activeGroup.join_target.host}:{activeGroup.join_target.port}
                      </span>
                      <Button variant="primary" size="sm" onClick={copyGroupAddress}>
                        <Icon as={Copy} size={14} />
                        {copiedJoin ? msg.handoff.copied : msg.play.copyServerAddress}
                      </Button>
                    </div>
                    <p className="text-xs leading-relaxed text-ink-faint">{msg.play.joinServerHint}</p>
                  </>
                ) : (
                  <p className="text-sm leading-relaxed text-ink-muted">{msg.play.joinServerMissing}</p>
                )}
              </Inset>
            )}

            {phase === 'in_match' && (
              <p className="text-sm text-ink-muted">{msg.play.waitingResults}</p>
            )}

            {/* Client-side exit: the formed group itself stays on the
                server; dismiss only stops tracking it here. */}
            <div>
              <Button variant="ghost" size="sm" onClick={resetCycle}>
                {msg.play.dismissMatch}
              </Button>
              <p className="mt-1 text-xs text-ink-faint">{msg.play.dismissHint}</p>
            </div>
          </div>
        )}

        {phase === 'settled' && settledMatch && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Icon as={CheckCircle2} className="text-ok" size={24} />
              <span className="text-display font-bold tracking-tight text-ink">
                {msg.play.matchRecorded}
              </span>
              <span className="font-mono text-lg text-ink-muted">#{settledMatch.id}</span>
            </div>
            <div className="flex gap-3">
              <Button variant="primary" onClick={() => onViewMatch(settledMatch.id)}>
                {msg.play.viewDetails}
              </Button>
              <Button variant="outline" onClick={resetCycle}>
                {msg.play.queueAgain}
              </Button>
            </div>

            {/* Match handoff (INTEROP-SPEC v1) */}
            {handoff && (
              <Inset className="space-y-3 p-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-ink-muted">
                  {msg.handoff.title}
                </h3>

                {handoff.state === 'delivering' && <Banner tone="info">{msg.handoff.delivering}</Banner>}
                {handoff.state === 'waiting_receiver' && <Banner tone="info">{msg.handoff.waitingReceiver}</Banner>}
                {handoff.state === 'delivered' && <Banner tone="ok">{msg.handoff.delivered}</Banner>}
                {(handoff.state === 'busy' ||
                  handoff.state === 'timeout' ||
                  handoff.state === 'no_receiver' ||
                  handoff.state === 'version_mismatch' ||
                  handoff.state === 'error') && (
                  <Banner
                    tone="warn"
                    action={
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startHandoff(settledMatch, activeGroup?.join_target)}
                      >
                        {msg.handoff.retry}
                      </Button>
                    }
                  >
                    {handoff.state === 'busy' && msg.handoff.busy}
                    {handoff.state === 'timeout' && msg.handoff.timeout}
                    {handoff.state === 'no_receiver' && msg.handoff.noReceiver}
                    {handoff.state === 'version_mismatch' && msg.handoff.versionMismatch}
                    {handoff.state === 'error' && (handoff.detail || msg.handoff.error)}
                  </Banner>
                )}
                {handoff.state === 'missing_config' && <Banner tone="info">{msg.handoff.missingConfig}</Banner>}

                {handoff.host && handoff.port && handoff.state !== 'delivered' && (
                  <div className="space-y-2">
                    {!handoff.game_reachable && (
                      <div className="text-xs font-medium text-warn">{msg.handoff.gameUnreachable}</div>
                    )}
                    <p className="text-xs text-ink-faint">{msg.handoff.manualJoinHint}</p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-edge bg-base px-3 py-1.5 font-mono text-sm text-ink">
                        {handoff.host}:{handoff.port}
                      </span>
                      <Button variant="outline" size="sm" onClick={copyJoinAddress}>
                        <Icon as={Copy} size={14} />
                        {copied ? msg.handoff.copied : msg.handoff.copy}
                      </Button>
                    </div>
                  </div>
                )}
              </Inset>
            )}
          </div>
        )}
      </Panel>

      {/* Recent matches */}
      <Panel className="px-6 py-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">{msg.play.recentMatches}</h2>
          <button
            type="button"
            onClick={refreshRecent}
            title={msg.common.refresh}
            className="rounded-md p-2 text-ink-faint transition-colors duration-150 hover:bg-raised hover:text-ink"
          >
            <Icon as={RefreshCw} size={16} />
          </button>
        </div>
        {recentLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : recentMatches.length === 0 ? (
          <EmptyState icon={<Icon as={History} size={34} />} title={msg.play.noRecentMatches} />
        ) : (
          <ul className="divide-y divide-edge/70">
            {recentMatches.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onViewMatch(m.id)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-3 text-left transition-colors duration-150 hover:bg-raised"
                >
                  <Badge tone="accent" className="font-mono">{m.match_type}</Badge>
                  <span className="flex-1 truncate text-sm text-ink">{m.map_name || '—'}</span>
                  <span className="font-mono text-xs tabular-nums text-ink-faint">
                    {new Date(m.finished_at).toLocaleString()}
                  </span>
                  <Icon as={ChevronRight} size={16} className="text-ink-faint" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
