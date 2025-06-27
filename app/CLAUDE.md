# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native/Expo note-taking application ("qn") built with TypeScript. The app uses GitHub as a backend for note storage, with SQLite for local caching and offline support.

## Key Technologies

- **Framework**: Expo SDK 53 with React Native 0.79.4
- **Language**: TypeScript (strict mode)
- **State Management**: React Context API
- **Routing**: Expo Router (file-based)
- **Local Database**: SQLite via expo-sqlite (for caching)
- **Cloud Storage**: GitHub private repository
- **Authentication**: GitHub OAuth
- **Package Manager**: pnpm

## Development Commands

```bash
# Start development
pnpm start

# Platform-specific development
pnpm run ios       # iOS simulator
pnpm run android   # Android emulator
pnpm run web       # Web browser

# Code quality
pnpm run lint      # Run ESLint

# Utilities
pnpm run reset-project  # Reset to fresh state
```

## Project Structure

- `app/` - Expo Router pages (file-based routing)
- `components/` - Reusable UI components
- `contexts/` - React contexts (e.g., note-editor-context)
- `hooks/` - Custom React hooks
- `services/` - Business logic (database.ts for SQLite operations)
- `types/` - TypeScript type definitions
- `assets/` - Images and fonts

## Architecture Patterns

1. **Database Operations**: SQLite for local caching, GitHub API for persistent storage
2. **Note Editing**: Uses context pattern (`contexts/note-editor-context.tsx`) with custom hook (`hooks/use-note-editor.ts`)
3. **Component Structure**: Functional components with TypeScript interfaces
4. **Routing**: File-based routing with `_layout.tsx` as root layout
5. **State Management**: React Context API for feature-specific state

## GitHub Backend Architecture

### Storage Structure
- **Repository**: `qn-vault` (auto-created private repo)
- **Directory**: `/notes/` (flat structure)
- **File naming**: `{timestamp}-{uuid}.md` (e.g., `20240115103045-a1b2c3d4.md`)
- **File format**: Markdown with YAML frontmatter
  ```markdown
  ---
  id: 20240115103045-a1b2c3d4
  created: 2024-01-15T10:30:45Z
  updated: 2024-01-15T11:45:30Z
  ---
  
  Note content...
  ```

### Synchronization Strategy
- **Change detection**: Git Commits API (`GET /repos/{owner}/{repo}/commits`)
- **Conflict resolution**: Local changes always take priority
- **Offline support**: Changes queued in SQLite, synced when online
- **Retry logic**: 3 attempts with exponential backoff
- **Rate limiting**: Max 4800 requests/hour (safety buffer)

### Local Database Schema
```sql
-- Main notes table
CREATE TABLE notes (
  filename TEXT PRIMARY KEY,
  id TEXT UNIQUE,
  first_line TEXT,
  content TEXT,      -- Content without frontmatter
  created_at TEXT,
  updated_at TEXT,
  sha TEXT,          -- GitHub file SHA for change detection
  is_dirty INTEGER DEFAULT 0
);

-- Sync queue for offline operations
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT,    -- 'create', 'update', 'delete'
  filename TEXT,
  content TEXT,
  created_at TEXT,
  retry_count INTEGER DEFAULT 0
);
```

## Key Features Implementation

- **Note CRUD**: Local SQLite + GitHub API synchronization
- **Auto-save**: Debounced local save with background sync
- **Offline mode**: Full functionality with queued sync
- **Gestures**: Swipe to delete using react-native-gesture-handler
- **Theme**: Light/dark mode support via `useColorScheme` hook
- **Authentication**: GitHub OAuth with `repo` scope

## TypeScript Configuration

- Strict mode enabled
- Path alias: `@/*` maps to project root
- Module resolution: bundler
- Target: ES2020

## Important Considerations

1. Always use TypeScript with proper types
2. Follow existing component patterns in `components/` directory
3. Database schema changes require migration handling
4. Test on both iOS and Android when making UI changes
5. Use Expo SDK features when available instead of bare React Native packages
6. GitHub API rate limits: Stay under 4800 requests/hour
7. Handle offline scenarios gracefully with sync queue
8. UI Language: Korean (e.g., "무슨 생각을 하고 계신가요?")

## Implementation Status

### Completed
- ✅ GitHub OAuth authentication
- ✅ Basic note editor UI
- ✅ Note list with swipe gestures
- ✅ Auto-save functionality
- ✅ Theme support

### In Progress
- 🚧 GitHub backend integration
- 🚧 SQLite local storage
- 🚧 Sync manager
- 🚧 Offline queue system

### Planned
- ⏳ Sync status indicator (cloud icon)
- ⏳ Initial sync optimization
- ⏳ Conflict resolution UI
