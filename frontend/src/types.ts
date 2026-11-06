// Shared frontend types.

// UserProfile mirrors the server's users DTO (uid basis; the server does not
// return a username, so display falls back to "Player").
export interface UserProfile {
  uid?: number;
  username?: string;
  level?: number;
  experience?: number;
  rank_score?: number;
  wins_count?: number;
  friend_count?: number;
}
