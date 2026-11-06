// Central UI message catalog (i18n).
//
// Product direction: English is the primary UI language; other locales are
// reserved for the future. Adding a language means adding one catalog object
// with the same shape as `en` to `catalogs` and extending the `Locale` type.
// Components must read user-visible strings through `t()` instead of
// hard-coding them.

export type Locale = 'en';

const en = {
  nav: {
    home: 'Home',
    myMatches: 'My Matches',
    friends: 'Friends',
    rankings: 'Rankings',
  },
  common: {
    refresh: 'Refresh',
    close: 'Close',
    draw: 'Draw',
    team: 'Team',
  },
  readOnly: {
    homeNotice:
      'This client is read-only: view your match history, rankings and friends here. Match submission and matchmaking have moved to the maintenance panel (MaintenanceView).',
    matchesNotice:
      'This client is read-only. Match submission and matchmaking have moved to the maintenance panel (MaintenanceView).',
    friendsNotice:
      'This client is read-only: the friend list is shown for viewing only. Sending or handling friend requests is not available here.',
  },
  myMatches: {
    title: 'My Matches',
    pageSize: 'Page Size',
    page: 'Page',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    loadError: 'Failed to load matches',
    detailLoadError: 'Failed to load match detail',
    headers: ['ID', 'Type', 'Source', 'Map', 'Winner', 'Duration', 'Finished At'],
    emptyTitle: 'No matches yet',
    emptyHint: 'Your recorded matches will appear here.',
    detailHeaders: ['UID', 'Team', 'Result', 'Score Before', 'Delta', 'Kills', 'Deaths', 'Survival'],
    detailType: 'Type',
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
  friends: {
    title: 'Friends',
    loadError: 'Failed to load friends',
    emptyTitle: 'No friends to display',
    emptyHint: 'Your accepted friend relations will appear here.',
    level: 'Level',
    added: 'Added',
    statusPending: 'Pending',
    statusAccepted: 'Accepted',
    statusRejected: 'Rejected',
    statusUnknown: 'Unknown',
  },
  home: {
    recentActivityTitle: 'No recent activity to display',
    recentActivityHint: 'Open the My Matches page to browse your recorded match history.',
  },
} as const;

export type AppMessages = typeof en;

const catalogs: Record<Locale, AppMessages> = { en };

export const currentLocale: Locale = 'en';

// t returns the message catalog for the active locale.
export function t(): AppMessages {
  return catalogs[currentLocale];
}
