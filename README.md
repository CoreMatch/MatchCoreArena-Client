# MatchCoreArena Client

A cross-platform desktop client for MatchCoreArena built with [Wails](https://wails.io/) (Go + React/TypeScript).

## Features

- **User Authentication** — Login with email/password, TOTP verification, token management
- **Friend System** — View friends, send/accept/reject friend requests, delete friends
- **Rankings** — View top rankings by type and season, see your current ranking
- **User Profile** — View and manage your profile, level, and experience

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Backend  | Go 1.25, [Wails v2](https://wails.io/), [Gin](https://gin-gonic.com/) |
| Frontend | React 19, TypeScript 5, [Vite 6](https://vitejs.dev/), [Material UI v6](https://mui.com/) |
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
│   │   ├── components/     # React views (Login, Home, Friends, Rankings)
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

- Go 1.25+
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
  "server_url": "http://localhost:8080",
  "debug": false
}
```

## API Integration

This client connects to the MatchCoreArena server API. Make sure the server is running and accessible at the configured URL.

### API Endpoints Used

- **Authentication**: `/api/auth/login-ticket`, `/api/auth/totp-verify`, `/api/auth/refresh`, `/api/auth/logout`
- **Users**: `/api/users/me`, `/api/users/{uid}`, `/api/users/me/experience`
- **Friends**: `/api/friends`, `/api/friends/{id}/accept`, `/api/friends/{id}/reject`, `/api/friends/{id}`
- **Rankings**: `/api/rankings/{type}`, `/api/rankings/me`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.