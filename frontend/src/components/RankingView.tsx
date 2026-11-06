import { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, Trophy } from 'lucide-react';
import { EmptyState, ErrorState, Field, Icon, Panel, Select, Skeleton, Table, Td, Th } from '@ha/ui';
import { GetTopRankings } from '../../wailsjs/go/main/App';
import { authFetch } from '../session';
import { t, loadErrorMessage } from '../i18n';
import RankCard from './RankCard';

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
      case 1: return 'text-gold';
      case 2: return 'text-silver';
      case 3: return 'text-bronze';
      default: return 'text-ink-muted';
    }
  };

  const topLabel = (count: number) => msg.rankings.topTemplate.replace('{count}', String(count));
  const playerLabel = (uid: number) => msg.rankings.playerTemplate.replace('{uid}', String(uid));

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <Panel className="p-8">
          <Skeleton className="mb-4 h-7 w-48" />
          <Skeleton className="h-14 w-full" />
        </Panel>
        <Panel className="p-6">
          <div className="space-y-3">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header + filters */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="text-display font-bold tracking-tight text-ink">
          {msg.nav.rankings}
          {totalCount > 0 && (
            <span className="ml-3 font-mono text-xl font-medium tabular-nums text-ink-faint">
              ({totalCount.toLocaleString()})
            </span>
          )}
        </h1>
        <div className="flex flex-wrap items-end gap-4">
          <Field label={msg.rankings.type}>
            <Select
              value={rankType}
              onValueChange={setRankType}
              ariaLabel={msg.rankings.type}
              options={[
                { value: '1v1', label: '1v1' },
                { value: '2v2', label: '2v2' },
              ]}
              className="w-28"
            />
          </Field>
          <Field label={msg.rankings.season}>
            <Select
              value={String(season)}
              onValueChange={(v) => setSeason(Number(v))}
              ariaLabel={msg.rankings.season}
              options={[1, 2, 3].map((n) => ({ value: String(n), label: `${msg.rankCard.season} ${n}` }))}
              className="w-32"
            />
          </Field>
          <Field label={msg.rankings.limit}>
            <Select
              value={String(limit)}
              onValueChange={(v) => setLimit(Number(v))}
              ariaLabel={msg.rankings.limit}
              options={[50, 100, 200, 500].map((n) => ({ value: String(n), label: topLabel(n) }))}
              className="w-32"
            />
          </Field>
          <button
            type="button"
            onClick={fetchRankings}
            title={msg.common.refresh}
            className="mb-0.5 rounded-md border border-edge-strong p-3 text-ink-muted transition-colors duration-150 hover:bg-raised hover:text-ink"
          >
            <Icon as={RefreshCw} size={18} />
          </button>
        </div>
      </div>

      {/* My Rank Card (A4) */}
      <RankCard rankType={rankType} season={season} winsCount={winsCount} />

      {/* Rankings table */}
      {error ? (
        <Panel>
          <ErrorState message={error} onRetry={fetchRankings} />
        </Panel>
      ) : (
        <Panel>
          {rankings.length === 0 ? (
            <EmptyState
              icon={<Icon as={BarChart3} size={34} />}
              title={msg.rankings.emptyTitle}
              hint={msg.rankings.emptyHint}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th className="w-28">{msg.rankings.colRank}</Th>
                  <Th>{msg.rankings.colPlayer}</Th>
                  <Th className="text-right">{msg.rankings.colScore}</Th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((entry) => (
                  <tr key={entry.id} className="transition-colors duration-150 hover:bg-raised">
                    <Td>
                      <span className="flex items-center gap-2.5">
                        {entry.rank_position <= 3 && (
                          <Icon as={Trophy} size={18} className={getRankColor(entry.rank_position)} />
                        )}
                        <span className={`font-mono text-lg font-bold tabular-nums ${getRankColor(entry.rank_position)}`}>
                          {entry.rank_position}
                        </span>
                      </span>
                    </Td>
                    <Td>
                      <span className="flex items-center gap-3.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-sm font-bold text-on-accent">
                          P
                        </span>
                        <span className="text-base text-ink">{playerLabel(entry.user_uid)}</span>
                      </span>
                    </Td>
                    <Td className="text-right font-mono text-lg font-bold tabular-nums text-ink">
                      {entry.score.toLocaleString()}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      )}
    </div>
  );
}
