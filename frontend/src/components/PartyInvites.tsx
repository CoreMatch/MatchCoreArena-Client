import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Check, X, Send, Loader2 } from 'lucide-react';
import {
  Asset,
  Badge,
  Banner,
  Button,
  Dialog,
  Field,
  Icon,
  Input,
  Panel,
  Skeleton,
  type AssetId,
} from '@ha/ui';
import {
  InviteParty,
  MyPartyInvites,
  AcceptPartyInvite,
  RejectPartyInvite,
} from '../../wailsjs/go/main/App';
import { authFetch } from '../session';
import { t } from '../i18n';

const UUID_RE = /^[0-9a-f]{32}$/;
const POLL_MS = 10000;

export interface PartyInviteView {
  id: number;
  inviter_uid: number;
  invitee_uid: number;
  match_type: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  expires_at: string;
  resolved_at?: string;
  consumed_at?: string;
}

interface PartyInvitesProps {
  /** The signed-in user's uid, used to distinguish sent vs received invites. */
  userUid: number | undefined;
  /** Emitted when invites change (sent/accepted/rejected) so the parent
   *  can re-check which party members have accepted. */
  onChange?: () => void;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function statusLabel(s: PartyInviteView['status']) {
  return {
    pending: t().partyInvites.statusPending,
    accepted: t().partyInvites.statusAccepted,
    rejected: t().partyInvites.statusRejected,
    expired: t().partyInvites.statusExpired,
  }[s];
}

function statusTone(s: PartyInviteView['status']): 'warn' | 'ok' | 'danger' | 'neutral' {
  switch (s) {
    case 'pending':
      return 'warn';
    case 'accepted':
      return 'ok';
    case 'rejected':
      return 'danger';
    default:
      return 'neutral';
  }
}

export default function PartyInvites({ userUid, onChange }: PartyInvitesProps) {
  const msg = t();

  // ── invite list ──
  const [invites, setInvites] = useState<PartyInviteView[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadInvites = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const resp = await authFetch(() => MyPartyInvites());
      const data = (resp?.data ?? resp) as PartyInviteView[];
      setInvites(Array.isArray(data) ? data : []);
      if (!silent) setListError(null);
    } catch (err) {
      if (!silent) setListError(errMsg(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvites();
    pollRef.current = setInterval(() => loadInvites(true), POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadInvites]);

  // ── send invite form ──
  const [sendOpen, setSendOpen] = useState(false);
  const [sendMode, setSendMode] = useState('1v1');
  const [sendInput, setSendInput] = useState('');
  const [sendMembers, setSendMembers] = useState<string[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendBusy, setSendBusy] = useState(false);

  const addSendMember = () => {
    const raw = sendInput.trim().toLowerCase();
    const cleaned = raw.replace(/-/g, '');
    if (!UUID_RE.test(cleaned)) {
      setSendError(msg.partyInvites.invalidUuid);
      return;
    }
    if (sendMembers.includes(cleaned)) {
      setSendError(msg.partyInvites.duplicateMember);
      return;
    }
    setSendMembers((prev) => [...prev, cleaned]);
    setSendInput('');
    setSendError(null);
  };

  const removeSendMember = (uuid: string) => {
    setSendMembers((prev) => prev.filter((u) => u !== uuid));
  };

  const submitInvite = async () => {
    if (sendMembers.length === 0) return;
    setSendBusy(true);
    setSendError(null);
    try {
      await authFetch(() => InviteParty(sendMode.trim(), sendMembers));
      setSendMembers([]);
      setSendMode('1v1');
      setSendOpen(false);
      await loadInvites(true);
      onChange?.();
    } catch (err) {
      setSendError(errMsg(err));
    } finally {
      setSendBusy(false);
    }
  };

  // ── accept / reject ──
  const [actionError, setActionError] = useState<string | null>(null);

  const accept = async (id: number) => {
    setActionError(null);
    try {
      await authFetch(() => AcceptPartyInvite(id));
      await loadInvites(true);
      onChange?.();
    } catch (err) {
      setActionError(errMsg(err));
    }
  };

  const reject = async (id: number) => {
    setActionError(null);
    try {
      await authFetch(() => RejectPartyInvite(id));
      await loadInvites(true);
      onChange?.();
    } catch (err) {
      setActionError(errMsg(err));
    }
  };

  const isInvitee = (inv: PartyInviteView) => userUid !== undefined && inv.invitee_uid === userUid;
  const isInviter = (inv: PartyInviteView) => userUid !== undefined && inv.inviter_uid === userUid;

  // Partition invites so the two flows (incoming to-act-on vs outgoing-history)
  // show distinct empty states and affordances.
  const incoming = invites.filter((i) => isInvitee(i) && i.status === 'pending');
  const outgoing = invites.filter((i) => isInviter(i) || (i.status !== 'pending'));

  const modeAsset: Record<string, AssetId> = {
    '1v1': 'mode-1v1',
    '2v2': 'mode-2v2',
    '4v4': 'mode-4v4',
    ffa: 'mode-ffa',
  };

  return (
    <Panel className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink">{msg.partyInvites.title}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => loadInvites(false)} disabled={loading}>
            <Asset id="icon-refresh" size={16} />
            {msg.common.refresh}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setSendOpen(true)}>
            <Icon as={Plus} size={16} />
            {msg.partyInvites.newInvite}
          </Button>
        </div>
      </div>

      {listError && (
        <Banner tone="danger" className="mb-4">
          {listError}
        </Banner>
      )}
      {actionError && (
        <Banner tone="danger" className="mb-4">
          {actionError}
        </Banner>
      )}

      {loading && invites.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : invites.length === 0 ? (
        <div className="rounded-md border border-edge/60 bg-raised/60 p-6 text-center">
          <div className="mb-2 text-ink-muted">{msg.partyInvites.emptyTitle}</div>
          <div className="text-sm text-ink-faint">{msg.partyInvites.emptyHint}</div>
        </div>
      ) : (
        <>
          {/* incoming — the action surface */}
          {incoming.length > 0 && (
            <div className="mb-6">
              <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
                {msg.partyInvites.incoming}
              </div>
              <div className="space-y-3">
                {incoming.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center gap-3 rounded-md border border-edge/60 bg-raised/60 p-4"
                  >
                    <Asset id={modeAsset[inv.match_type] ?? 'mode-team'} size={24} className="text-accent" />
                    <span className="font-mono text-sm text-ink-muted">{inv.match_type}</span>
                    <span className="text-ink">
                      {msg.partyInvites.fromPlayer} #{inv.inviter_uid}
                    </span>
                    <Badge tone={statusTone(inv.status)}>{statusLabel(inv.status)}</Badge>
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => reject(inv.id)}>
                        <Icon as={X} size={14} />
                        {msg.partyInvites.reject}
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => accept(inv.id)}>
                        <Icon as={Check} size={14} />
                        {msg.partyInvites.accept}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* outgoing & history */}
          {outgoing.length > 0 && (
            <div>
              <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
                {msg.partyInvites.history}
              </div>
              <div className="space-y-2">
                {outgoing.slice(0, 15).map((inv) => {
                  const isFromMe = isInviter(inv);
                  const otherUid = isFromMe ? inv.invitee_uid : inv.inviter_uid;
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 rounded-md bg-raised/30 px-4 py-2"
                    >
                      <Asset id={modeAsset[inv.match_type] ?? 'mode-team'} size={16} className="text-ink-faint" />
                      <span className="font-mono text-xs text-ink-faint">{inv.match_type}</span>
                      <span className="text-sm text-ink-muted">
                        {isFromMe ? msg.partyInvites.toPlayer : msg.partyInvites.fromPlayer} #{otherUid}
                      </span>
                      <span className="ml-auto">
                        <Badge tone={statusTone(inv.status)}>{statusLabel(inv.status)}</Badge>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* send dialog */}
      <Dialog open={sendOpen} onClose={() => setSendOpen(false)} title={msg.partyInvites.sendDialogTitle}>
        <div className="space-y-5">
          <div className="text-sm text-ink-muted">{msg.partyInvites.sendDialogHint}</div>

          <Field label={msg.partyInvites.mode} className="w-48">
            <Input value={sendMode} onChange={(e) => setSendMode(e.target.value)} className="font-mono" />
          </Field>

          <div>
            <div className="mb-2 text-sm font-semibold text-ink">{msg.partyInvites.members}</div>
            <div className="flex gap-2">
              <Input
                placeholder={msg.partyInvites.memberPlaceholder}
                value={sendInput}
                onChange={(e) => setSendInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSendMember();
                  }
                }}
                className="font-mono"
              />
              <Button variant="outline" onClick={addSendMember}>
                <Icon as={Plus} size={16} />
                {msg.partyInvites.addMember}
              </Button>
            </div>
            {sendError && <div className="mt-2 text-sm text-danger">{sendError}</div>}
            {sendMembers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {sendMembers.map((uuid) => (
                  <span
                    key={uuid}
                    className="inline-flex items-center gap-2 rounded-md bg-raised px-3 py-1.5 font-mono text-sm text-ink-muted"
                  >
                    {uuid}
                    <button
                      type="button"
                      onClick={() => removeSendMember(uuid)}
                      className="cursor-help rounded-md p-0.5 text-ink-faint transition-colors hover:text-danger"
                      aria-label={`Remove ${uuid}`}
                    >
                      <Asset id="icon-cancel" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setSendOpen(false)} disabled={sendBusy}>
              {msg.partyInvites.cancel}
            </Button>
            <Button variant="primary" onClick={submitInvite} disabled={sendBusy || sendMembers.length === 0}>
              {sendBusy ? <Icon as={Loader2} size={14} className="animate-spin" /> : <Icon as={Send} size={14} />}
              {sendBusy ? msg.partyInvites.sending : msg.partyInvites.send}
            </Button>
          </div>
        </div>
      </Dialog>
    </Panel>
  );
}
