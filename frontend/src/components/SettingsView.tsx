import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { Banner, Button, Field, Icon, Input, Panel, Select } from '@ha/ui';
import { GetGameServerConfig, SetGameServerConfig } from '../../wailsjs/go/main/App';
import { t } from '../i18n';
import type { UserProfile } from '../types';

interface SettingsViewProps {
  user: UserProfile | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-edge/50 py-3.5 last:border-b-0">
      <span className="text-base text-ink-muted">{label}</span>
      <span className="font-mono text-base font-medium tabular-nums text-ink">{value}</span>
    </div>
  );
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
    <div className="space-y-8">
      <h1 className="text-display font-bold tracking-tight text-ink">{msg.settings.title}</h1>

      {/* Account */}
      <Panel className="p-8">
        <h2 className="mb-5 text-2xl font-bold text-ink">{msg.settings.account}</h2>
        {user ? (
          <div>
            <Row label={msg.settings.accountUid} value={user.uid !== undefined ? String(user.uid) : '—'} />
            <Row label={msg.settings.accountLevel} value={user.level !== undefined ? String(user.level) : '—'} />
            <Row label={msg.settings.accountExp} value={(user.experience ?? 0).toLocaleString()} />
            <Row label={msg.settings.accountRankScore} value={user.rank_score !== undefined ? String(user.rank_score) : '—'} />
            <Row label={msg.settings.accountWins} value={user.wins_count !== undefined ? String(user.wins_count) : '—'} />
          </div>
        ) : (
          <p className="text-base text-ink-faint">{msg.settings.accountMissing}</p>
        )}
      </Panel>

      {/* Game server fallback */}
      <Panel className="p-8">
        <h2 className="mb-6 flex items-center gap-2.5 text-2xl font-bold text-ink">
          {msg.settings.gameServer}
          <span title={msg.settings.gameServerHint} className="cursor-help text-ink-faint">
            <Icon as={Info} size={18} />
          </span>
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <Field label={msg.settings.gameServerHost} className="min-w-72 flex-1">
            <Input value={gameHost} onChange={(e) => setGameHost(e.target.value)} className="font-mono" />
          </Field>
          <Field label={msg.settings.gameServerPort} className="w-32">
            <Input
              type="number"
              value={gamePort}
              onChange={(e) => setGamePort(e.target.value)}
              className="font-mono"
            />
          </Field>
          <Button variant="primary" onClick={saveGameServer} disabled={saveState === 'saving'} className="mb-0.5">
            {saveState === 'saving' ? msg.settings.saving : msg.settings.save}
          </Button>
        </div>
        {saveState === 'saved' && (
          <div className="mt-4">
            <Banner tone="ok">{msg.settings.saved}</Banner>
          </div>
        )}
        {saveState === 'failed' && (
          <div className="mt-4">
            <Banner tone="danger">{msg.settings.saveFailed}</Banner>
          </div>
        )}
      </Panel>

      {/* Language */}
      <Panel className="p-8">
        <h2 className="mb-5 text-2xl font-bold text-ink">{msg.settings.language}</h2>
        <div className="flex flex-wrap items-center gap-4">
          <span title={msg.settings.languageNote}>
            <Field label={msg.settings.language} className="w-56">
              <Select
                value="en"
                onValueChange={() => undefined}
                ariaLabel={msg.settings.language}
                disabled
                options={[{ value: 'en', label: msg.settings.languageEnglish }]}
              />
            </Field>
          </span>
        </div>
      </Panel>

      {/* About */}
      <Panel className="p-8">
        <h2 className="mb-2 text-2xl font-bold text-ink">{msg.settings.about}</h2>
        <p className="text-base leading-relaxed text-ink-muted">{msg.settings.aboutText}</p>
      </Panel>
    </div>
  );
}
