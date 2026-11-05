import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Chip,
  Stack,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import {
  ReportVirtualMatch,
  JoinMatchmaking,
  LeaveMatchmaking,
  GetMatchmakingStatus,
} from '../../wailsjs/go/main/App';
import { models } from '../../wailsjs/go/models';

interface TeamForm {
  team_id: string;
  result: string;
  initial_count: number;
  alive_count: number;
  membersText: string;
}

interface SettlementRow {
  uid: number;
  uuid: string;
  team_id: string;
  result: string;
  rank_score_before: number;
  rank_score_delta: number;
  rank_score_after: number;
}

interface VirtualResult {
  match: { id: number; match_type: string; source: string; map_name: string; winner_team_id: string };
  participants: SettlementRow[];
}

interface BatchResultItem {
  index: number;
  ok: boolean;
  matchId?: number;
  error?: string;
}

interface QueueEntryView {
  uid: number;
  match_type: string;
  rank_score: number;
  enqueued_at: string;
}

interface FormedGroupView {
  group_id: number;
  match_type: string;
  formed_at: string;
  members: { uid: number; team_id: string; rank_score: number }[];
}

interface MatchmakingStatusView {
  in_queue: boolean;
  queue_entry?: QueueEntryView;
  recent_groups: FormedGroupView[];
}

const REPORTER_TOKEN_KEY = 'mca_reporter_token';

function parseMembers(text: string): { uuid: string }[] {
  return text
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((uuid) => ({ uuid }));
}

export default function VirtualMatchView() {
  // 上报令牌（需携带 match:report scope，取自服务端 tokens.yaml）。
  const [reporterToken, setReporterToken] = useState<string>(
    () => localStorage.getItem(REPORTER_TOKEN_KEY) || '',
  );

  // 单局表单。
  const [matchType, setMatchType] = useState('1v1');
  const [mapName, setMapName] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [teams, setTeams] = useState<TeamForm[]>([
    { team_id: 'A', result: 'win', initial_count: 1, alive_count: 1, membersText: '' },
    { team_id: 'B', result: 'lose', initial_count: 1, alive_count: 1, membersText: '' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<VirtualResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 批量灌入。
  const [batchText, setBatchText] = useState('');
  const [batchResults, setBatchResults] = useState<BatchResultItem[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);

  // 匹配。
  const [mmMode, setMmMode] = useState('1v1');
  const [mmStatus, setMmStatus] = useState<MatchmakingStatusView | null>(null);
  const [mmMessage, setMmMessage] = useState<string | null>(null);
  const [mmError, setMmError] = useState<string | null>(null);

  const saveReporterToken = (value: string) => {
    setReporterToken(value);
    localStorage.setItem(REPORTER_TOKEN_KEY, value);
  };

  const updateTeam = (index: number, patch: Partial<TeamForm>) => {
    setTeams((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const addTeam = () => {
    setTeams((prev) => [
      ...prev,
      {
        team_id: String.fromCharCode(65 + prev.length),
        result: 'lose',
        initial_count: 1,
        alive_count: 1,
        membersText: '',
      },
    ]);
  };

  const removeTeam = (index: number) => {
    setTeams((prev) => prev.filter((_, i) => i !== index));
  };

  const buildInput = (): models.VirtualReportInput => {
    return new models.VirtualReportInput({
      match_type: matchType,
      map_name: mapName || undefined,
      duration_seconds: durationSeconds || undefined,
      teams: teams.map((t) => ({
        team_id: t.team_id,
        result: t.result,
        initial_count: t.initial_count,
        alive_count: t.alive_count,
        members: parseMembers(t.membersText),
      })),
    });
  };

  const submitSingle = async () => {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const resp = await ReportVirtualMatch(buildInput(), reporterToken);
      const data = (resp?.data ?? resp) as VirtualResult;
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitBatch = async () => {
    setBatchRunning(true);
    setBatchResults([]);
    setError(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(batchText);
      } catch (e) {
        throw new Error(`JSON 解析失败: ${e instanceof Error ? e.message : String(e)}`);
      }
      let items: unknown[];
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === 'object') {
        items = [parsed];
      } else {
        throw new Error('批量内容必须是 JSON 对象或对象数组');
      }

      const results: BatchResultItem[] = [];
      for (let i = 0; i < items.length; i++) {
        try {
          const input = new models.VirtualReportInput(items[i]);
          const resp = await ReportVirtualMatch(input, reporterToken);
          const data = (resp?.data ?? resp) as VirtualResult;
          results.push({ index: i + 1, ok: true, matchId: data?.match?.id });
        } catch (err: unknown) {
          results.push({
            index: i + 1,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        setBatchResults([...results]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBatchRunning(false);
    }
  };

  const refreshStatus = async () => {
    setMmError(null);
    try {
      const resp = await GetMatchmakingStatus();
      const data = (resp?.data ?? resp) as MatchmakingStatusView;
      setMmStatus(data);
    } catch (err: unknown) {
      setMmError(err instanceof Error ? err.message : String(err));
    }
  };

  const joinQueue = async () => {
    setMmError(null);
    setMmMessage(null);
    try {
      await JoinMatchmaking(mmMode);
      setMmMessage(`已加入 ${mmMode} 队列`);
      await refreshStatus();
    } catch (err: unknown) {
      setMmError(err instanceof Error ? err.message : String(err));
    }
  };

  const leaveQueue = async () => {
    setMmError(null);
    setMmMessage(null);
    try {
      await LeaveMatchmaking();
      setMmMessage('已离开队列');
      await refreshStatus();
    } catch (err: unknown) {
      setMmError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ color: 'white', mb: 2 }}>
        Virtual Match
      </Typography>

      <Card sx={{ mb: 3, backgroundColor: '#16213e', color: 'white' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Reporter Token
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
            虚拟对局上报需要 match:report scope（服务端 config/tokens.yaml 中的
            match-reporter 或 super-admin 令牌）。留空时使用当前登录令牌（会被 403 拒绝）。
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="password"
            placeholder="粘贴 match-reporter / super-admin token"
            value={reporterToken}
            onChange={(e) => saveReporterToken(e.target.value)}
            sx={{ input: { color: 'white' }, backgroundColor: '#0f3460' }}
          />
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, backgroundColor: '#16213e', color: 'white' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            提交单局虚拟对局
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="match_type"
              size="small"
              value={matchType}
              onChange={(e) => setMatchType(e.target.value)}
              sx={{ input: { color: 'white' }, label: { color: 'rgba(255,255,255,0.7)' } }}
            />
            <TextField
              label="map_name (可选)"
              size="small"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              sx={{ input: { color: 'white' }, label: { color: 'rgba(255,255,255,0.7)' } }}
            />
            <TextField
              label="duration_seconds"
              size="small"
              type="number"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value))}
              sx={{ input: { color: 'white' }, label: { color: 'rgba(255,255,255,0.7)' } }}
            />
          </Stack>

          {teams.map((team, index) => (
            <Paper key={index} sx={{ p: 2, mb: 2, backgroundColor: '#0f3460' }}>
              <Stack direction="row" spacing={2} sx={{ mb: 1, alignItems: 'center' }}>
                <TextField
                  label="team_id"
                  size="small"
                  value={team.team_id}
                  onChange={(e) => updateTeam(index, { team_id: e.target.value })}
                  sx={{ input: { color: 'white' }, label: { color: 'rgba(255,255,255,0.7)' } }}
                />
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>result</InputLabel>
                  <Select
                    value={team.result}
                    label="result"
                    onChange={(e) => updateTeam(index, { result: e.target.value })}
                    sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' } }}
                  >
                    <MenuItem value="win">win</MenuItem>
                    <MenuItem value="lose">lose</MenuItem>
                    <MenuItem value="draw">draw</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="initial_count"
                  size="small"
                  type="number"
                  value={team.initial_count}
                  onChange={(e) => updateTeam(index, { initial_count: Number(e.target.value) })}
                  sx={{ input: { color: 'white' }, label: { color: 'rgba(255,255,255,0.7)' } }}
                />
                <TextField
                  label="alive_count"
                  size="small"
                  type="number"
                  value={team.alive_count}
                  onChange={(e) => updateTeam(index, { alive_count: Number(e.target.value) })}
                  sx={{ input: { color: 'white' }, label: { color: 'rgba(255,255,255,0.7)' } }}
                />
                <IconButton onClick={() => removeTeam(index)} disabled={teams.length <= 2} sx={{ color: '#e94560' }}>
                  <DeleteIcon />
                </IconButton>
              </Stack>
              <TextField
                fullWidth
                size="small"
                label="成员 UUID（空格或逗号分隔）"
                value={team.membersText}
                onChange={(e) => updateTeam(index, { membersText: e.target.value })}
                sx={{ input: { color: 'white' }, label: { color: 'rgba(255,255,255,0.7)' } }}
              />
            </Paper>
          ))}

          <Stack direction="row" spacing={2}>
            <Button startIcon={<AddIcon />} onClick={addTeam} variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>
              添加队伍
            </Button>
            <Button
              startIcon={<SendIcon />}
              onClick={submitSingle}
              disabled={submitting}
              variant="contained"
              sx={{ backgroundColor: '#e94560' }}
            >
              {submitting ? '提交中…' : '提交虚拟对局'}
            </Button>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {result && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                对局 #{result.match.id} 已记录（source={result.match.source}
                {result.match.winner_team_id ? `, 胜队=${result.match.winner_team_id}` : ', 平局'}）
              </Typography>
              <TableContainer component={Paper} sx={{ backgroundColor: '#0f3460' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['UID', 'UUID', '队伍', '结果', '赛前', '变化', '赛后'].map((h) => (
                        <TableCell key={h} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.participants.map((p) => (
                      <TableRow key={`${p.uid}-${p.team_id}`}>
                        <TableCell sx={{ color: 'white' }}>{p.uid}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{p.uuid}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{p.team_id}</TableCell>
                        <TableCell>
                          <Chip
                            label={p.result}
                            size="small"
                            color={p.result === 'win' ? 'success' : p.result === 'draw' ? 'default' : 'error'}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>{p.rank_score_before}</TableCell>
                        <TableCell sx={{ color: p.rank_score_delta >= 0 ? '#66bb6a' : '#ef5350' }}>
                          {p.rank_score_delta >= 0 ? '+' : ''}
                          {p.rank_score_delta}
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>{p.rank_score_after}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, backgroundColor: '#16213e', color: 'white' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            批量灌入
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
            粘贴一个虚拟对局 JSON 数组（每项与单局提交的结构一致），将按顺序逐局提交。
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={6}
            placeholder='[{"match_type":"1v1","teams":[{"team_id":"A","result":"win","initial_count":1,"alive_count":1,"members":[{"uuid":"p1"}]},{"team_id":"B","result":"lose","initial_count":1,"alive_count":1,"members":[{"uuid":"p2"}]}]}]'
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            sx={{ textarea: { color: 'white' }, backgroundColor: '#0f3460' }}
          />
          <Button
            startIcon={<SendIcon />}
            onClick={submitBatch}
            disabled={batchRunning || batchText.trim() === ''}
            variant="contained"
            sx={{ mt: 2, backgroundColor: '#e94560' }}
          >
            {batchRunning ? '灌入中…' : '批量提交'}
          </Button>

          {batchResults.length > 0 && (
            <TableContainer component={Paper} sx={{ mt: 2, backgroundColor: '#0f3460' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['#', '状态', '对局 ID / 错误'].map((h) => (
                      <TableCell key={h} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batchResults.map((r) => (
                    <TableRow key={r.index}>
                      <TableCell sx={{ color: 'white' }}>{r.index}</TableCell>
                      <TableCell>
                        <Chip label={r.ok ? '成功' : '失败'} size="small" color={r.ok ? 'success' : 'error'} />
                      </TableCell>
                      <TableCell sx={{ color: 'white' }}>{r.ok ? `#${r.matchId}` : r.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card sx={{ backgroundColor: '#16213e', color: 'white' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            匹配（使用当前登录用户）
          </Typography>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <TextField
              label="模式"
              size="small"
              value={mmMode}
              onChange={(e) => setMmMode(e.target.value)}
              sx={{ input: { color: 'white' }, label: { color: 'rgba(255,255,255,0.7)' } }}
            />
            <Button onClick={joinQueue} variant="contained" sx={{ backgroundColor: '#e94560' }}>
              加入队列
            </Button>
            <Button onClick={leaveQueue} variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>
              离开队列
            </Button>
            <IconButton onClick={refreshStatus} sx={{ color: 'white' }}>
              <RefreshIcon />
            </IconButton>
          </Stack>

          {mmMessage && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {mmMessage}
            </Alert>
          )}
          {mmError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {mmError}
            </Alert>
          )}

          {mmStatus && (
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
                <Chip
                  label={mmStatus.in_queue ? '排队中' : '未在队列'}
                  size="small"
                  color={mmStatus.in_queue ? 'warning' : 'default'}
                />
                {mmStatus.queue_entry && (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    模式 {mmStatus.queue_entry.match_type} · 评分 {mmStatus.queue_entry.rank_score} · 入队于{' '}
                    {mmStatus.queue_entry.enqueued_at}
                  </Typography>
                )}
              </Stack>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 1 }} />
              <Typography variant="body2" sx={{ mb: 1 }}>
                近期成局记录
              </Typography>
              {mmStatus.recent_groups.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  暂无
                </Typography>
              ) : (
                mmStatus.recent_groups.map((g) => (
                  <Paper key={g.group_id} sx={{ p: 1.5, mb: 1, backgroundColor: '#0f3460' }}>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      #{g.group_id} · {g.match_type} · 成局于 {g.formed_at}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      {g.members.map((m) => `${m.team_id}队: uid ${m.uid} (${m.rank_score})`).join('  |  ')}
                    </Typography>
                  </Paper>
                ))
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
