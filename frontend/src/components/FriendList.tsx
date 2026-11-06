import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { Asset, Badge, EmptyState, ErrorState, Icon, Panel, Skeleton } from '@ha/ui';
import type { BadgeTone } from '@ha/ui';
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

// The server's friend feature is explicitly unimplemented: it answers a
// typed 501 mca_not_implemented (knowledge 0008). Surface that honestly
// instead of a generic network error.
function isNotImplemented(err: unknown): boolean {
  const text = err instanceof Error ? err.message : String(err);
  return text.includes('501') || text.includes('mca_not_implemented');
}

export default function FriendList() {
  const msg = t();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notImplemented, setNotImplemented] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    setLoading(true);
    setError(null);
    setNotImplemented(false);

    try {
      const resp = await authFetch(() => GetFriends());
      // Go returns models.SuccessEnvelope { success, message, data, meta }
      const data = resp?.data ?? resp;
      setFriends(data || []);
    } catch (err: unknown) {
      if (isNotImplemented(err)) {
        setNotImplemented(true);
      } else {
        setError(loadErrorMessage(t().common.dataFriends));
      }
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

  const getStatusTone = (status: number): BadgeTone => {
    switch (status) {
      case 0: return 'warn';
      case 1: return 'ok';
      case 2: return 'danger';
      default: return 'neutral';
    }
  };

  const friendName = (friend: Friend) =>
    friend.username || msg.friends.userTemplate.replace('{uuid}', friend.friend_uuid);

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-display font-bold tracking-tight text-ink">{msg.friends.title}</h1>
        <Panel className="space-y-3 p-6">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-display font-bold tracking-tight text-ink">{msg.friends.title}</h1>
          <span title={msg.readOnly.notice} className="cursor-help text-ink-faint">
            <Icon as={Info} size={18} />
          </span>
        </div>
        <button
          type="button"
          onClick={fetchFriends}
          title={msg.common.refresh}
          className="rounded-md border border-edge-strong p-3 text-ink-muted transition-colors duration-150 hover:bg-raised hover:text-ink"
        >
          <Asset id="icon-refresh" size={18} />
        </button>
      </div>

      {notImplemented ? (
        <Panel>
          <EmptyState
            illustration={<Asset id="state-not-implemented" size={240} />}
            title={msg.friends.notImplementedTitle}
            hint={msg.friends.notImplementedHint}
          />
        </Panel>
      ) : error ? (
        <Panel>
          <ErrorState
            message={error}
            onRetry={fetchFriends}
            illustration={<Asset id="state-network-failure" size={240} />}
          />
        </Panel>
      ) : (
        <Panel>
          {friends.length === 0 ? (
            <EmptyState
              illustration={<Asset id="state-no-friends" size={240} />}
              title={msg.friends.emptyTitle}
              hint={msg.friends.emptyHint}
            />
          ) : (
            <ul className="divide-y divide-edge/50">
              {friends.map((friend) => (
                <li key={friend.id} className="flex items-center gap-4 px-6 py-5 transition-colors duration-150 hover:bg-raised">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-accent text-base font-bold text-on-accent">
                    {friend.username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="truncate text-base font-semibold text-ink">{friendName(friend)}</span>
                      <Badge tone={getStatusTone(friend.status)}>{getStatusLabel(friend.status)}</Badge>
                    </div>
                    <div className="mt-1 font-mono text-sm text-ink-faint">
                      {msg.friends.level} {friend.level || '?'} · {msg.friends.added}{' '}
                      {new Date(friend.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
