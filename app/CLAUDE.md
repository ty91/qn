# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native/Expo note-taking application ("qn") built with TypeScript. The app uses SQLite for local storage and supports cloud synchronization.

## Key Technologies

- **Framework**: Expo SDK 53 with React Native 0.79.4
- **Language**: TypeScript (strict mode)
- **State Management**: Zustand
- **Routing**: Expo Router (file-based)
- **Database**: SQLite via expo-sqlite
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

1. **Database Operations**: All SQLite operations are centralized in `services/database.ts`
2. **Note Editing**: Uses context pattern (`contexts/note-editor-context.tsx`) with custom hook (`hooks/use-note-editor.ts`)
3. **Component Structure**: Functional components with TypeScript interfaces
4. **Routing**: File-based routing with `_layout.tsx` as root layout
5. **State Management**: Zustand stores for global state, React context for feature-specific state

## Key Features Implementation

- **Note CRUD**: Implemented in `services/database.ts` with SQLite
- **Auto-save**: Handled in note editor with debounced updates
- **Gestures**: Pan gestures for note interactions using react-native-gesture-handler
- **Theme**: Light/dark mode support via `useColorScheme` hook
- **Cloud Sync**: Configuration in `app.json` for react-native-cloud-storage

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
