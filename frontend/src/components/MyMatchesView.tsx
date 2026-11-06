import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, History, Play, RefreshCw } from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  Panel,
  Select,
  Skeleton,
  Table,
  Td,
  Th,
} from '@ha/ui';
import type { BadgeTone } from '@ha/ui';
import { GetMyMatches, GetMatch } from '../../wailsjs/go/main/App';
import { t, loadErrorMessage } from '../i18n';
import { authFetch } from '../session';

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
  // Own-view summary (contract v1.7.0); omitted by servers without it.
  self_summary?: SelfSummaryView;
}

interface SelfSummaryView {
  team_id: string;
  is_winner: boolean;
  is_draw: boolean;
  rank_score_delta: number;
  rank_score_after: number;
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

function resultChip(p: ParticipantDetail): { text: string; tone: BadgeTone } {
  const msg = t().career;
  if (p.is_draw) return { text: msg.resultDraw, tone: 'neutral' };
  if (p.is_winner) return { text: msg.resultWin, tone: 'ok' };
  return { text: msg.resultLose, tone: 'danger' };
}

// Own-view result badge for a list row (contract v1.7.0 self_summary);
// null when the server did not provide it.
function selfResultChip(ss: SelfSummaryView | undefined): { text: string; tone: BadgeTone } | null {
  if (!ss) return null;
  const msg = t().career;
  if (ss.is_draw) return { text: msg.drawResult, tone: 'neutral' };
  if (ss.is_winner) return { text: msg.victory, tone: 'ok' };
  return { text: msg.defeat, tone: 'danger' };
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
  // The opened row's own-view summary (list-level, contract v1.7.0); the
  // detail dialog uses it to reconcile against the participant rows and as
  // a fallback when participants are unavailable.
  const [detailSelfSummary, setDetailSelfSummary] = useState<SelfSummaryView | null>(null);

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
      openDetail(focusMatchId, null);
      onConsumeFocus?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMatchId]);

  const openDetail = async (id: number, selfSummary: SelfSummaryView | null) => {
    setDetail({ id } as MatchDetail);
    setDetailSelfSummary(selfSummary);
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
    setDetailSelfSummary(null);
  };

  const handlePageSizeChange = (size: string) => {
    setPageSize(Number(size));
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
      ? { text: msg.career.drawResult, tone: 'neutral' as BadgeTone }
      : myParticipant.is_winner
        ? { text: msg.career.victory, tone: 'ok' as BadgeTone }
        : { text: msg.career.defeat, tone: 'danger' as BadgeTone }
    : detailSelfSummary
      ? detailSelfSummary.is_draw
        ? { text: msg.career.drawResult, tone: 'neutral' as BadgeTone }
        : detailSelfSummary.is_winner
          ? { text: msg.career.victory, tone: 'ok' as BadgeTone }
          : { text: msg.career.defeat, tone: 'danger' as BadgeTone }
      : undefined;

  // Own delta/after for the detail header: participant rows are primary,
  // the list-level self_summary reconciles/fills the "after" score.
  const myDelta =
    myParticipant !== undefined
      ? myParticipant.rank_score_delta
      : detailSelfSummary?.rank_score_delta;
  const myAfter =
    detailSelfSummary?.rank_score_after ??
    (myParticipant ? myParticipant.rank_score_before + myParticipant.rank_score_delta : undefined);

  return (
    <div className="space-y-6">
      {/* Header + controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-display font-bold tracking-tight text-ink">{msg.career.title}</h1>
        <div className="flex items-end gap-3">
          <Field label={msg.career.pageSize}>
            <Select
              value={String(pageSize)}
              onValueChange={handlePageSizeChange}
              ariaLabel={msg.career.pageSize}
              options={[
                { value: '10', label: '10' },
                { value: '20', label: '20' },
                { value: '50', label: '50' },
              ]}
              className="w-24"
            />
          </Field>
          <button
            type="button"
            onClick={fetchMatches}
            title={msg.common.refresh}
            className="mb-0.5 rounded-md border border-edge-strong p-2.5 text-ink-muted transition-colors duration-150 hover:bg-raised hover:text-ink"
          >
            <Icon as={RefreshCw} size={16} />
          </button>
        </div>
      </div>

      {error ? (
        <Panel>
          <ErrorState message={error} onRetry={fetchMatches} />
        </Panel>
      ) : (
        <Panel>
          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <EmptyState
              icon={<Icon as={History} size={34} />}
              title={msg.career.emptyTitle}
              hint={msg.career.emptyHint}
              action={
                onFindMatch && (
                  <Button variant="primary" onClick={onFindMatch}>
                    <Icon as={Play} size={16} />
                    {msg.play.findMatch}
                  </Button>
                )
              }
            />
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    {msg.career.headers.map((h) => (
                      <Th key={h}>{h}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => {
                    const self = selfResultChip(m.self_summary);
                    return (
                      <tr
                        key={m.id}
                        onClick={() => openDetail(m.id, m.self_summary ?? null)}
                        className="cursor-pointer transition-colors duration-150 hover:bg-raised"
                      >
                        <Td className="whitespace-nowrap font-mono text-xs text-ink-muted">
                          {formatTime(m.finished_at)}
                        </Td>
                        <Td>
                          <Badge tone="accent" className="font-mono">{m.match_type}</Badge>
                        </Td>
                        <Td>
                          {self ? (
                            <Badge tone={self.tone} strong>{self.text}</Badge>
                          ) : (
                            <span className="text-ink-faint">—</span>
                          )}
                        </Td>
                        <Td
                          className={`font-mono font-bold tabular-nums ${
                            m.self_summary
                              ? m.self_summary.rank_score_delta >= 0
                                ? 'text-ok'
                                : 'text-danger'
                              : 'text-ink-faint'
                          }`}
                        >
                          {m.self_summary ? formatPts(m.self_summary.rank_score_delta) : '—'}
                        </Td>
                        <Td className="text-ink">{m.map_name || '—'}</Td>
                        <Td className="text-ink-muted">{winnerLabel(m.winner_team_id)}</Td>
                        <Td className="font-mono text-xs tabular-nums text-ink-muted">
                          {formatDuration(m.duration_seconds)}
                        </Td>
                        <Td className="text-ink-faint">{m.source || '—'}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-end gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                  disabled={pageNum <= 1}
                  title={msg.career.previousPage}
                  className="rounded-md p-2 text-ink-muted transition-colors duration-150 hover:bg-raised hover:text-ink disabled:opacity-30"
                >
                  <Icon as={ChevronLeft} size={16} />
                </button>
                <span className="font-mono text-xs tabular-nums text-ink-muted">
                  {msg.career.page} {pageNum}
                </span>
                <button
                  type="button"
                  onClick={() => setPageNum((p) => p + 1)}
                  disabled={matches.length < pageSize}
                  title={msg.career.nextPage}
                  className="rounded-md p-2 text-ink-muted transition-colors duration-150 hover:bg-raised hover:text-ink disabled:opacity-30"
                >
                  <Icon as={ChevronRight} size={16} />
                </button>
              </div>
            </>
          )}
        </Panel>
      )}

      {/* Match detail dialog */}
      <Dialog
        open={detail !== null}
        onClose={closeDetail}
        wide
        title={`${msg.career.title} ${detail ? `#${detail.id}` : ''}`}
        footer={
          <Button variant="outline" onClick={closeDetail}>
            {msg.common.close}
          </Button>
        }
      >
        {detailLoading && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-2/3" />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {detailError && (
          <ErrorState
            message={detailError}
            onRetry={detail ? () => openDetail(detail.id, detailSelfSummary) : undefined}
          />
        )}
        {!detailLoading && !detailError && detail && (
          <div className="space-y-4">
            {/* Header chips: own result + match facts */}
            <div className="flex flex-wrap items-center gap-2">
              {myResultChip && (
                <Badge tone={myResultChip.tone} strong className="px-3 py-1 text-sm">
                  {myDelta !== undefined && !(myParticipant?.is_draw ?? detailSelfSummary?.is_draw)
                    ? `${myResultChip.text} · ${formatPts(myDelta)}`
                    : myResultChip.text}
                </Badge>
              )}
              <Badge tone="accent" className="font-mono">
                {msg.career.detailType}: {detail.match_type}
              </Badge>
              <Badge>{msg.career.detailSource}: {detail.source || '—'}</Badge>
              <Badge>{msg.career.detailMap}: {detail.map_name || '—'}</Badge>
              <Badge tone={detail.winner_team_id ? 'ok' : 'neutral'}>
                {detail.winner_team_id
                  ? `${msg.career.detailWinner}: ${msg.common.team} ${detail.winner_team_id}`
                  : msg.common.draw}
              </Badge>
            </div>

            <p className="font-mono text-xs leading-relaxed text-ink-faint">
              {msg.career.detailStarted} {formatTime(detail.started_at)} · {msg.career.detailFinished}{' '}
              {formatTime(detail.finished_at)} · {msg.career.detailDuration}{' '}
              {formatDuration(detail.duration_seconds)}
              {myAfter !== undefined && (
                <> · {msg.career.scoreAfter}: {myAfter.toLocaleString()}</>
              )}
            </p>

            {detail.participants && detail.participants.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-edge">
                <Table>
                  <thead>
                    <tr>
                      {msg.career.detailHeaders.map((h) => (
                        <Th key={h}>{h}</Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.participants.map((p) => {
                      const result = resultChip(p);
                      const isMe = userUid !== undefined && p.uid === userUid;
                      return (
                        <tr key={`${p.uid}-${p.team_id}`} className={isMe ? 'bg-accent/10' : ''}>
                          <Td className={`font-mono ${isMe ? 'font-bold text-accent' : 'text-ink'}`}>
                            #{p.uid}
                          </Td>
                          <Td className="text-ink">{p.team_id}</Td>
                          <Td>
                            <Badge tone={result.tone}>{result.text}</Badge>
                          </Td>
                          <Td className="font-mono tabular-nums text-ink">{p.kills}</Td>
                          <Td className="font-mono tabular-nums text-ink">{p.deaths}</Td>
                          <Td className="font-mono tabular-nums text-ink-muted">
                            {formatDuration(p.survival_time)}
                          </Td>
                          <Td
                            className={`font-mono font-bold tabular-nums ${
                              p.rank_score_delta >= 0 ? 'text-ok' : 'text-danger'
                            }`}
                          >
                            {formatPts(p.rank_score_delta)}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            ) : (
              <Banner tone="info">{msg.career.noParticipants}</Banner>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
