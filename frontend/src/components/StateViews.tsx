// Unified empty / error / loading presentations (competitive research 04
// §A5): empty = "nothing here yet" + the next action; error = one reason
// sentence + a retry affordance; loading = skeletons, never bare spinners.
// All three read their colors from the active theme, so they work unchanged
// on the dark and light themes.

import type { ReactNode } from 'react';
import { Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import {
  Refresh as RefreshIcon,
  ErrorOutlined as ErrorOutlineIcon,
} from '@mui/icons-material';
import { t } from '../i18n';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <Box sx={{ py: 3, px: 3, textAlign: 'center' }}>
      {icon && (
        <Box sx={{ color: 'text.disabled', mb: 1, '& svg': { fontSize: 40 } }}>
          {icon}
        </Box>
      )}
      <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
        {title}
      </Typography>
      {hint && (
        <Typography
          variant="body2"
          sx={{ color: 'text.disabled', mb: action ? 2 : 0, maxWidth: 420, mx: 'auto' }}
        >
          {hint}
        </Typography>
      )}
      {action}
    </Box>
  );
}

interface ErrorStateProps {
  message: string;
  detail?: string | null;
  onRetry?: () => void;
}

export function ErrorState({ message, detail, onRetry }: ErrorStateProps) {
  const msg = t();
  return (
    <Box sx={{ py: 3, px: 3, textAlign: 'center' }}>
      <ErrorOutlineIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', mb: detail || onRetry ? 2 : 0, maxWidth: 480, mx: 'auto' }}
      >
        {message}
      </Typography>
      {detail && (
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 1 }}>
          {detail}
        </Typography>
      )}
      {onRetry && (
        <Button variant="outlined" color="error" onClick={onRetry} startIcon={<RefreshIcon />}>
          {msg.common.retry}
        </Button>
      )}
    </Box>
  );
}

interface LoadingListProps {
  rows?: number;
  rowHeight?: number;
}

export function LoadingList({ rows = 5, rowHeight = 44 }: LoadingListProps) {
  return (
    <Stack spacing={1} sx={{ p: 2 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={rowHeight} variant="rounded" animation={i === 0 ? 'wave' : false} />
      ))}
    </Stack>
  );
}
