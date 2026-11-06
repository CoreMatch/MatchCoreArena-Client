# MatchCoreArena Client

A cross-platform desktop client for MatchCoreArena built with [Wails](https://wails.io/) (Go + React/TypeScript).

The client is the player-facing companion for MatchCoreArena: it queues matches (solo or party), shows your career, rankings and friends, and never writes match data — match reporting stays with the game-side reporter and the maintenance panel (MatchCoreArena-MaintenanceView).

## Features

- **User Authentication** — Login with email/password, TOTP verification, token management
- **Play** — Matchmaking queue (solo or party via UUID roster), queue state cycle with wait timer and cancel, rank card, recent matches
- **Career** — Browse your recorded match history with per-match detail (participants, kills/deaths/survival, server-computed score deltas)
- **Rankings** — View top rankings by type and season, see your current ranking
- **Friend List** — View your friends (read-only)
- **Settings** — Account data, language, about

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Backend  | Go 1.26, [Wails v2](https://wails.io/), standard library `net/http` for API calls |
| Frontend | React 19, TypeScript 5, [Vite 6](https://vitejs.dev/), [Material UI v9](https://mui.com/) |
| Build    | Wails CLI (WebKitGTK 2.41+ on Linux) |

## Project Layout

```
MatchCoreArena-Client/
├── app.go                  # Wails App struct — entry point for Go ↔ JS bindings
├── main.go                 # Wails application bootstrap
├── wails.json              # Wails project configuration
├── go.mod / go.sum         # Go module definition
├── internal/
│   ├── config/             # Configuration loading
│   ├── handlers/           # Wails binding handlers
│   ├── models/             # Domain & API models
│   └── services/           # API service layer
├── frontend/
│   ├── src/
│   │   ├── components/     # React views (Login, Play, Career, Rankings, Friends, Settings)
│   │   ├── App.tsx         # Main app shell with navigation drawer
│   │   └── main.tsx        # React entry point
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── build/                  # Platform-specific build assets
└── LICENSE
```

## Development

### Prerequisites

- Go 1.26+
- Node.js 18+
- Wails CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd MatchCoreArena-Client
   ```

2. Install dependencies:
   ```bash
   # Install Go dependencies
   go mod tidy
   
   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. Run in development mode:
   ```bash
   wails dev
   ```

### Building

Build for production:
```bash
wails build
```

The built application will be in the `build/` directory.

## Configuration

The application stores configuration in `~/.matchcorearena/config.json`:

```json
{
  "server_url": "https://arena.mcnb.dev/",
  "debug": false
}
```

## API Integration

This client connects to the MatchCoreArena server API. It performs read queries plus the player's own session and queue operations; match reporting is not part of the client. Make sure the server is running and accessible at the configured URL.

### API Endpoints Used

- **Authentication**: `/api/auth/login-ticket`, `/api/auth/totp-verify`, `/api/auth/refresh`, `/api/auth/logout`
- **Users**: `/api/users/me`
- **Friends**: `GET /api/friends`
- **Matches**: `GET /api/matches/{id}`, `GET /api/matches/me`
- **Matchmaking**: `POST /api/matchmaking/join` (solo or `party_members` roster), `DELETE /api/matchmaking/leave`, `GET /api/matchmaking/status`
- **Rankings**: `GET /api/rankings/{type}`, `GET /api/rankings/me`

Expired access tokens are refreshed automatically via `/api/auth/refresh`; when a refresh fails the app returns to the login screen.

Match reporting is operated through the maintenance panel (MatchCoreArena-MaintenanceView) and the game-side reporter, not by this client.

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.