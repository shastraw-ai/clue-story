# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clue Story is a React Native + Expo mobile app that generates personalized bedtime stories with educational challenges (math or reading) for kids using OpenAI's API.

## Development Commands

```bash
npm install          # Install dependencies
npx expo start       # Start development server (press 'a' for Android, 'i' for iOS, 'w' for web)
npx expo start --android   # Start directly on Android
npx expo start --ios       # Start directly on iOS
./build-apk.sh       # Build Android APK locally
```

There is no test framework configured.

## Architecture

### Navigation (Expo Router)

File-based routing in `app/`:
- `(tabs)/index.tsx` - Create Story screen (main entry point)
- `(tabs)/history.tsx` - Saved stories list
- `(tabs)/settings.tsx` - API key and kids management
- `story/[id].tsx` - Story reader with stage navigation

### State Management (Zustand)

Three stores in `src/stores/`:
- `kidsStore.ts` - Kid profiles (name, grade, difficulty, alias)
- `storiesStore.ts` - Generated stories CRUD
- `settingsStore.ts` - OpenAI API key (uses expo-secure-store)

### OpenAI Integration (`src/services/openai.ts`)

Uses `gpt-4o-mini` model. Story generation has two modes:
- **Plot mode**: Brief stage outlines for parent improvisation
- **Story mode**: Full narrative with character encounters

Generation flow:
1. Generate story narrative with `=== STAGE X ===` markers
2. Generate puzzles per kid in parallel (grade + difficulty-specific)
3. Parse stages and combine with puzzles
4. Replace aliases (Alice, Ben, etc.) with real kid names in UI

### Key Types (`src/types/index.ts`)

- `Kid` - Child profile with grade ('K'-'12'), difficultyLevel (1-5), alias
- `Story` - Complete story with stages and metadata
- `StoryStage` - Stage content + array of ProblemContent (one per kid)
- `StoryGenerationParams` - Input for story generation

### UI Framework

React Native Paper (Material Design 3) with custom theming in `app/_layout.tsx`.

## Key Implementation Details

- API key stored securely via `expo-secure-store`
- Kids data persisted via `AsyncStorage`
- Aliases from `src/constants/aliases.ts` are predefined (10 boy names, 10 girl names)
- Story parsing uses regex to split on `=== STAGE X ===` markers
- Puzzle prompts include grade-level and difficulty calibration
