# Snyk MCP Server

A standalone Model Context Protocol server for Snyk security scanning functionality.

## Configuration

Update your Claude desktop config (`claude-config.json`):

```json
{
  "mcpServers": {
    "snyk": {
      "command": "npx",
      "args": [
        "-y",
        "github:Sladey01/mcp-snyk"
      ],
      "env": {
        "SNYK_API_KEY": "your_snyk_token"
      }
    }
  }
}
```

Replace the token with your actual Snyk API token.

## Features

- Repository security scanning
- Snyk project scanning
- Integration with Claude desktop

## Usage

In Claude, you can use commands like:

```
Scan repository https://github.com/owner/repo for security vulnerabilities
```

or

```
Scan Snyk project project-id-here
```