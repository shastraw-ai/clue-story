# Clue Story

A React Native + Expo app that generates interactive bedtime stories with educational challenges for kids using OpenAI.

## Features

- **Personalized Stories**: Generate custom adventure stories with your kids as the main characters
- **Educational Challenges**: Each story stage includes age-appropriate math or reading problems
- **Multiple Kids Support**: Add up to 5 kids with individual grade levels and difficulty settings
- **Subject Selection**: Choose between Math word problems or Reading/Language challenges
- **Step-by-Step Reading**: Navigate through story stages with kid-specific challenge tabs
- **Story History**: Save and revisit previously generated stories

## Tech Stack

- React Native 0.81 + Expo 54
- TypeScript
- Expo Router (file-based navigation)
- React Native Paper (Material Design 3)
- Zustand (state management)
- AsyncStorage (local data persistence)
- expo-secure-store (API key storage)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npx expo start
   ```

3. In the app, go to **Settings** and:
   - Add your OpenAI API key
   - Add kids (name, grade, gender, difficulty level)

## Usage

1. **Create Story Tab**:
   - Select subject (Math or Reading)
   - Enter a theme (e.g., "Enchanted Forest")
   - Enter a role (e.g., "Treasure Hunters")
   - Set questions per kid (1-5)
   - Select which kids to include
   - Tap "Generate Story"

2. **Story Reader**:
   - Navigate through stages using arrow buttons
   - Tap kid tabs to see each child's challenge
   - Use "Show Solution" to reveal answers

3. **History Tab**: View and re-read saved stories

## Project Structure

```
/clue-story
├── app/
│   ├── _layout.tsx              # Root layout with PaperProvider
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab navigation
│   │   ├── index.tsx            # Create Story screen
│   │   ├── history.tsx          # Story History list
│   │   └── settings.tsx         # Kids & API key management
│   └── story/
│       └── [id].tsx             # Story Reader
├── src/
│   ├── stores/                  # Zustand stores
│   ├── services/                # OpenAI API & parsing
│   ├── types/                   # TypeScript interfaces
│   └── constants/               # Aliases, examples
└── app.json
```

## How It Works

1. **Story Generation**: Sends a prompt to OpenAI to generate a narrative with stage markers
2. **Puzzle Generation**: Separate API call generates grade-appropriate word problems for each kid
3. **Combination**: App combines story stages with puzzles, matching each kid's problems to each stage
4. **Display**: Aliases in the story are replaced with real kid names in the UI

## License

MIT
