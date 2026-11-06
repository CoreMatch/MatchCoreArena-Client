import { useState } from 'react';
import { Asset, Banner, Button, Field, Input, Panel, Spinner } from '@ha/ui';
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
    <div className="flex min-h-[85vh] items-center justify-center">
      <Panel className="w-full max-w-lg p-10">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Asset id="brand-mca" size={64} className="text-accent" />
          </div>
          <h1 className="text-display font-bold tracking-tight text-ink">
            MatchCore<span className="text-accent">Arena</span>
          </h1>
          <p className="mt-2 text-base text-ink-muted">{msg.login.subtitle}</p>
        </div>

        {error && (
          <div className="mb-6">
            <Banner tone="danger">
              {error}
              {errorDetail && <div className="mt-1 break-all text-sm opacity-80">{errorDetail}</div>}
            </Banner>
          </div>
        )}

        {!showTotp ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <Field label={msg.login.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </Field>
            <Field label={msg.login.password}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </Field>
            <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
              {loading ? <Spinner /> : msg.login.signIn}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleTotpVerify} className="space-y-5">
            <p className="text-center text-base text-ink-muted">{msg.login.totpPrompt}</p>
            <Field label={msg.login.totpCode}>
              <Input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                required
                maxLength={6}
                className="text-center font-mono tracking-[0.4em]"
                autoComplete="one-time-code"
              />
            </Field>
            <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
              {loading ? <Spinner /> : msg.login.verify}
            </Button>
          </form>
        )}

        <div className="mt-8 text-center">
          <a href="#" className="text-sm text-ink-faint transition-colors duration-150 hover:text-accent">
            {msg.login.forgotPassword}
          </a>
        </div>
      </Panel>
    </div>
  );
}
