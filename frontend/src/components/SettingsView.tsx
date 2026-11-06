import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  TextField,
  Button,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { GetGameServerConfig, SetGameServerConfig } from '../../wailsjs/go/main/App';
import { t } from '../i18n';
import type { UserProfile } from '../types';

interface SettingsViewProps {
  user: UserProfile | null;
}

export default function SettingsView({ user }: SettingsViewProps) {
  const msg = t();

  const [gameHost, setGameHost] = useState('');
  const [gamePort, setGamePort] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  useEffect(() => {
    (async () => {
      try {
        const resp = await GetGameServerConfig();
        const data = resp?.data ?? resp;
        setGameHost(data?.host ?? '');
        setGamePort(data?.port ? String(data.port) : '');
      } catch {
        // Keep the fields empty; saving will surface errors.
      }
    })();
  }, []);

  const saveGameServer = async () => {
    setSaveState('saving');
    try {
      const port = Number(gamePort);
      await SetGameServerConfig(gameHost.trim(), Number.isFinite(port) ? port : 0);
      setSaveState('saved');
    } catch {
      setSaveState('failed');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ color: 'white', mb: 3 }}>
        {msg.settings.title}
      </Typography>

      <Stack spacing={3}>
        <Card sx={{ backgroundColor: '#16213e', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {msg.settings.account}
            </Typography>
            {user ? (
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {msg.settings.accountUid}
                  </Typography>
                  <Typography variant="body2">{user.uid ?? '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {msg.settings.accountLevel}
                  </Typography>
                  <Typography variant="body2">{user.level ?? '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {msg.settings.accountExp}
                  </Typography>
                  <Typography variant="body2">{(user.experience ?? 0).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {msg.settings.accountRankScore}
                  </Typography>
                  <Typography variant="body2">{user.rank_score ?? '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {msg.settings.accountWins}
                  </Typography>
                  <Typography variant="body2">{user.wins_count ?? '—'}</Typography>
                </Box>
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                {msg.settings.accountMissing}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={{ backgroundColor: '#16213e', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {msg.settings.gameServer}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
              {msg.settings.gameServerHint}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <TextField
                label={msg.settings.gameServerHost}
                size="small"
                value={gameHost}
                onChange={(e) => setGameHost(e.target.value)}
                sx={{
                  minWidth: 260,
                  '& .MuiOutlinedInput-root': { color: 'white' },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                }}
              />
              <TextField
                label={msg.settings.gameServerPort}
                size="small"
                type="number"
                value={gamePort}
                onChange={(e) => setGamePort(e.target.value)}
                sx={{
                  width: 120,
                  '& .MuiOutlinedInput-root': { color: 'white' },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                }}
              />
              <Button
                onClick={saveGameServer}
                disabled={saveState === 'saving'}
                variant="contained"
                sx={{ backgroundColor: '#e94560', '&:hover': { backgroundColor: '#c81e45' } }}
              >
                {saveState === 'saving' ? msg.settings.saving : msg.settings.save}
              </Button>
            </Stack>
            {saveState === 'saved' && (
              <Alert severity="success" sx={{ mt: 2, backgroundColor: 'rgba(102,187,106,0.1)', color: '#a5d6a7' }}>
                {msg.settings.saved}
              </Alert>
            )}
            {saveState === 'failed' && (
              <Alert severity="error" sx={{ mt: 2, backgroundColor: 'rgba(211, 47, 47, 0.1)', color: '#ff6b6b' }}>
                {msg.settings.saveFailed}
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card sx={{ backgroundColor: '#16213e', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {msg.settings.language}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>{msg.settings.language}</InputLabel>
                <Select
                  value="en"
                  label={msg.settings.language}
                  disabled
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '& .MuiSvgIcon-root': { color: 'white' },
                  }}
                >
                  <MenuItem value="en">{msg.settings.languageEnglish}</MenuItem>
                </Select>
              </FormControl>
              <Chip
                label={msg.settings.languageNote}
                size="small"
                sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ backgroundColor: '#16213e', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {msg.settings.about}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {msg.settings.aboutText}
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
