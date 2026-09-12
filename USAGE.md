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
   - **Home**: View your profile, stats, and recent activity
   - **Friends**: Manage your friend list
   - **Rankings**: View leaderboards and your ranking

## Features

### Authentication
- Email/password login
- Two-factor authentication (TOTP)
- Automatic token refresh
- Secure logout

### Friend System
- View your friends list
- Send friend requests by user ID
- Accept/reject incoming friend requests
- Remove friends

### Rankings
- View top players by ranking type (1v1, 2v2)
- Filter by season
- See your current ranking and score
- Adjustable leaderboard size (Top 50, 100, 200, 500)

### User Profile
- View your level and experience points
- See your current rank score
- Track your gaming statistics

## Configuration

The application configuration is stored at `~/.matchcorearena/config.json`:

```json
{
  "server_url": "http://localhost:8080",
  "debug": false
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `server_url` | string | `http://localhost:8080` | MatchCoreArena server URL |
| `debug` | boolean | `false` | Enable debug logging |

## Keyboard Shortcuts

- **Ctrl+R / Cmd+R**: Refresh current view
- **Ctrl+Q / Cmd+Q**: Quit application
- **Escape**: Close dialogs

## Troubleshooting

### Application won't start
1. Ensure Go 1.25+ is installed
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

This client connects to the MatchCoreArena server API. The following endpoints are used:

- **Authentication**: Login, TOTP verification, token refresh, logout
- **Users**: Get user profile, add experience
- **Friends**: Friend list management, friend requests
- **Rankings**: Leaderboards and personal ranking

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the server API documentation
3. Contact the development team

## License

This project is licensed under the MIT License. See the LICENSE file for details.