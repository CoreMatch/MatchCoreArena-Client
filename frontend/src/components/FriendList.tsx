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
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { GetFriends } from '../../wailsjs/go/main/App';
import { t, loadErrorMessage } from '../i18n';
import { authFetch } from '../session';
import { EmptyState, ErrorState, LoadingList } from './StateViews';

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

  const friendName = (friend: Friend) =>
    friend.username || msg.friends.userTemplate.replace('{uuid}', friend.friend_uuid);

  if (loading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">{msg.friends.title}</Typography>
        </Box>
        <Card>
          <LoadingList rows={4} rowHeight={56} />
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{msg.friends.title}</Typography>
        <IconButton onClick={fetchFriends} title={msg.common.refresh}>
          <RefreshIcon />
        </IconButton>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        {msg.readOnly.notice}
      </Alert>

      {error ? (
        <Card>
          <ErrorState message={error} onRetry={fetchFriends} />
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {friends.length === 0 ? (
              <EmptyState
                icon={<GroupIcon />}
                title={msg.friends.emptyTitle}
                hint={msg.friends.emptyHint}
              />
            ) : (
              <List sx={{ width: '100%' }}>
                {friends.map((friend, index) => (
                  <Box key={friend.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {friend.username?.charAt(0)?.toUpperCase() || 'U'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                              {friendName(friend)}
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
                          <Typography variant="body2" color="text.disabled">
                            {msg.friends.level} {friend.level || '?'} • {msg.friends.added}{' '}
                            {new Date(friend.created_at).toLocaleDateString()}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < friends.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
