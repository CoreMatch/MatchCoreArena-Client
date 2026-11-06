# MatchCoreArena Client Usage Guide

## Quick Start

1. **Start the application**:
   ```bash
   ./start.sh
   ```
   Or manually:
   ```bash
   wails dev
   ```

2. **Login**:
   - Enter your email and password
   - If TOTP is enabled, enter the 6-digit code from your authenticator app

3. **Navigate the app**:
   - **Play**: Queue for a match (solo or party), watch the queue cycle, see your rank card and recent matches
   - **Career**: Browse your recorded match history (read-only)
   - **Rankings**: View leaderboards and your rank card
   - **Friends**: View your friend list (read-only)
   - **Settings**: Account data, language, about

> The client never writes match data: match reporting is operated through
> the maintenance panel (MatchCoreArena-MaintenanceView) and the game-side
> reporter.

## Features

### Authentication
- Email/password login
- Two-factor authentication (TOTP)
- Automatic token refresh on expiry; the app returns to the login screen when a refresh fails
- Secure logout

### Play (matchmaking)
- Queue solo or as a party (member UUID roster; the party queues and settles together)
- Queue cycle: In Queue (wait timer, cancel) → Match Found → In Match → Results In
- When the result is reported, the recorded match id links straight into Career detail

### Career
- Paginated list of your recorded matches (time, mode, map, winner, duration)
- Per-match detail with participants (kills/deaths/survival) and server-computed score deltas

### Friend List
- View your friends list (read-only; sending or handling requests is not available in this client)

### Rankings
- View top players by ranking type (1v1, 2v2)
- Filter by season
- See your current ranking and score
- Adjustable leaderboard size (Top 50, 100, 200, 500)

### User Profile
- View your level and experience points
- See your current rank score

## Configuration

The application configuration is stored at `~/.matchcorearena/config.json`:

```json
{
  "server_url": "https://arena.mcnb.dev/",
  "debug": false
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `server_url` | string | `https://arena.mcnb.dev/` | MatchCoreArena server URL |
| `debug` | boolean | `false` | Enable debug logging |

## Keyboard Shortcuts

- **Ctrl+R / Cmd+R**: Refresh current view
- **Ctrl+Q / Cmd+Q**: Quit application
- **Escape**: Close dialogs

## Troubleshooting

### Application won't start
1. Ensure Go 1.26+ is installed
2. Ensure Node.js 18+ is installed
3. Run `go mod tidy` to install Go dependencies
4. Run `cd frontend && npm install` to install frontend dependencies

### Cannot connect to server
1. Check that the MatchCoreArena server is running
2. Verify the `server_url` in your configuration
3. Check network connectivity

### Login issues
1. Verify your email and password
2. Check if TOTP is required
3. Ensure your account is not locked

### Build errors
1. Clean build artifacts: `make clean`
2. Reinstall dependencies: `make install`
3. Run type checking: `make typecheck`

## Development

### Running in Development Mode
```bash
wails dev
```

### Building for Production
```bash
wails build
```

### Running Tests
```bash
make test
```

### Code Quality
```bash
make check  # Runs fmt, vet, lint, and typecheck
```

## API Integration

This client connects to the MatchCoreArena server API. It performs read queries plus the player's own session and queue operations:

- **Authentication**: Login, TOTP verification, token refresh, logout
- **Users**: Get user profile
- **Friends**: View friend list
- **Matches**: Match history and per-match detail
- **Matchmaking**: Join queue (solo or party roster), leave queue, poll status
- **Rankings**: Leaderboards and personal ranking

Match reporting is handled by the game-side reporter and the maintenance panel (MatchCoreArena-MaintenanceView), not by this client.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the server API documentation
3. Contact the development team

## License

This project is licensed under the AGPL-3.0 License. See the LICENSE file for details.