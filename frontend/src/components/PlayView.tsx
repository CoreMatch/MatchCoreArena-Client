import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, Circle, Clock, Hourglass, Info, ListChecks, Plus } from 'lucide-react';
import {
  Asset,
  Badge,
  Banner,
  Button,
  EmptyState,
  Field,
  Icon,
  Input,
  Inset,
  Panel,
  patternStyle,
  Skeleton,
  Stat,
  Stepper,
} from '@ha/ui';
import type { AssetId } from '@ha/ui';
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
  // Reserved room on the target sub-server (contract v1.10.0 room layer);
  // omitted without a room inventory or when the reservation lapsed.
  room?: string;
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

// The arena API exposes no Minecraft UUID for the signed-in player, so the
// party roster's self entry is entered once and remembered locally.
const SELF_UUID_STORAGE_KEY = 'mca_self_uuid';

// Expectation management for unusually long waits (research 04 §A2).
const LONG_WAIT_SECS = 60;

// Mode graphics from the asset library; unknown modes fall back to a badge.
const MODE_ASSETS: Record<string, AssetId> = {
  '1v1': 'mode-1v1',
  '2v2': 'mode-2v2',
  '4v4': 'mode-4v4',
  ffa: 'mode-ffa',
};

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
  const [partySelfUuid, setPartySelfUuid] = useState(() => {
    try {
      return localStorage.getItem(SELF_UUID_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
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

  // Persist the self UUID so the player does not retype it every launch.
  useEffect(() => {
    try {
      localStorage.setItem(SELF_UUID_STORAGE_KEY, partySelfUuid);
    } catch {
      // Storage unavailable — the value still works for this session.
    }
  }, [partySelfUuid]);

  const findMatch = async () => {
    setError(null);
    setErrorDetail(null);

    // Server-side `party_members` is the complete roster and Join does not
    // add the authenticated caller, so the player's own UUID must lead it.
    // A party also needs at least two players (contract v1.4.0).
    let roster = partyMembers;
    if (partyOpen || partyMembers.length > 0) {
      const selfUuid = normalizeUuid(partySelfUuid.trim());
      if (!/^[0-9a-f]{32}$/.test(selfUuid)) {
        setPartyError(msg.play.partySelfRequired);
        return;
      }
      const deduped = [selfUuid, ...partyMembers.filter((u) => u !== selfUuid)];
      if (deduped.length < 2) {
        setPartyError(msg.play.partyTooSmall);
        return;
      }
      roster = deduped;
      setPartyError(null);
    }

    setPhase('joining');
    try {
      await snapshotMatches();
      const statusResp = await authFetch(() => GetMatchmakingStatus());
      const status = (statusResp?.data ?? statusResp) as MatchmakingStatusView;
      baselineGroupIds.current = new Set((status.recent_groups ?? []).map((g) => g.group_id));

      await authFetch(() => JoinMatchmaking(mode.trim(), roster));
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
        return <Badge tone="warn" strong><Asset id="flow-queued" size={16} />{msg.play.stateQueued}</Badge>;
      case 'found':
        return <Badge tone="ok" strong><Asset id="flow-match-found" size={16} />{msg.play.stateFound}</Badge>;
      case 'in_match':
        return <Badge tone="info" strong><Asset id="flow-in-match" size={16} />{msg.play.stateInMatch}</Badge>;
      case 'settled':
        return <Badge tone="neutral" strong><Asset id="flow-settled" size={16} />{msg.play.stateSettled}</Badge>;
      default:
        return null;
    }
  };

  const stepIndex = phaseStepIndex(phase);
  const stepLabels = [msg.play.stateQueued, msg.play.stateFound, msg.play.stateInMatch, msg.play.stateSettled];
  const stepIcons = [
    <Asset key="q" id="flow-queued" size={20} />,
    <Asset key="f" id="flow-match-found" size={20} />,
    <Asset key="m" id="flow-in-match" size={20} />,
    <Asset key="s" id="flow-settled" size={20} />,
  ];

  // Compact handoff status: short word + icon on screen, full sentence in
  // the tooltip.
  const handoffView = (state: string, detail?: string): { short: string; full: string; tone: 'info' | 'ok' | 'warn' } => {
    switch (state) {
      case 'delivering':
        return { short: msg.handoff.deliveringShort, full: msg.handoff.delivering, tone: 'info' };
      case 'waiting_receiver':
        return { short: msg.handoff.waitingReceiverShort, full: msg.handoff.waitingReceiver, tone: 'info' };
      case 'delivered':
        return { short: msg.handoff.deliveredShort, full: msg.handoff.delivered, tone: 'ok' };
      case 'busy':
        return { short: msg.handoff.busyShort, full: msg.handoff.busy, tone: 'warn' };
      case 'timeout':
        return { short: msg.handoff.timeoutShort, full: msg.handoff.timeout, tone: 'warn' };
      case 'no_receiver':
        return { short: msg.handoff.noReceiverShort, full: msg.handoff.noReceiver, tone: 'warn' };
      case 'version_mismatch':
        return { short: msg.handoff.versionMismatchShort, full: msg.handoff.versionMismatch, tone: 'warn' };
      case 'missing_config':
        return { short: msg.handoff.missingConfigShort, full: msg.handoff.missingConfig, tone: 'warn' };
      default:
        return { short: msg.handoff.errorShort, full: detail || msg.handoff.error, tone: 'warn' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-display font-bold tracking-tight text-ink">{msg.play.title}</h1>
        {phaseBadge()}
        <span title={msg.readOnly.notice} className="cursor-help text-ink-faint">
          <Icon as={Info} size={18} />
        </span>
      </div>

      {error && (
        <Banner tone="danger">
          <span title={errorDetail ?? undefined}>{error}</span>
        </Banner>
      )}

      {/* Player + rank — one big block instead of small parallel cards */}
      <Panel className="p-8">
        <div
          className="mb-8 flex flex-wrap items-center gap-x-12 gap-y-6 rounded-md border-b border-edge/60 pb-8"
          style={patternStyle('pattern-grid-fine')}
        >
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-md bg-accent text-2xl font-bold text-on-accent">
              {user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </span>
            <div>
              <div className="text-2xl font-bold text-ink">{user?.username || 'Player'}</div>
              <div className="mt-1.5">
                <Badge tone="accent" strong>{msg.play.level} {user?.level || 1}</Badge>
              </div>
            </div>
          </div>
          <Stat label={msg.play.experience} value={(user?.experience ?? 0).toLocaleString()} size="display" tone="ok" />
          <Stat label={msg.play.rankScore} value={user?.rank_score ?? '—'} size="display" tone="gold" />
        </div>
        <RankCard embedded rankType={mode.trim() || '1v1'} season={1} winsCount={user?.wins_count} />
      </Panel>

      {/* Queue card */}
      <Panel className="p-8">
        <h2 className="mb-6 text-2xl font-bold text-ink">{msg.play.queueCardTitle}</h2>

        {/* Phase indicator: one glance tells where the cycle stands */}
        {stepIndex >= 0 && (
          <div className="mb-8">
            <Stepper steps={stepLabels} active={stepIndex} icons={stepIcons} />
          </div>
        )}

        {(phase === 'idle' || phase === 'joining') && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-4">
              <Field label={msg.play.mode} className="w-48">
                <Input value={mode} onChange={(e) => setMode(e.target.value)} className="font-mono" />
              </Field>
              {MODE_ASSETS[mode.trim().toLowerCase()] && (
                <Asset id={MODE_ASSETS[mode.trim().toLowerCase()]} size={40} className="mb-1 text-ink-muted" />
              )}
              <Button
                variant={partyOpen ? 'primary' : 'outline'}
                onClick={() => setPartyOpen((v) => !v)}
                aria-expanded={partyOpen}
                title={msg.play.partyHint}
              >
                <Asset id="mode-team" size={18} />
                {msg.play.partyToggle}
              </Button>
            </div>

            {partyOpen && (
              <div className="space-y-4 rounded-md bg-raised p-6">
                <Field label={msg.play.partySelfLabel}>
                  <Input
                    placeholder={msg.play.partySelfPlaceholder}
                    value={partySelfUuid}
                    onChange={(e) => setPartySelfUuid(e.target.value)}
                    className="font-mono"
                  />
                </Field>
                <div className="flex gap-3">
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
                    <Icon as={Plus} size={18} />
                    {msg.play.partyAdd}
                  </Button>
                </div>
                {partyError && <div className="text-sm font-medium text-danger">{partyError}</div>}
                {partyMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {partyMembers.map((uuid) => (
                      <span
                        key={uuid}
                        className="inline-flex items-center gap-2 rounded-md bg-panel px-3 py-1.5 font-mono text-sm text-ink-muted"
                      >
                        {uuid}
                        <button
                          type="button"
                          onClick={() => setPartyMembers((prev) => prev.filter((u) => u !== uuid))}
                          className="text-ink-faint transition-colors duration-150 hover:text-danger"
                          aria-label={`Remove ${uuid}`}
                        >
                          <Asset id="icon-cancel" size={13} />
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
              className="w-full uppercase tracking-widest"
            >
              <Asset id="icon-play" size={22} />
              {phase === 'joining' ? msg.play.joining : msg.play.findMatch}
            </Button>

            {/* Get-started checklist (guidance state, research 04 §A6) —
                folded into the queue block until the first settled match */}
            {(user?.wins_count ?? 0) === 0 && (
              <div className="border-t border-edge/60 pt-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-faint">
                  <Icon as={ListChecks} size={18} />
                  {msg.play.getStartedTitle}
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <Asset id="icon-check" size={20} className="text-ok" />
                    <span className="flex-1 text-base text-ink-muted">{msg.play.getStartedSignIn}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Icon as={Circle} size={20} className="text-ink-faint" />
                    <span className="flex-1 text-base text-ink">{msg.play.getStartedQueue}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={findMatch}
                      disabled={phase === 'joining' || mode.trim() === ''}
                    >
                      {msg.play.findMatch}
                    </Button>
                  </li>
                  <li className="flex items-center gap-3">
                    <Icon as={Circle} size={20} className="text-ink-faint" />
                    <span className="flex-1 text-base text-ink">{msg.play.getStartedRankings}</span>
                    {onOpenRankings && (
                      <Button variant="outline" size="sm" onClick={onOpenRankings}>
                        {msg.play.viewRankings}
                      </Button>
                    )}
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}

        {phase === 'queued' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <span className="font-mono text-hero font-bold tabular-nums text-warn">
                {formatWait(queueEntry?.enqueued_at ?? '', now)}
              </span>
              {queueStats && (
                <div className="flex items-end gap-8">
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-ink-faint">
                      <Asset id="mode-avatar" size={15} />
                      {msg.play.playersLabel}
                    </div>
                    <div className="font-mono text-display font-bold tabular-nums text-ink">
                      {queueStats.players}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-ink-faint">
                      <Asset id="mode-team" size={15} />
                      {msg.play.partiesLabel}
                    </div>
                    <div className="font-mono text-display font-bold tabular-nums text-ink">
                      {queueStats.parties}
                    </div>
                  </div>
                  {queueStats.average_wait_seconds > 0 && (
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-ink-faint">
                        <Icon as={Clock} size={15} />
                        {msg.play.avgWaitLabel}
                      </div>
                      <div className="font-mono text-display font-bold tabular-nums text-ink-muted">
                        {formatSeconds(queueStats.average_wait_seconds)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-base text-ink-muted">
                {msg.play.waiting} · {queueEntry?.match_type ?? mode}
                {queueEntry?.party_id ? ` · ${msg.play.partyToggle}` : ''}
              </span>
              {waitSeconds(queueEntry?.enqueued_at ?? '', now) >= LONG_WAIT_SECS && (
                <span title={msg.play.queueLongWait}>
                  <Badge tone="warn"><Icon as={Hourglass} size={14} />{msg.play.longQueueShort}</Badge>
                </span>
              )}
            </div>
            <Button variant="outline" onClick={cancelQueue}>
              <Asset id="icon-cancel" size={18} />
              {msg.play.cancelQueue}
            </Button>
          </div>
        )}

        {(phase === 'found' || phase === 'in_match') && activeGroup && (
          <div className="space-y-6">
            <div
              className={`text-display font-bold tracking-tight ${
                phase === 'found' ? 'text-ok' : 'text-info'
              }`}
            >
              {phase === 'found' ? msg.play.stateFound : msg.play.stateInMatch}
              <span className="ml-4 text-xl font-semibold text-ink-muted">
                {msg.play.groupLabel} #{activeGroup.group_id}
              </span>
            </div>

            <div className="space-y-3">
              {teamsOfGroup(activeGroup).map(([teamId, members]) => (
                <div key={teamId} className="flex flex-wrap items-center gap-2.5">
                  <Badge tone="accent" strong>{msg.common.team} {teamId}</Badge>
                  {members.map((m) => (
                    <span
                      key={m.uid}
                      className="rounded-md bg-raised px-3 py-1.5 font-mono text-sm text-ink-muted"
                    >
                      #{m.uid} · {m.rank_score}
                    </span>
                  ))}
                </div>
              ))}
            </div>

            {phase === 'found' && (
              <Inset className="space-y-4 p-6">
                {activeGroup.join_target ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <span
                      title={msg.play.joinServerHint}
                      className="cursor-help rounded-md bg-base px-4 py-2 font-mono text-base font-medium text-ink"
                    >
                      {activeGroup.join_target.host}:{activeGroup.join_target.port}
                    </span>
                    {activeGroup.room && (
                      <span
                        title={msg.play.roomHint}
                        className="cursor-help rounded-md bg-base px-4 py-2 font-mono text-base font-medium text-ink-muted"
                      >
                        {msg.play.roomLabel} {activeGroup.room}
                      </span>
                    )}
                    <Button variant="primary" onClick={copyGroupAddress}>
                      <Asset id="icon-copy" size={16} />
                      {copiedJoin ? msg.handoff.copied : msg.play.copyServerAddress}
                    </Button>
                  </div>
                ) : (
                  <span title={msg.play.joinServerMissing} className="cursor-help text-base text-ink-muted">
                    <Icon as={Info} size={16} className="mr-2 inline text-ink-faint" />
                    {msg.play.noAddressShort}
                  </span>
                )}
              </Inset>
            )}

            {phase === 'in_match' && (
              <div title={msg.play.waitingResults} className="flex items-center gap-2 text-base text-ink-muted">
                <Icon as={Hourglass} size={18} className="text-info" />
                {msg.play.resultsPending}
              </div>
            )}

            {/* Client-side exit: the formed group itself stays on the
                server; dismiss only stops tracking it here. */}
            <div>
              <span title={msg.play.dismissHint}>
                <Button variant="ghost" onClick={resetCycle}>
                  {msg.play.dismissMatch}
                </Button>
              </span>
            </div>
          </div>
        )}

        {phase === 'settled' && settledMatch && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Asset id="icon-check" size={30} className="text-ok" />
              <span className="text-display font-bold tracking-tight text-ink">
                {msg.play.matchRecorded}
              </span>
              <span className="font-mono text-xl text-ink-muted">#{settledMatch.id}</span>
            </div>
            <div className="flex gap-4">
              <Button variant="primary" size="lg" onClick={() => onViewMatch(settledMatch.id)}>
                {msg.play.viewDetails}
              </Button>
              <Button variant="outline" size="lg" onClick={resetCycle}>
                {msg.play.queueAgain}
              </Button>
            </div>

            {/* Match handoff (INTEROP-SPEC v1) */}
            {handoff && (
              <Inset className="p-6">
                {(() => {
                  const hv = handoffView(handoff.state, handoff.detail);
                  const toneText =
                    hv.tone === 'ok' ? 'text-ok' : hv.tone === 'warn' ? 'text-warn' : 'text-info';
                  const retryable =
                    handoff.state === 'busy' ||
                    handoff.state === 'timeout' ||
                    handoff.state === 'no_receiver' ||
                    handoff.state === 'version_mismatch' ||
                    handoff.state === 'error';
                  return (
                    <div className="flex flex-wrap items-center gap-4">
                      <span
                        title={hv.full}
                        className={`flex cursor-help items-center gap-2.5 text-base font-semibold ${toneText}`}
                      >
                        <Asset
                          id={hv.tone === 'ok' ? 'icon-check' : hv.tone === 'warn' ? 'icon-warning' : 'icon-loader'}
                          size={20}
                        />
                        {hv.short}
                      </span>
                      {retryable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startHandoff(settledMatch, activeGroup?.join_target)}
                        >
                          {msg.handoff.retry}
                        </Button>
                      )}
                    </div>
                  );
                })()}

                {handoff.host && handoff.port && handoff.state !== 'delivered' && (
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {!handoff.game_reachable && (
                      <span
                        title={msg.handoff.gameUnreachable}
                        className="flex cursor-help items-center gap-1.5 text-sm font-medium text-warn"
                      >
                        <Asset id="icon-warning" size={15} />
                        {msg.handoff.gameUnreachableShort}
                      </span>
                    )}
                    <span
                      title={msg.handoff.manualJoinHint}
                      className="cursor-help rounded-md bg-base px-4 py-2 font-mono text-base text-ink"
                    >
                      {handoff.host}:{handoff.port}
                    </span>
                    <Button variant="outline" onClick={copyJoinAddress}>
                      <Asset id="icon-copy" size={16} />
                      {copied ? msg.handoff.copied : msg.handoff.copy}
                    </Button>
                  </div>
                )}
              </Inset>
            )}
          </div>
        )}
      </Panel>

      {/* Recent matches */}
      <Panel className="p-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-ink">{msg.play.recentMatches}</h2>
          <button
            type="button"
            onClick={refreshRecent}
            title={msg.common.refresh}
            className="rounded-md p-2.5 text-ink-faint transition-colors duration-150 hover:bg-raised hover:text-ink"
          >
            <Asset id="icon-refresh" size={18} />
          </button>
        </div>
        {recentLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : recentMatches.length === 0 ? (
          <EmptyState
            illustration={<Asset id="state-no-match-record" size={240} />}
            title={msg.play.noRecentMatches}
          />
        ) : (
          <ul className="divide-y divide-edge/50">
            {recentMatches.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onViewMatch(m.id)}
                  className="flex w-full items-center gap-4 rounded-md px-3 py-4 text-left transition-colors duration-150 hover:bg-raised"
                >
                  {MODE_ASSETS[m.match_type.toLowerCase()] ? (
                    <span className="flex items-center gap-2.5 text-ink-muted">
                      <Asset id={MODE_ASSETS[m.match_type.toLowerCase()]} size={22} />
                      <span className="font-mono text-sm">{m.match_type}</span>
                    </span>
                  ) : (
                    <Badge tone="accent" className="font-mono">{m.match_type}</Badge>
                  )}
                  <span className="flex-1 truncate text-base text-ink">{m.map_name || '—'}</span>
                  <span className="font-mono text-sm tabular-nums text-ink-faint">
                    {new Date(m.finished_at).toLocaleString()}
                  </span>
                  <Icon as={ChevronRight} size={18} className="text-ink-faint" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
