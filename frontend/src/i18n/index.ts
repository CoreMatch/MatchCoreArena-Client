// Central UI message catalog (i18n).
//
// Product direction: English is the primary UI language; other locales are
// reserved for the future. Adding a language means adding one catalog object
// with the same shape as `en` to `catalogs` and extending the `Locale` type.
// Components must read user-visible strings through `t()` instead of
// hard-coding them.
//
// State-copy conventions (competitive research 04 §A5):
//   - empty state  = "nothing here yet" + the next action;
//   - error state  = one reason sentence + a retry affordance;
//   - loading state = skeletons, not bare spinners.

export type Locale = 'en';

const en = {
  nav: {
    play: 'Play',
    career: 'Career',
    friends: 'Friends',
    rankings: 'Rankings',
    settings: 'Settings',
  },
  common: {
    refresh: 'Refresh',
    close: 'Close',
    retry: 'Retry',
    draw: 'Draw',
    team: 'Team',
    pts: 'pts',
    // {data} is replaced by the failing dataset name (see the data* keys).
    loadErrorTemplate: "Couldn't load {data}. Check your connection and try again.",
    dataMatches: 'your match history',
    dataMatchDetail: 'match details',
    dataRankings: 'rankings',
    dataFriends: 'your friends',
  },
  readOnly: {
    notice:
      'Match reporting stays in the maintenance panel (MaintenanceView). This client shows your career data and queues matches with your own account.',
  },
  play: {
    title: 'Play',
    queueCardTitle: 'Find a Match',
    mode: 'Mode',
    partyToggle: 'Queue as a party',
    partyHint: 'Add member UUIDs. A party queues, matches and settles together.',
    partyInputPlaceholder: 'Member UUID (32-hex)',
    partyAdd: 'Add',
    partyInvalidUuid: 'Invalid UUID — expected 32 hex characters.',
    partyDuplicate: 'This member is already in the party.',
    findMatch: 'Find Match',
    joining: 'Joining…',
    joinError: "Couldn't join the queue. Check the details and try again.",
    leaveError: "Couldn't cancel the queue. Try again.",
    cancelQueue: 'Cancel Queue',
    stateQueued: 'In Queue',
    waiting: 'Waiting',
    stateFound: 'Match Found',
    stateInMatch: 'In Match',
    stateSettled: 'Results In',
    groupLabel: 'Group',
    waitingResults: 'Your game is being played. Results appear here once reported.',
    matchRecorded: 'Match recorded',
    viewDetails: 'View Details',
    queueAgain: 'Queue Again',
    recentMatches: 'Recent Matches',
    noRecentMatches: 'No matches yet.',
    level: 'Level',
    experience: 'Experience',
    rankScore: 'Rank Score',
  },
  rankCard: {
    title: 'Your Rank',
    season: 'Season',
    score: 'Score',
    rank: 'Your rank',
    wins: 'Wins',
    unrankedTitle: 'Unranked',
    unrankedHint: 'Play ranked matches to get your placement.',
    loadErrorData: 'your ranking',
    topPercentTemplate: 'Top {pct}%',
    topPercentTiny: 'Top <0.1%',
  },
  career: {
    title: 'Career',
    pageSize: 'Page Size',
    page: 'Page',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    headers: ['Time', 'Mode', 'Map', 'Winner', 'Duration', 'Source'],
    emptyTitle: 'No matches yet',
    emptyHint: 'Queue up to play your first match.',
    victory: 'Victory',
    defeat: 'Defeat',
    drawResult: 'Draw',
    yourResult: 'Your result',
    detailHeaders: ['Player', 'Team', 'Result', 'Kills', 'Deaths', 'Survived', 'Score'],
    detailType: 'Mode',
    detailSource: 'Source',
    detailMap: 'Map',
    detailWinner: 'Winner',
    detailStarted: 'Started',
    detailFinished: 'Finished',
    detailDuration: 'Duration',
    noParticipants: 'No participant details available for this match.',
    resultWin: 'Win',
    resultLose: 'Lose',
    resultDraw: 'Draw',
  },
  rankings: {
    emptyTitle: 'No rankings yet',
    emptyHint: 'Rankings will appear once the first matches are played.',
  },
  friends: {
    title: 'Friends',
    emptyTitle: 'No friends yet',
    emptyHint: 'Your accepted friend relations will show here.',
    level: 'Level',
    added: 'Added',
    statusPending: 'Pending',
    statusAccepted: 'Accepted',
    statusRejected: 'Rejected',
    statusUnknown: 'Unknown',
  },
  login: {
    failed: 'Sign-in failed. Check your credentials and try again.',
    totpInvalid: 'Invalid code. Enter the 6-digit code from your authenticator.',
  },
  settings: {
    title: 'Settings',
    account: 'Account',
    accountUid: 'Player UID',
    accountLevel: 'Level',
    accountExp: 'Experience',
    accountRankScore: 'Rank Score',
    accountWins: 'Wins',
    accountMissing: 'Profile not provisioned yet — it is created with your first settled match.',
    language: 'Language',
    languageEnglish: 'English',
    languageNote: 'English is the source language; additional languages are reserved.',
    about: 'About',
    aboutText:
      'MatchCoreArena Client — companion app for the MatchCoreArena arena server: career, rankings, friends and matchmaking queue.',
    gameServer: 'Game Server',
    gameServerHint:
      'Where matches are played. Used by the automatic handoff to SamuelClient and for the manual-join address.',
    gameServerHost: 'Host',
    gameServerPort: 'Port',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved.',
    saveFailed: "Couldn't save the game server settings.",
  },
  handoff: {
    title: 'Match Handoff',
    delivering: 'Handing the match off to SamuelClient…',
    delivered: 'Handed off to SamuelClient — it launches the game into your match.',
    waitingReceiver: 'Starting SamuelClient and handing off…',
    busy: 'SamuelClient is busy with another handoff.',
    timeout: 'SamuelClient did not come up in time.',
    noReceiver: 'SamuelClient is not installed or not registered for matchcore:// links.',
    versionMismatch: 'Version mismatch between the two apps — update the out-of-date one.',
    missingConfig: 'Set the game server address in Settings to enable the automatic handoff.',
    error: 'Handoff failed.',
    retry: 'Retry Handoff',
    manualJoin: 'Join manually',
    manualJoinHint: 'Copy the server address and join it from your game client.',
    copy: 'Copy',
    copied: 'Copied',
    gameUnreachable: 'The game server did not answer — double-check the address.',
  },
} as const;

export type AppMessages = typeof en;

const catalogs: Record<Locale, AppMessages> = { en };

export const currentLocale: Locale = 'en';

// t returns the message catalog for the active locale.
export function t(): AppMessages {
  return catalogs[currentLocale];
}

// loadErrorMessage renders the unified load-failure sentence for a dataset.
export function loadErrorMessage(data: string): string {
  return t().common.loadErrorTemplate.replace('{data}', data);
}
