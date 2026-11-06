import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Chip, Skeleton, LinearProgress } from '@mui/material';
import { EmojiEvents as TrophyIcon } from '@mui/icons-material';
import { GetMyRanking, GetTopRankings, GetRankingTiers } from '../../wailsjs/go/main/App';
import { t, loadErrorMessage } from '../i18n';
import { authFetch } from '../session';
import { accentTint } from '../theme';
import { EmptyState, ErrorState } from './StateViews';

interface RankCardProps {
  rankType: string;
  season: number;
  winsCount?: number;
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

export default function RankCard({ rankType, season, winsCount }: RankCardProps) {
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
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Skeleton height={28} width={160} />
          <Skeleton height={44} />
        </CardContent>
      </Card>
    );
  }

  if (state === 'error') {
    return (
      <Card sx={{ height: '100%' }}>
        <ErrorState message={loadErrorMessage(msg.rankCard.loadErrorData)} onRetry={load} />
      </Card>
    );
  }

  if (state === 'unranked' || !myRank) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <EmptyState
            icon={<TrophyIcon />}
            title={msg.rankCard.unrankedTitle}
            hint={msg.rankCard.unrankedHint}
          />
        </CardContent>
      </Card>
    );
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

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrophyIcon sx={{ color: 'secondary.main' }} />
            <Typography variant="h6">{msg.rankCard.title}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {tier?.current && (
              <Chip label={tier.current.name} size="small" color="secondary" sx={{ fontWeight: 700 }} />
            )}
            <Chip label={`${msg.career.detailType}: ${rankType}`} size="small" sx={accentTint} />
            <Chip label={`${msg.rankCard.season} ${season}`} size="small" />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {msg.rankCard.score}
            </Typography>
            <Typography variant="h4" sx={{ color: 'secondary.main' }}>
              {myRank.score.toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {msg.rankCard.rank}
            </Typography>
            <Typography variant="h4">
              #{myRank.rank_position}
              {topLabel && (
                <Typography component="span" variant="body2" sx={{ ml: 1, color: 'success.main' }}>
                  {topLabel}
                </Typography>
              )}
            </Typography>
          </Box>
          {winsCount !== undefined && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                {msg.rankCard.wins}
              </Typography>
              <Typography variant="h4">{winsCount}</Typography>
            </Box>
          )}
        </Box>

        {/* Tier progress — only when the server provides a ladder */}
        {tier?.next && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={tierProgress}
              color="secondary"
              sx={{ height: 8, borderRadius: 1, mb: 0.5 }}
            />
            <Typography variant="caption" color="text.secondary">
              {msg.rankCard.toNextTemplate
                .replace('{pts}', String(toNextPts))
                .replace('{tier}', tier.next.name)}
            </Typography>
          </Box>
        )}
        {tier && tier.current && !tier.next && (
          <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 600, display: 'block', mt: 2 }}>
            {msg.rankCard.topTier}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
