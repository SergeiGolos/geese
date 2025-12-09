# Geese Editor Mode

Web-based IDE for managing `.geese` files, pipes, and configuration.

## Phase 1 Implementation

**Status**: ✅ Complete

### Features

- Express.js web server running on localhost
- VS Code-inspired file browser with Local/Global sections
- File viewing with syntax-aware display
- Read-only editor (Monaco Editor with fallback to textarea)
- Support for `.geese`, pipe `.js`, and `config.json` files

## Phase 2 Implementation

**Status**: ✅ Complete

### Features

- **File Editing**: Full Monaco Editor with syntax highlighting
- **Save Functionality**: Save files with Ctrl+S or Save button
- **File Creation**: Create new .geese files and pipes via "+ New" buttons
- **File Deletion**: Delete files with confirmation dialog
- **Real-time Validation**: YAML and JSON validation before saving
- **Modified Indicator**: Visual indicator (●) for unsaved changes
- **Status Messages**: Success/error feedback for all operations
- **Context Menu**: Right-click files for quick actions

## Phase 3 Implementation

**Status**: ✅ Complete

### Features

- **Configuration File Editing**: Edit config.json files using the same Monaco Editor
- **JSON Schema Validation**: Validate configuration structure before saving
- **Syntax Highlighting**: JSON syntax highlighting for config files
- **Same UX**: Consistent editing experience across all file types (geese, pipes, config)

## Phase 4 Implementation

**Status**: ✅ Complete

### Features

- **Log Viewer**: View logs from recent Geese task runs
- **Log List**: Display recent runs with metadata (task name, timestamp, status, duration, sessions)
- **Log Detail View**: View full log content with markdown rendering
- **Relative Timestamps**: Show timestamps as "6h ago", "12h ago", etc.
- **Markdown Rendering**: Convert markdown logs to HTML with tables, code blocks, and formatting
- **Toggle View**: Switch between Editor and Logs views with button in header
- **Auto-selection**: Automatically select and display most recent log

### Usage

```bash
# Start the editor
geese editor

# Specify custom port
geese editor --port 3001

# Start without opening browser
geese editor --no-browser

# Or use npm script
npm run editor
```

### Architecture

```
src/editor/
├── server/
│   ├── index.js           # Express server setup
│   └── routes/
│       └── files.js       # File API endpoints
└── client/
    └── public/
        ├── index.html     # HTML shell
        └── app.js         # Vanilla JS client app
```

### API Endpoints

- `GET /api/files` - List all .geese files and pipes
- `GET /api/files/:scope/:type/:filename` - Get file contents
- `PUT /api/files/:scope/:type/:filename` - Save file contents (with validation)
- `POST /api/files/:scope/:type` - Create new file
- `DELETE /api/files/:scope/:type/:filename` - Delete file
  - scope: `local`, `global`, or `root`
  - type: `geese`, `pipes`, or `config`

- `GET /api/logs` - List all log files with metadata
- `GET /api/logs/:filename` - Get log file content

### Security

- Server binds to localhost only (no external access)
- CORS restricted to localhost
- File access restricted to project directory and `~/.geese/`
- Path traversal protection

## Future Phases

### Phase 5: Pipe Library
- Browse available pipes
- View pipe documentation
- Cross-reference usage in .geese files

## Development

The editor uses:
- **Backend**: Express.js with CORS
- **Frontend**: Vanilla JavaScript (no build step required)
- **Editor**: Monaco Editor (with textarea fallback)
- **Styling**: Inline CSS with VS Code theme

No build process is required. The frontend is served as static files.
