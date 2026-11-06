import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Chip, Alert, Button, Skeleton } from '@mui/material';
import { EmojiEvents as TrophyIcon } from '@mui/icons-material';
import { GetMyRanking, GetTopRankings } from '../../wailsjs/go/main/App';
import { t, loadErrorMessage } from '../i18n';
import { authFetch } from '../session';

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

// TOTAL_PROBE_LIMIT bounds the probe used to learn the ranked population.
// When the probe returns fewer rows than requested, the total is exact and a
// "Top X%" positioning can be shown; otherwise only the absolute rank is
// shown (a total-count field is a backend enhancement, see PENDING-DECISIONS).
const TOTAL_PROBE_LIMIT = 1000;

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

  const load = useCallback(async () => {
    setState('loading');
    setMyRank(null);
    setTotalKnown(null);

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

    // Population probe for the "Top X%" positioning (silent on failure:
    // the absolute rank stays displayable without it).
    try {
      const probe = await authFetch(() => GetTopRankings(rankType, TOTAL_PROBE_LIMIT, season));
      const rows = probe?.data ?? probe;
      if (Array.isArray(rows) && rows.length < TOTAL_PROBE_LIMIT) {
        setTotalKnown(rows.length);
      }
    } catch {
      setTotalKnown(null);
    }
  }, [rankType, season]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === 'loading') {
    return (
      <Card sx={{ backgroundColor: '#16213e', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <CardContent>
          <Skeleton height={28} width={160} sx={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <Skeleton height={44} sx={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
        </CardContent>
      </Card>
    );
  }

  if (state === 'error') {
    return (
      <Alert
        severity="error"
        sx={{ backgroundColor: 'rgba(211, 47, 47, 0.1)', color: '#ff6b6b' }}
        action={
          <Button color="inherit" size="small" onClick={load}>
            {msg.common.retry}
          </Button>
        }
      >
        {loadErrorMessage(msg.rankCard.loadErrorData)}
      </Alert>
    );
  }

  if (state === 'unranked' || !myRank) {
    return (
      <Card sx={{ backgroundColor: '#16213e', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <TrophyIcon sx={{ fontSize: 36, color: 'rgba(255,255,255,0.3)', mb: 1 }} />
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            {msg.rankCard.unrankedTitle}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            {msg.rankCard.unrankedHint}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const topLabel = totalKnown !== null ? topPercentLabel(myRank.rank_position, totalKnown) : null;

  return (
    <Card sx={{ backgroundColor: '#16213e', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrophyIcon sx={{ color: '#ffd700' }} />
            <Typography variant="h6">{msg.rankCard.title}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={`${msg.career.detailType}: ${rankType}`}
              size="small"
              sx={{ backgroundColor: 'rgba(233, 69, 96, 0.2)', color: '#e94560' }}
            />
            <Chip
              label={`${msg.rankCard.season} ${season}`}
              size="small"
              sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {msg.rankCard.score}
            </Typography>
            <Typography variant="h4" sx={{ color: '#ffd700', fontWeight: 'bold' }}>
              {myRank.score.toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {msg.rankCard.rank}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              #{myRank.rank_position}
              {topLabel && (
                <Typography component="span" variant="body2" sx={{ ml: 1, color: '#4ecca3' }}>
                  {topLabel}
                </Typography>
              )}
            </Typography>
          </Box>
          {winsCount !== undefined && (
            <Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {msg.rankCard.wins}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {winsCount}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
