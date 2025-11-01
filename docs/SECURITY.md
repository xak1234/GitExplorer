# Security Implementation for Private Repository Access

This document outlines the security measures implemented to safely access private GitHub repositories on your local device.

## 🔐 Authentication & Token Security

### GitHub Personal Access Token
- **Required**: GitHub PAT with `repo` scope for private repository access
- **Validation**: Token is validated on startup with scope verification
- **Storage**: Stored securely in `.env.local` (never committed to git)
- **Usage**: Token is used only for GitHub API calls, never logged or exposed

### Token Scope Requirements
- `repo` - Full control of private repositories (required for private repos)
- `public_repo` - Access to public repositories (minimal requirement for public repos)

## 🛡️ Input Validation & Sanitization

### Repository URL Validation
- Validates GitHub repository URL formats
- Prevents malicious input patterns
- Supports multiple URL formats (HTTPS, SSH, short format)
- Sanitizes input to prevent injection attacks

### Commit SHA Validation
- Validates 40-character hexadecimal commit SHAs
- Prevents invalid or malicious commit references

### File Path Validation
- Prevents path traversal attacks (`../` sequences)
- Validates file path format and length
- Blocks potentially dangerous characters

## 🚦 Rate Limiting & Resource Management

### API Rate Limiting
- Configurable rate limits (default: 60 requests/minute)
- Relaxed limits for localhost connections
- Protects against API abuse and GitHub rate limits

### Session Management
- Automatic session cleanup after timeout (default: 60 minutes)
- Memory-efficient session storage
- Process isolation for workspace operations

### File Size Limits
- Configurable maximum file size (default: 1MB)
- Prevents memory exhaustion from large files
- Efficient streaming for file operations

## 🔒 Network Security

### Security Headers
- Helmet.js for security headers
- Content Security Policy (CSP)
- Cross-Origin Resource Sharing (CORS) configuration
- Protection against common web vulnerabilities

### Local Development Focus
- CORS configured for local development ports
- Rate limiting bypassed for localhost
- Optimized for single-user local usage

## 📁 File System Security

### Workspace Isolation
- Git worktrees for isolated workspace creation
- Temporary directories with proper cleanup
- No persistent storage of repository data

### Path Security
- All file operations within designated workspace
- Path traversal prevention
- Secure file serving with proper MIME types

### Cleanup Procedures
- Automatic cleanup of expired sessions
- Removal of temporary files and directories
- Process termination on session end

## 🔍 Access Controls

### Repository Access Verification
- Verifies repository existence and access permissions
- Optional organization-based access restrictions
- Graceful handling of access denied scenarios

### Permission Checks
- Validates token permissions before operations
- Checks repository accessibility
- Provides clear error messages for permission issues

## 📊 Monitoring & Logging

### Security Logging
- Startup validation logs
- Access attempt logging
- Error logging without sensitive data exposure
- Session lifecycle tracking

### Error Handling
- Sanitized error messages (no sensitive data)
- Proper HTTP status codes
- Detailed logging for debugging (server-side only)

## ⚙️ Configuration Options

### Environment Variables
```bash
# Required
GITHUB_TOKEN=your_github_token_here

# Optional Security Settings
ALLOWED_GITHUB_ORGS=org1,org2          # Restrict to specific orgs
MAX_FILE_SIZE=1048576                   # Max file size in bytes
RATE_LIMIT_MAX_REQUESTS=60              # Requests per minute
SESSION_TIMEOUT_MINUTES=60              # Session timeout
```

## 🚀 Quick Setup for Private Repository Access

1. **Generate GitHub Token:**
   ```bash
   # Go to: https://github.com/settings/tokens
   # Select "repo" scope for private repositories
   ```

2. **Configure Application:**
   ```bash
   npm run setup  # Interactive setup
   # OR manually:
   cp env.example .env.local
   # Edit .env.local with your token
   ```

3. **Start Application:**
   ```bash
   npm install
   npm run dev:full
   ```

4. **Verify Setup:**
   - Check startup logs for token validation
   - Ensure "repo" scope is present
   - Test with a private repository URL

## 🔧 Troubleshooting

### Common Issues

**"Repository not accessible"**
- Verify token has `repo` scope
- Check repository exists and you have access
- Ensure token is correctly set in `.env.local`

**"Invalid GitHub token"**
- Regenerate token with proper scopes
- Check token format (should start with `ghp_` or `github_pat_`)
- Verify token is not expired

**Rate limiting errors**
- Increase `RATE_LIMIT_MAX_REQUESTS` in config
- Check GitHub API rate limits
- Ensure token is being used (provides higher limits)

## 🔒 Best Practices

1. **Token Management:**
   - Use tokens with minimal required scopes
   - Regularly rotate tokens
   - Never commit tokens to version control

2. **Local Security:**
   - Keep application updated
   - Use on trusted local networks only
   - Monitor workspace directory for cleanup

3. **Access Control:**
   - Use `ALLOWED_GITHUB_ORGS` for additional restrictions
   - Regularly review repository access
   - Monitor session activity

This security implementation provides robust protection for accessing private repositories while maintaining ease of use for local development.
