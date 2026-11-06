import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import { Login, VerifyTOTP, SetToken } from '../../wailsjs/go/main/App';
import { t } from '../i18n';

export interface TokenData {
  access_token: string;
  refresh_token: string;
}

interface LoginViewProps {
  onLoginSuccess: (tokenData: TokenData) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const msg = t();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [showTotp, setShowTotp] = useState(false);
  const [loginTicket, setLoginTicket] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const fail = (message: string, err: unknown) => {
    setError(message);
    const raw = err instanceof Error ? err.message || String(err) : String(err);
    setErrorDetail(raw && raw !== message ? raw : null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorDetail(null);

    try {
      const resp = await Login(email, password);
      // Go returns LoginResponse { success, message, data, meta }
      const loginData = resp?.data ?? resp;

      if (loginData?.totp_required) {
        // TOTP verification needed
        setLoginTicket(loginData.login_ticket);
        setShowTotp(true);
      } else if (loginData?.access_token) {
        // Direct login success
        await SetToken(loginData.access_token);
        onLoginSuccess(loginData);
      } else {
        throw new Error(resp?.message || 'Unexpected login response');
      }
    } catch (err: unknown) {
      fail(msg.login.failed, err);
    } finally {
      setLoading(false);
    }
  };

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorDetail(null);

    try {
      const tokenData = await VerifyTOTP(loginTicket, totpCode);

      if (tokenData?.access_token) {
        await SetToken(tokenData.access_token);
        onLoginSuccess(tokenData);
      } else {
        throw new Error('Unexpected TOTP response');
      }
    } catch (err: unknown) {
      fail(msg.login.totpInvalid, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LoginIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              MatchCoreArena
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {msg.login.subtitle}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
              {errorDetail && (
                <Typography variant="caption" component="div" sx={{ mt: 0.5, opacity: 0.8 }}>
                  {errorDetail}
                </Typography>
              )}
            </Alert>
          )}

          {!showTotp ? (
            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label={msg.login.email}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label={msg.login.password}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={{ mb: 3 }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ py: 1.5, fontSize: '1rem' }}
              >
                {loading ? <CircularProgress size={24} /> : msg.login.signIn}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleTotpVerify}>
              <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
                {msg.login.totpPrompt}
              </Typography>
              <TextField
                fullWidth
                label={msg.login.totpCode}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                required
                slotProps={{
                  htmlInput: { maxLength: 6 },
                }}
                sx={{ mb: 3 }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ py: 1.5, fontSize: '1rem' }}
              >
                {loading ? <CircularProgress size={24} /> : msg.login.verify}
              </Button>
            </form>
          )}

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Link
              href="#"
              sx={{
                color: 'text.secondary',
                textDecoration: 'none',
                '&:hover': { color: 'primary.main' },
              }}
            >
              {msg.login.forgotPassword}
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
