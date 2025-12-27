import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Button,
  Card,
  useTheme,
  Surface,
  IconButton,
  ActivityIndicator,
  MD3Theme,
} from 'react-native-paper';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useStoriesStore } from '../../src/stores/storiesStore';
import { replaceAliasesWithNames } from '../../src/services/storyParser';
import { Story, StoryStage, Kid } from '../../src/types';

export default function StoryReaderScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getStoryById } = useStoriesStore();

  const [story, setStory] = useState<Story | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    if (id) {
      const found = getStoryById(id);
      if (found) {
        setStory(found);
      }
    }
  }, [id]);

  if (!story) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const currentStage = story.stages[currentStageIndex];
  const isFirstStage = currentStageIndex === 0;
  const isLastStage = currentStageIndex === story.stages.length - 1;

  const goToPrevious = () => {
    if (!isFirstStage) {
      setCurrentStageIndex((prev) => prev - 1);
      setShowSolution(false);
    }
  };

  const goToNext = () => {
    if (!isLastStage) {
      setCurrentStageIndex((prev) => prev + 1);
      setShowSolution(false);
    }
  };

  const handleFinish = () => {
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: story.title,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Stage Indicator */}
        <Surface style={styles.stageIndicator} elevation={1}>
          <Text variant="labelLarge">
            Stage {currentStageIndex + 1} of {story.stages.length}
          </Text>
        </Surface>

        {/* Story Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <StageView
            stage={currentStage}
            kids={story.kids}
            showSolution={showSolution}
            onToggleSolution={() => setShowSolution(!showSolution)}
            theme={theme}
          />
        </ScrollView>

        {/* Navigation */}
        <Surface style={styles.navigation} elevation={2}>
          <IconButton
            icon="chevron-left"
            mode="contained"
            disabled={isFirstStage}
            onPress={goToPrevious}
            size={28}
          />
          <View style={styles.navCenter}>
            {story.stages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === currentStageIndex
                        ? theme.colors.primary
                        : theme.colors.outlineVariant,
                  },
                ]}
              />
            ))}
          </View>
          {isLastStage ? (
            <Button mode="contained" onPress={handleFinish}>
              Finish
            </Button>
          ) : (
            <IconButton
              icon="chevron-right"
              mode="contained"
              onPress={goToNext}
              size={28}
            />
          )}
        </Surface>
      </View>
    </>
  );
}

interface StageViewProps {
  stage: StoryStage;
  kids: Kid[];
  showSolution: boolean;
  onToggleSolution: () => void;
  theme: MD3Theme;
}

function StageView({
  stage,
  kids,
  showSolution,
  onToggleSolution,
  theme,
}: StageViewProps) {
  const displayContent = replaceAliasesWithNames(stage.content, kids);

  return (
    <View style={styles.stageContent}>
      {/* Main Narrative */}
      {displayContent && (
        <Text variant="bodyLarge" style={styles.narrative}>
          {displayContent}
        </Text>
      )}

      {/* Problem Card */}
      {stage.problem && (
        <Card
          style={[
            styles.problemCard,
            { backgroundColor: theme.colors.primaryContainer },
          ]}
        >
          <Card.Title
            title={`Challenge for ${stage.problem.kidName}!`}
            titleVariant="titleMedium"
            left={(props) => (
              <IconButton
                {...props}
                icon="help-circle"
                iconColor={theme.colors.primary}
              />
            )}
          />
          <Card.Content>
            <Text variant="bodyLarge" style={{ color: theme.colors.onPrimaryContainer }}>
              {replaceAliasesWithNames(stage.problem.text, kids)}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Solution Section */}
      {stage.solution && (
        <View style={styles.solutionSection}>
          <Button
            mode="outlined"
            icon={showSolution ? 'eye-off' : 'eye'}
            onPress={onToggleSolution}
            style={styles.solutionButton}
          >
            {showSolution ? 'Hide Solution' : 'Show Solution'}
          </Button>

          {showSolution && (
            <Card
              style={[
                styles.solutionCard,
                { backgroundColor: theme.colors.secondaryContainer },
              ]}
            >
              <Card.Title title="Solution" titleVariant="titleSmall" />
              <Card.Content>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSecondaryContainer }}
                >
                  {replaceAliasesWithNames(stage.solution, kids)}
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageIndicator: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  stageContent: {
    gap: 16,
  },
  narrative: {
    lineHeight: 28,
  },
  problemCard: {
    marginTop: 8,
  },
  solutionSection: {
    marginTop: 16,
    gap: 12,
  },
  solutionButton: {
    alignSelf: 'center',
  },
  solutionCard: {
    marginTop: 8,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navCenter: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
