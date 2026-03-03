# Manuscript MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server for **FogBugz / Manuscript**. Connect Cursor, Claude Desktop, or any MCP-compatible client to your FogBugz instance and let an AI assistant search cases, read comments, reassign work, resolve bugs, and more — all through natural language.

## Features

| Tool | Description |
|---|---|
| `search_cases` | Search cases using the full FogBugz query syntax |
| `get_case` | Get detailed case info (title, status, project, milestone, priority, tags, kanban column, parent/child, dates) |
| `get_case_comments` | Retrieve all comments, events, and attachments for a case |
| `list_people` | List and search FogBugz users by name or email |
| `edit_case` | Edit case fields: title, project, milestone, priority, tags, kanban column, due date, and more |
| `assign_case` | Reassign a case to another person |
| `resolve_case` | Resolve a case with an optional resolution status |
| `close_case` | Close a resolved case |
| `reopen_case` | Reopen a closed or resolved case (auto-detects reopen vs reactivate) |

Every response includes a direct link to the case in FogBugz.

## Prerequisites

- **Node.js 18+** — [download](https://nodejs.org/)
- A **FogBugz / Manuscript** instance with API access
- A **FogBugz API token** — see [Creating an API Token](https://support.fogbugz.com/article/52425-create-api-token-using-the-fogbugz-ui) or generate one via the API

## Installation

```bash
git clone https://github.com/bardiabarabadi/Manuscript-MCP.git
cd Manuscript-MCP
npm install
npm run build
```

After building, the server binary is at `dist/index.js`.

## Configuration

The server requires two environment variables:

| Variable | Description | Example |
|---|---|---|
| `FOGBUGZ_URL` | Your FogBugz instance URL (no trailing slash) | `https://mycompany.fogbugz.com` |
| `FOGBUGZ_TOKEN` | Your FogBugz API token | `abc123def456...` |

You can obtain an API token from:
- **FogBugz UI**: Avatar menu → Integrations → API Tokens → Create
- **FogBugz API**: `POST https://<your-instance>/api/logon` with `{"email": "...", "password": "..."}`

Tokens do not expire.

## Connecting to Cursor

Add the server to your Cursor MCP configuration. Create or edit `.cursor/mcp.json` in your project root (or your global Cursor config):

```json
{
  "mcpServers": {
    "manuscript": {
      "command": "node",
      "args": ["/absolute/path/to/Manuscript-MCP/dist/index.js"],
      "env": {
        "FOGBUGZ_URL": "https://mycompany.fogbugz.com",
        "FOGBUGZ_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

Replace the path and credentials with your own values. Restart Cursor after saving.

To verify, open Cursor's MCP panel (gear icon → MCP) and check that `manuscript` appears as connected.

## Connecting to Claude Desktop

Edit `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "manuscript": {
      "command": "node",
      "args": ["/absolute/path/to/Manuscript-MCP/dist/index.js"],
      "env": {
        "FOGBUGZ_URL": "https://mycompany.fogbugz.com",
        "FOGBUGZ_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

Restart Claude Desktop after saving. You should see the MCP tools icon in the chat input.

## Tool Reference

### search_cases

Search FogBugz cases. The query uses the same syntax as the FogBugz search box.

**Parameters:**
- `q` (string, required) — Search query. Examples:
  - `"project:Inbox assignedTo:Alice"` — cases in Inbox assigned to Alice
  - `"status:active priority:1"` — active P1 cases
  - `"12,25,556"` — specific case numbers
  - `"login bug"` — free text search
- `max` (number, optional, default 50) — Maximum results

### get_case

Get full details for a single case.

**Parameters:**
- `case_number` (number, required) — The FogBugz case number

**Returns:** Title, status, project, area, category, milestone, priority, kanban column, tags, assigned person, parent/child cases, related cases, dates, estimates, story points, and a direct link.

### get_case_comments

Get the full event/comment history for a case.

**Parameters:**
- `case_number` (number, required) — The FogBugz case number

**Returns:** Chronological list of all events with: person, date, event type, comment text, field changes, and attachment download links.

### list_people

List FogBugz users with optional filtering.

**Parameters:**
- `search` (string, optional) — Filter by name or email (case-insensitive substring)
- `include_inactive` (boolean, optional, default false) — Include inactive/deleted users

### edit_case

Edit one or more fields on a case.

**Parameters:**
- `case_number` (number, required)
- `title` (string, optional)
- `project` (string, optional)
- `area` (string, optional)
- `milestone` (string, optional)
- `priority` (string, optional) — e.g. `"Must Fix"`, `"Fix If Time"`
- `category` (string, optional) — e.g. `"Bug"`, `"Feature"`
- `tags` (string[], optional) — Replaces all existing tags
- `kanban_column` (string, optional)
- `parent_case` (number, optional)
- `due_date` (string, optional) — ISO 8601 format
- `comment` (string, optional) — Comment to add

### assign_case

Reassign a case.

**Parameters:**
- `case_number` (number, required)
- `assigned_to` (string, required) — Full name of the person
- `comment` (string, optional)

### resolve_case

Resolve an active case.

**Parameters:**
- `case_number` (number, required)
- `status` (string, optional) — e.g. `"Fixed"`, `"Won't Fix"`, `"Duplicate"`
- `comment` (string, optional)

### close_case

Close a resolved case.

**Parameters:**
- `case_number` (number, required)
- `comment` (string, optional)

### reopen_case

Reopen a closed or resolved case. Automatically uses `reopen` for closed cases and `reactivate` for resolved cases.

**Parameters:**
- `case_number` (number, required)
- `comment` (string, optional)

## Example Prompts

Once connected, you can ask your AI assistant things like:

- *"Search for all open cases assigned to Alice in the Backend project"*
- *"Show me the details of case 1234"*
- *"What are the comments on case 5678?"*
- *"Assign case 1234 to Bob with a comment saying 'Please review the fix'"*
- *"Resolve case 4567 as Fixed"*
- *"List all users whose name contains 'Smith'"*
- *"Summarize the discussion in case 9012"*

## Development

```bash
# Run in development mode (no build needed)
FOGBUGZ_URL=https://mycompany.fogbugz.com FOGBUGZ_TOKEN=your-token npx tsx src/index.ts

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type-check without emitting
npx tsc --noEmit
```

## Project Structure

```
src/
  index.ts              — Entry point: creates MCP server, registers tools, starts stdio transport
  fogbugz-client.ts     — HTTP client wrapping the FogBugz JSON API
  types.ts              — TypeScript types for API responses
  tools/
    search-cases.ts     — search_cases tool
    get-case.ts         — get_case tool
    get-case-comments.ts — get_case_comments tool
    list-people.ts      — list_people tool
    edit-case.ts        — edit_case tool
    assign-case.ts      — assign_case tool
    resolve-case.ts     — resolve_case tool
    close-case.ts       — close_case tool
    reopen-case.ts      — reopen_case tool
tests/
  fogbugz-client.test.ts — Unit tests for the FogBugz API client
  tools.test.ts          — Unit tests for all MCP tool handlers
```

## Troubleshooting

**"FOGBUGZ_URL and FOGBUGZ_TOKEN environment variables are required"**
Make sure both environment variables are set in your MCP configuration. Check for typos.

**"Error 3: Not logged in"**
Your API token is invalid or expired. Generate a new one from the FogBugz UI.

**"Error 6: API action not permitted"**
Your FogBugz user doesn't have permission for the action (e.g. closing a case that isn't resolved).

**Server doesn't appear in Cursor/Claude**
- Ensure the `node` path and `dist/index.js` path are absolute
- Restart Cursor/Claude Desktop after editing the config
- Check that `npm run build` completed without errors

**Cases not found**
The FogBugz search query syntax is the same as the web UI search box. Test your query in FogBugz first.

## License

MIT
