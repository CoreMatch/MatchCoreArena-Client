# Contributing to MatchCoreArena Client

Thank you for your interest in contributing to MatchCoreArena Client! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Go 1.25+
- Node.js 18+
- Wails CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/MatchCoreArena-Client.git
   cd MatchCoreArena-Client
   ```
3. Install dependencies:
   ```bash
   make install
   ```
4. Create a branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

1. **Start development server**:
   ```bash
   make dev
   ```

2. **Make your changes**:
   - Follow the code style guidelines
   - Write tests for new functionality
   - Update documentation as needed

3. **Test your changes**:
   ```bash
   make test
   make check
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**

## Code Style

### Go

- Follow standard Go conventions
- Use `gofmt` for formatting
- Run `go vet` for static analysis
- Write meaningful comments for exported functions

### TypeScript/React

- Use TypeScript for all new code
- Follow React best practices
- Use functional components with hooks
- Follow the existing component structure

### Commit Messages

We follow Conventional Commits:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

## Testing

### Go Tests

```bash
# Run all tests
make test

# Run specific test
go test ./path/to/package -run TestFunctionName
```

### Frontend Tests

```bash
# Type checking
make typecheck

# Linting
make lint
```

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Ensure all tests pass**:
   ```bash
   make check
   ```
4. **Update the CHANGELOG.md** with your changes
5. **Request review** from maintainers

### PR Guidelines

- Keep PRs focused on a single feature or fix
- Provide a clear description of the problem and solution
- Include screenshots for UI changes
- Reference related issues

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Description**: Clear and concise description of the bug
2. **Steps to Reproduce**: Step-by-step instructions to reproduce the behavior
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**:
   - OS: [e.g., Windows 10, macOS 12, Ubuntu 22.04]
   - Go version: [e.g., 1.25]
   - Node.js version: [e.g., 18]
6. **Screenshots**: If applicable

### Feature Requests

When suggesting features:

1. **Description**: Clear description of the feature
2. **Use Case**: Why this feature would be useful
3. **Proposed Solution**: If you have one
4. **Alternatives**: Any alternative solutions you've considered

## Getting Help

- Check the [USAGE.md](USAGE.md) for common usage patterns
- Review existing issues and pull requests
- Join our community discussions

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 License.

Thank you for contributing to MatchCoreArena Client!