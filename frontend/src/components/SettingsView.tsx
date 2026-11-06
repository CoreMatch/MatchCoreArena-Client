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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { GetGameServerConfig, SetGameServerConfig } from '../../wailsjs/go/main/App';
import { t } from '../i18n';
import type { UserProfile } from '../types';
import type { ThemeMode } from '../theme';

interface SettingsViewProps {
  user: UserProfile | null;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
}

export default function SettingsView({ user, themeMode, onThemeModeChange }: SettingsViewProps) {
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
      <Typography variant="h4" sx={{ color: 'text.primary', mb: 3 }}>
        {msg.settings.title}
      </Typography>

      <Stack spacing={3}>
        {/* Appearance */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {msg.settings.appearance}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              {msg.settings.themeHint}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <ToggleButtonGroup
                value={themeMode}
                exclusive
                onChange={(_, v) => v && onThemeModeChange(v)}
                aria-label={msg.settings.theme}
              >
                <ToggleButton value="dark" aria-label={msg.settings.themeDark}>
                  {msg.settings.themeDark}
                </ToggleButton>
                <ToggleButton value="light" aria-label={msg.settings.themeLight}>
                  {msg.settings.themeLight}
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </CardContent>
        </Card>

        {/* Account */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {msg.settings.account}
            </Typography>
            {user ? (
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {msg.settings.accountUid}
                  </Typography>
                  <Typography variant="body2">{user.uid ?? '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {msg.settings.accountLevel}
                  </Typography>
                  <Typography variant="body2">{user.level ?? '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {msg.settings.accountExp}
                  </Typography>
                  <Typography variant="body2">{(user.experience ?? 0).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {msg.settings.accountRankScore}
                  </Typography>
                  <Typography variant="body2">{user.rank_score ?? '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {msg.settings.accountWins}
                  </Typography>
                  <Typography variant="body2">{user.wins_count ?? '—'}</Typography>
                </Box>
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                {msg.settings.accountMissing}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Game Server */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {msg.settings.gameServer}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              {msg.settings.gameServerHint}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <TextField
                label={msg.settings.gameServerHost}
                size="small"
                value={gameHost}
                onChange={(e) => setGameHost(e.target.value)}
                sx={{ minWidth: 260 }}
              />
              <TextField
                label={msg.settings.gameServerPort}
                size="small"
                type="number"
                value={gamePort}
                onChange={(e) => setGamePort(e.target.value)}
                sx={{ width: 120 }}
              />
              <Button onClick={saveGameServer} disabled={saveState === 'saving'} variant="contained">
                {saveState === 'saving' ? msg.settings.saving : msg.settings.save}
              </Button>
            </Stack>
            {saveState === 'saved' && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {msg.settings.saved}
              </Alert>
            )}
            {saveState === 'failed' && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {msg.settings.saveFailed}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Language */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {msg.settings.language}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>{msg.settings.language}</InputLabel>
                <Select
                  value="en"
                  label={msg.settings.language}
                  disabled
                >
                  <MenuItem value="en">{msg.settings.languageEnglish}</MenuItem>
                </Select>
              </FormControl>
              <Chip label={msg.settings.languageNote} size="small" variant="outlined" />
            </Stack>
          </CardContent>
        </Card>

        {/* About */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {msg.settings.about}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {msg.settings.aboutText}
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
