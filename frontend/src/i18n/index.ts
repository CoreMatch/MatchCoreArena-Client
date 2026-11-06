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
    home: 'Home',
    career: 'Career',
    friends: 'Friends',
    rankings: 'Rankings',
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
    homeNotice:
      'This client is read-only: view your match history, rankings and friends here. Match submission and matchmaking have moved to the maintenance panel (MaintenanceView).',
    matchesNotice:
      'This client is read-only. Match submission and matchmaking have moved to the maintenance panel (MaintenanceView).',
    friendsNotice:
      'This client is read-only: the friend list is shown for viewing only. Sending or handling friend requests is not available here.',
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
  home: {
    recentActivityTitle: 'No recent activity to display',
    recentActivityHint: 'Open the Career page to browse your recorded match history.',
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
