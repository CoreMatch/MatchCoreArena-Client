import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  IconButton,
  Alert,
  Skeleton,
  Button,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { GetFriends } from '../../wailsjs/go/main/App';
import { t, loadErrorMessage } from '../i18n';
import { authFetch } from '../session';

interface Friend {
  id: number;
  user_uuid: string;
  friend_uuid: string;
  status: number; // 0=pending, 1=accepted, 2=rejected
  created_at: string;
  username?: string;
  level?: number;
}

export default function FriendList() {
  const msg = t();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    setLoading(true);
    setError(null);

    try {
      const resp = await authFetch(() => GetFriends());
      // Go returns models.SuccessEnvelope { success, message, data, meta }
      const data = resp?.data ?? resp;
      setFriends(data || []);
    } catch {
      setError(loadErrorMessage(t().common.dataFriends));
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0: return msg.friends.statusPending;
      case 1: return msg.friends.statusAccepted;
      case 2: return msg.friends.statusRejected;
      default: return msg.friends.statusUnknown;
    }
  };

  const getStatusColor = (status: number): 'warning' | 'success' | 'error' | 'default' => {
    switch (status) {
      case 0: return 'warning';
      case 1: return 'success';
      case 2: return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton width={200} height={48} sx={{ mb: 3, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <Card sx={{ backgroundColor: '#16213e', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <Box sx={{ p: 2 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={56} sx={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
            ))}
          </Box>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white' }}>
          {msg.friends.title}
        </Typography>
        <IconButton
          onClick={fetchFriends}
          sx={{ color: 'white' }}
          title={msg.common.refresh}
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      <Alert severity="info" sx={{ mb: 2, backgroundColor: 'rgba(2, 136, 209, 0.12)', color: '#8ecdf5' }}>
        {msg.readOnly.friendsNotice}
      </Alert>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, backgroundColor: 'rgba(211, 47, 47, 0.1)', color: '#ff6b6b' }}
          action={
            <Button color="inherit" size="small" onClick={fetchFriends}>
              {msg.common.retry}
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Card sx={{
        backgroundColor: '#16213e',
        color: 'white',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <CardContent sx={{ p: 0 }}>
          {friends.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                {msg.friends.emptyTitle}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                {msg.friends.emptyHint}
              </Typography>
            </Box>
          ) : (
            <List sx={{ width: '100%' }}>
              {friends.map((friend, index) => (
                <Box key={friend.id}>
                  <ListItem
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.05)',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#e94560' }}>
                        {friend.username?.charAt(0)?.toUpperCase() || 'U'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {friend.username || `User ${friend.friend_uuid}`}
                          </Typography>
                          <Chip
                            label={getStatusLabel(friend.status)}
                            size="small"
                            color={getStatusColor(friend.status)}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          {msg.friends.level} {friend.level || '?'} • {msg.friends.added}{' '}
                          {new Date(friend.created_at).toLocaleDateString()}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < friends.length - 1 && (
                    <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  )}
                </Box>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
