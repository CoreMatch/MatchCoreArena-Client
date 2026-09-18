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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { 
  GetFriends, 
  SendFriendRequest, 
  AcceptFriendRequest, 
  RejectFriendRequest, 
  DeleteFriend 
} from '../../wailsjs/go/main/App';

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
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [targetUuid, setTargetUuid] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, []);

  const formatUUID = (uuid: string) => {
    return uuid.replace(/-/g, '').toLowerCase();
  };

  const fetchFriends = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const resp = await GetFriends();
      // Go returns models.SuccessEnvelope { success, message, data, meta }
      // The wails binding might return the unwrapped data if the Go method returns (interface{}, error)
      // or it might return the full struct. Based on my APIService, it returns []byte which is unmarshaled in Go.
      // But wait, my Go handlers return (interface{}, error).
      
      const data = resp?.data ?? resp;
      setFriends(data || []);
    } catch (err: any) {
      setError(err?.message || String(err) || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!targetUuid) return;
    
    setAddLoading(true);
    setError(null);
    
    try {
      const formattedUuid = formatUUID(targetUuid);
      if (formattedUuid.length !== 32) {
        throw new Error('Invalid UUID format. Must be 32 characters hex.');
      }

      const resp = await SendFriendRequest(formattedUuid);
      
      setAddDialogOpen(false);
      setTargetUuid('');
      fetchFriends(); // Refresh list
    } catch (err: any) {
      setError(err?.message || String(err) || 'Failed to send friend request');
    } finally {
      setAddLoading(false);
    }
  };

  const handleAcceptFriend = async (friendId: number) => {
    try {
      await AcceptFriendRequest(friendId);
      fetchFriends(); // Refresh list
    } catch (err: any) {
      setError(err?.message || String(err) || 'Failed to accept friend request');
    }
  };

  const handleRejectFriend = async (friendId: number) => {
    try {
      await RejectFriendRequest(friendId);
      fetchFriends(); // Refresh list
    } catch (err: any) {
      setError(err?.message || String(err) || 'Failed to reject friend request');
    }
  };

  const handleDeleteFriend = async (friendId: number) => {
    try {
      await DeleteFriend(friendId);
      fetchFriends(); // Refresh list
    } catch (err: any) {
      setError(err?.message || String(err) || 'Failed to delete friend');
    }
  };

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0: return 'Pending';
      case 1: return 'Accepted';
      case 2: return 'Rejected';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'warning';
      case 1: return 'success';
      case 2: return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#e94560' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white' }}>
          Friends
        </Typography>
        <Box>
          <IconButton 
            onClick={fetchFriends} 
            sx={{ color: 'white', mr: 1 }}
            title="Refresh"
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setAddDialogOpen(true)}
            sx={{
              backgroundColor: '#e94560',
              '&:hover': {
                backgroundColor: '#c81e45',
              },
            }}
          >
            Add Friend
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(211, 47, 47, 0.1)', color: '#ff6b6b' }}>
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
                No friends yet
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Add some friends to get started!
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
                            color={getStatusColor(friend.status) as any}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          Level {friend.level || '?'} • Added {new Date(friend.created_at).toLocaleDateString()}
                        </Typography>
                      }
                    />
                    
                    {friend.status === 0 && (
                      <Box>
                        <IconButton 
                          onClick={() => handleAcceptFriend(friend.id)}
                          sx={{ color: '#4ecca3' }}
                          title="Accept"
                        >
                          <CheckIcon />
                        </IconButton>
                        <IconButton 
                          onClick={() => handleRejectFriend(friend.id)}
                          sx={{ color: '#ff6b6b' }}
                          title="Reject"
                        >
                          <CloseIcon />
                        </IconButton>
                      </Box>
                    )}
                    
                    {friend.status === 1 && (
                      <IconButton 
                        onClick={() => handleDeleteFriend(friend.id)}
                        sx={{ color: '#ff6b6b' }}
                        title="Remove friend"
                      >
                        <PersonRemoveIcon />
                      </IconButton>
                    )}
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

      {/* Add Friend Dialog */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => setAddDialogOpen(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: '#16213e',
              color: 'white',
              minWidth: 400,
            }
          }
        }}
      >
        <DialogTitle>Add Friend</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.7)' }}>
            Enter the UUID (32-char hex) of the friend you want to add:
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="User UUID"
            type="text"
            fullWidth
            variant="outlined"
            value={targetUuid}
            onChange={(e) => setTargetUuid(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255,255,255,0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255,255,255,0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#e94560',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255,255,255,0.7)',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#e94560',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setAddDialogOpen(false)}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddFriend}
            variant="contained"
            disabled={addLoading || !targetUuid}
            sx={{
              backgroundColor: '#e94560',
              '&:hover': {
                backgroundColor: '#c81e45',
              },
            }}
          >
            {addLoading ? <CircularProgress size={24} /> : 'Send Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}