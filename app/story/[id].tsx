import { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ScrollView as ScrollViewType } from 'react-native';
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
import { Story, StoryStage, Kid, ProblemContent } from '../../src/types';

export default function StoryReaderScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getStoryById } = useStoriesStore();
  const scrollViewRef = useRef<ScrollViewType>(null);

  const [story, setStory] = useState<Story | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

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

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const goToPrevious = () => {
    if (!isFirstStage) {
      setCurrentStageIndex((prev) => prev - 1);
      scrollToTop();
    }
  };

  const goToNext = () => {
    if (!isLastStage) {
      setCurrentStageIndex((prev) => prev + 1);
      scrollToTop();
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
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <StageView
            key={currentStageIndex}
            stage={currentStage}
            kids={story.kids}
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
  theme: MD3Theme;
}

function StageView({ stage, kids, theme }: StageViewProps) {
  const [selectedKidIndex, setSelectedKidIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  // Replace aliases with real names in narrative
  const displayContent = replaceAliasesWithNames(stage.content, kids);

  // Get problems in the order of kids
  const getProblemsInOrder = (): (ProblemContent | null)[] => {
    return kids.map((kid) => {
      const problem = stage.problems.find(
        (p) => p.kidAlias.toLowerCase() === kid.alias.toLowerCase()
      );
      return problem || null;
    });
  };

  const problemsInOrder = getProblemsInOrder();
  const selectedProblem = problemsInOrder[selectedKidIndex];
  const selectedKid = kids[selectedKidIndex];

  const handleKidSelect = (index: number) => {
    setSelectedKidIndex(index);
    setShowSolution(false); // Hide solution when switching kids
  };

  return (
    <View style={styles.stageContent}>
      {/* Main Narrative */}
      {displayContent && (
        <Text variant="bodyLarge" style={styles.narrative}>
          {displayContent}
        </Text>
      )}

      {/* Kid Tabs */}
      {stage.problems.length > 0 && (
        <View style={styles.tabsContainer}>
          <Text variant="titleMedium" style={styles.challengeTitle}>
            Challenges
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabsContent}
          >
            {kids.map((kid, index) => {
              const hasProblem = problemsInOrder[index] !== null;
              const isSelected = index === selectedKidIndex;

              return (
                <Pressable
                  key={kid.id}
                  onPress={() => handleKidSelect(index)}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.primaryContainer
                        : theme.colors.surfaceVariant,
                      borderColor: isSelected
                        ? theme.colors.primary
                        : 'transparent',
                      opacity: hasProblem ? 1 : 0.5,
                    },
                  ]}
                >
                  <Text
                    variant="labelLarge"
                    style={{
                      color: isSelected
                        ? theme.colors.onPrimaryContainer
                        : theme.colors.onSurfaceVariant,
                    }}
                  >
                    {kid.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Selected Kid's Problem */}
      {selectedProblem && selectedKid && (
        <View style={styles.problemSection}>
          <Card
            style={[
              styles.problemCard,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <Card.Title
              title={`${selectedKid.name}'s Challenge`}
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
              <Text
                variant="bodyLarge"
                style={{ color: theme.colors.onPrimaryContainer }}
              >
                {replaceAliasesWithNames(selectedProblem.text, kids)}
              </Text>
            </Card.Content>
          </Card>

          {/* Solution Toggle */}
          <View style={styles.solutionSection}>
            <Button
              mode="outlined"
              icon={showSolution ? 'eye-off' : 'eye'}
              onPress={() => setShowSolution(!showSolution)}
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
                    {replaceAliasesWithNames(selectedProblem.solution, kids)}
                  </Text>
                </Card.Content>
              </Card>
            )}
          </View>
        </View>
      )}

      {/* No problems message */}
      {stage.problems.length === 0 && (
        <Surface style={styles.noProblemsCard} elevation={1}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            No challenges in this stage.
          </Text>
        </Surface>
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
  challengeTitle: {
    marginBottom: 8,
  },
  tabsContainer: {
    marginTop: 8,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabsContent: {
    gap: 8,
    paddingVertical: 4,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  problemSection: {
    gap: 12,
  },
  problemCard: {
    marginTop: 4,
  },
  solutionSection: {
    gap: 12,
  },
  solutionButton: {
    alignSelf: 'center',
  },
  solutionCard: {
    marginTop: 4,
  },
  noProblemsCard: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
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
