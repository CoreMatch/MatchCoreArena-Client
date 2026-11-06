import { useState, useEffect, useCallback } from 'react';
import { Trophy } from 'lucide-react';
import { Badge, EmptyState, ErrorState, Icon, Panel, Progress, Skeleton } from '@ha/ui';
import { GetMyRanking, GetTopRankings, GetRankingTiers } from '../../wailsjs/go/main/App';
import { t, loadErrorMessage } from '../i18n';
import { authFetch } from '../session';

interface RankCardProps {
  rankType: string;
  season: number;
  winsCount?: number;
  // When embedded (inside a bigger block, e.g. the Play "You" panel) the
  // card renders without its own Panel frame.
  embedded?: boolean;
}

interface MyRank {
  score: number;
  rank_position: number;
  season: number;
}

// RankTier mirrors the server's display-only ladder entry (contract
// v1.7.0). Thresholds always come from the server — the client never
// hard-codes tier boundaries.
interface RankTierView {
  name: string;
  min_score: number;
}

// tierOf locates the player on the server-provided ladder: the current tier
// is the last entry whose min_score is reached; next is the following one
// (null at the top of the ladder).
function tierOf(score: number, tiers: RankTierView[]): { current: RankTierView | null; next: RankTierView | null } {
  const sorted = [...tiers].sort((a, b) => a.min_score - b.min_score);
  let current: RankTierView | null = null;
  let next: RankTierView | null = null;
  for (const tier of sorted) {
    if (score >= tier.min_score) {
      current = tier;
    } else {
      next = tier;
      break;
    }
  }
  return { current, next };
}

function topPercentLabel(position: number, total: number): string | null {
  if (total <= 0 || position <= 0) return null;
  const pct = (position / total) * 100;
  const msg = t().rankCard;
  if (pct < 0.1) return msg.topPercentTiny;
  return msg.topPercentTemplate.replace('{pct}', pct.toFixed(1));
}

export default function RankCard({ rankType, season, winsCount, embedded = false }: RankCardProps) {
  const msg = t();
  const [state, setState] = useState<'loading' | 'unranked' | 'ranked' | 'error'>('loading');
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [totalKnown, setTotalKnown] = useState<number | null>(null);
  const [tiers, setTiers] = useState<RankTierView[] | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    setMyRank(null);
    setTotalKnown(null);

    // 1. Fetch personal ranking. The Go backend translates the server's
    // typed 404 mca_ranking_not_found into (nil, nil); any other error is
    // propagated as a fault.
    try {
      const resp = await authFetch(() => GetMyRanking(rankType, season));
      const data = resp?.data ?? resp;
      if (!data || !data.rank_position) {
        setState('unranked');
      } else {
        setMyRank(data as MyRank);
        setState('ranked');
      }
    } catch {
      setState('error');
      return;
    }

    // 2. Fetch total population count for the "Top X%" positioning
    // (silent on failure: the absolute rank stays displayable without it).
    try {
      const probe = await authFetch(() => GetTopRankings(rankType, 1, season));
      const response = probe?.data ?? probe;
      if (!Array.isArray(response) && response?.total_count !== undefined) {
        setTotalKnown(response.total_count);
      } else if (Array.isArray(response)) {
        // Legacy flat-array fallback
        setTotalKnown(response.length);
      }
    } catch {
      setTotalKnown(null);
    }

    // 3. Display-only tier ladder (contract v1.7.0). Empty array = server
    // has no tiers configured → no progress bar; failures degrade silently
    // the same way. Thresholds are never invented client-side.
    try {
      const resp = await authFetch(() => GetRankingTiers());
      const rows = resp?.data ?? resp;
      setTiers(Array.isArray(rows) ? (rows as RankTierView[]) : null);
    } catch {
      setTiers(null);
    }
  }, [rankType, season]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === 'loading') {
    const body = (
      <>
        <Skeleton className="mb-4 h-7 w-48" />
        <Skeleton className="h-14 w-full" />
      </>
    );
    return embedded ? body : <Panel className="p-8">{body}</Panel>;
  }

  if (state === 'error') {
    const body = <ErrorState message={loadErrorMessage(msg.rankCard.loadErrorData)} onRetry={load} />;
    return embedded ? body : <Panel>{body}</Panel>;
  }

  if (state === 'unranked' || !myRank) {
    const body = (
      <EmptyState
        icon={<Icon as={Trophy} size={40} />}
        title={msg.rankCard.unrankedTitle}
        hint={msg.rankCard.unrankedHint}
      />
    );
    return embedded ? body : <Panel>{body}</Panel>;
  }

  const topLabel = totalKnown !== null ? topPercentLabel(myRank.rank_position, totalKnown) : null;
  const tier = tiers && tiers.length > 0 ? tierOf(myRank.score, tiers) : null;
  const toNextPts = tier?.next ? tier.next.min_score - myRank.score : 0;
  const tierProgress = tier?.next
    ? Math.min(
        100,
        Math.max(
          0,
          tier.current
            ? ((myRank.score - tier.current.min_score) /
                Math.max(1, tier.next.min_score - tier.current.min_score)) *
                100
            : (myRank.score / Math.max(1, tier.next.min_score)) * 100,
        ),
      )
    : 0;

  const rankedBody = (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon as={Trophy} className="text-gold" size={22} />
          <h2 className="text-2xl font-bold text-ink">{msg.rankCard.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {tier?.current && <Badge tone="gold" strong>{tier.current.name}</Badge>}
          <Badge tone="accent" className="font-mono">{rankType}</Badge>
          <Badge>{msg.rankCard.season} {season}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
        <div>
          <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-faint">
            {msg.rankCard.score}
          </div>
          <div className="font-mono text-hero font-bold tabular-nums text-gold">
            {myRank.score.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-faint">
            {msg.rankCard.rank}
          </div>
          <div className="font-mono text-hero font-bold tabular-nums text-ink">
            #{myRank.rank_position}
            {topLabel && <span className="ml-3 align-middle text-lg font-semibold text-ok">{topLabel}</span>}
          </div>
        </div>
        {winsCount !== undefined && (
          <div>
            <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-faint">
              {msg.rankCard.wins}
            </div>
            <div className="font-mono text-hero font-bold tabular-nums text-ink">{winsCount}</div>
          </div>
        )}
      </div>

      {/* Tier progress — only when the server provides a ladder */}
      {tier?.next && (
        <div className="mt-6">
          <Progress value={tierProgress} tone="gold" />
          <div className="mt-2 font-mono text-sm tabular-nums text-ink-faint">
            {msg.rankCard.toNextTemplate
              .replace('{pts}', String(toNextPts))
              .replace('{tier}', tier.next.name)}
          </div>
        </div>
      )}
      {tier && tier.current && !tier.next && (
        <div className="mt-5 text-sm font-bold uppercase tracking-wide text-gold">
          {msg.rankCard.topTier}
        </div>
      )}
    </>
  );

  return embedded ? rankedBody : <Panel className="p-8">{rankedBody}</Panel>;
}
