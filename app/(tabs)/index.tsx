import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  useTheme,
  SegmentedButtons,
  Chip,
  Checkbox,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useKidsStore } from '../../src/stores/kidsStore';
import { useStoriesStore } from '../../src/stores/storiesStore';
import { Subject, Kid, StoryMode } from '../../src/types';
import {
  SUBJECTS,
  EXAMPLE_THEMES,
  EXAMPLE_ROLES,
  MAX_QUESTIONS_PER_KID,
} from '../../src/constants/examples';
import { generateStory } from '../../src/services/openai';
import { generateStoryTitle } from '../../src/services/storyParser';

export default function CreateStoryScreen() {
  const theme = useTheme();
  const { hasApiKey, getApiKey, country, model } = useSettingsStore();
  const { kids } = useKidsStore();
  const { addStory, isGenerating, setGenerating, error, setError } = useStoriesStore();

  const [mode, setMode] = useState<StoryMode>('plot');
  const [subject, setSubject] = useState<Subject>('math');
  const [role, setRole] = useState('');
  const [storyTheme, setStoryTheme] = useState('');
  const [questionsPerKid, setQuestionsPerKid] = useState(2);
  const [selectedKidIds, setSelectedKidIds] = useState<string[]>([]);

  // Select all kids by default when kids list changes
  useEffect(() => {
    if (kids.length > 0) {
      setSelectedKidIds(kids.map((kid) => kid.id));
    }
  }, [kids]);

  const toggleKidSelection = (kidId: string) => {
    setSelectedKidIds((prev) =>
      prev.includes(kidId) ? prev.filter((id) => id !== kidId) : [...prev, kidId]
    );
  };

  const selectedKids = kids.filter((kid) => selectedKidIds.includes(kid.id));

  const canGenerate =
    hasApiKey &&
    selectedKids.length > 0 &&
    role.trim() &&
    storyTheme.trim() &&
    !isGenerating;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setGenerating(true);
    setError(null);

    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        throw new Error('API key not found');
      }

      const { stages, rawResponse } = await generateStory(
        {
          subject,
          role: role.trim(),
          theme: storyTheme.trim(),
          questionsPerKid,
          kids: selectedKids,
          mode,
        },
        apiKey,
        country || undefined,
        model
      );

      const title = generateStoryTitle(storyTheme.trim(), role.trim());

      const story = await addStory(
        title,
        subject,
        role.trim(),
        storyTheme.trim(),
        selectedKids,
        stages,
        rawResponse
      );

      // Navigate to story reader
      router.push(`/story/${story.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate story';
      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  const fillExample = (type: 'theme' | 'role', value: string) => {
    if (type === 'theme') {
      setStoryTheme(value);
    } else {
      setRole(value);
    }
  };

  // Show setup required message
  if (!hasApiKey || kids.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Surface style={styles.setupCard} elevation={2}>
          <Text variant="headlineSmall" style={styles.setupTitle}>
            Setup Required
          </Text>
          {!hasApiKey && (
            <Text variant="bodyMedium" style={styles.setupText}>
              Please add your OpenAI API key in Settings.
            </Text>
          )}
          {kids.length === 0 && (
            <Text variant="bodyMedium" style={styles.setupText}>
              Please add at least one kid in Settings.
            </Text>
          )}
          <Button
            mode="contained"
            onPress={() => router.push('/(tabs)/settings')}
            style={styles.setupButton}
          >
            Go to Settings
          </Button>
        </Surface>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Mode Selection */}
      <Card style={styles.card}>
        <Card.Title title="Mode" />
        <Card.Content>
          <SegmentedButtons
            value={mode}
            onValueChange={(value) => setMode(value as StoryMode)}
            buttons={[
              { value: 'plot', label: 'Plot' },
              { value: 'story', label: 'Story' },
            ]}
          />
          <Text variant="bodySmall" style={styles.modeHint}>
            {mode === 'plot'
              ? 'Brief outlines for you to improvise the story'
              : 'Full narrative ready to read aloud'}
          </Text>
        </Card.Content>
      </Card>

      {/* Subject Selection */}
      <Card style={styles.card}>
        <Card.Title title="Subject" />
        <Card.Content>
          <SegmentedButtons
            value={subject}
            onValueChange={(value) => setSubject(value as Subject)}
            buttons={SUBJECTS.map((s) => ({ value: s.value, label: s.label }))}
          />
        </Card.Content>
      </Card>

      {/* Theme Input */}
      <Card style={styles.card}>
        <Card.Title title="Theme" />
        <Card.Content>
          <TextInput
            mode="outlined"
            label="Enter theme"
            value={storyTheme}
            onChangeText={setStoryTheme}
            placeholder="e.g., Cloud Kingdom"
            style={styles.input}
          />
          <Text variant="labelMedium" style={styles.exampleLabel}>
            Examples:
          </Text>
          <View style={styles.chips}>
            {EXAMPLE_THEMES.map((t) => (
              <Chip
                key={t}
                mode="outlined"
                onPress={() => fillExample('theme', t)}
                selected={storyTheme === t}
                style={styles.chip}
              >
                {t}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Role Input */}
      <Card style={styles.card}>
        <Card.Title title="Role" />
        <Card.Content>
          <TextInput
            mode="outlined"
            label="Enter role"
            value={role}
            onChangeText={setRole}
            placeholder="e.g., Detectives"
            style={styles.input}
          />
          <Text variant="labelMedium" style={styles.exampleLabel}>
            Examples:
          </Text>
          <View style={styles.chips}>
            {EXAMPLE_ROLES.map((r) => (
              <Chip
                key={r}
                mode="outlined"
                onPress={() => fillExample('role', r)}
                selected={role === r}
                style={styles.chip}
              >
                {r}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Questions per Kid */}
      <Card style={styles.card}>
        <Card.Title title={`Questions per Kid: ${questionsPerKid}`} />
        <Card.Content>
          <View style={styles.sliderContainer}>
            <Text variant="bodySmall">1</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={MAX_QUESTIONS_PER_KID}
              step={1}
              value={questionsPerKid}
              onValueChange={setQuestionsPerKid}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.outlineVariant}
              thumbTintColor={theme.colors.primary}
            />
            <Text variant="bodySmall">{MAX_QUESTIONS_PER_KID}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Kids Selection */}
      <Card style={styles.card}>
        <Card.Title
          title="Select Kids"
          subtitle={`${selectedKids.length} selected`}
        />
        <Card.Content>
          {kids.map((kid) => (
            <Surface key={kid.id} style={styles.kidItem} elevation={1}>
              <Checkbox
                status={selectedKidIds.includes(kid.id) ? 'checked' : 'unchecked'}
                onPress={() => toggleKidSelection(kid.id)}
              />
              <View style={styles.kidItemInfo}>
                <Text variant="bodyLarge">{kid.name}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Grade {kid.grade} | Difficulty {kid.difficultyLevel}/5
                </Text>
              </View>
            </Surface>
          ))}
        </Card.Content>
      </Card>

      {/* Error Message */}
      {error && (
        <Surface
          style={[styles.errorCard, { backgroundColor: theme.colors.errorContainer }]}
          elevation={0}
        >
          <Text style={{ color: theme.colors.onErrorContainer }}>{error}</Text>
        </Surface>
      )}

      {/* Generate Button */}
      <Button
        mode="contained"
        onPress={handleGenerate}
        disabled={!canGenerate}
        style={styles.generateButton}
        contentStyle={styles.generateButtonContent}
      >
        {isGenerating ? (
          <ActivityIndicator color={theme.colors.onPrimary} size="small" />
        ) : (
          'Generate Story'
        )}
      </Button>

      {isGenerating && (
        <Text
          variant="bodySmall"
          style={[styles.generatingText, { color: theme.colors.onSurfaceVariant }]}
        >
          Creating your story... This may take a minute.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  setupCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: 320,
  },
  setupTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  setupText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  setupButton: {
    marginTop: 16,
  },
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  modeHint: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  exampleLabel: {
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  kidItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginBottom: 8,
    borderRadius: 8,
  },
  kidItemInfo: {
    flex: 1,
    marginLeft: 8,
  },
  errorCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  generateButton: {
    marginTop: 8,
  },
  generateButtonContent: {
    paddingVertical: 8,
  },
  generatingText: {
    textAlign: 'center',
    marginTop: 12,
  },
});
