import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  useTheme,
  IconButton,
  Surface,
  Button,
  Chip,
} from 'react-native-paper';
import { router } from 'expo-router';
import { useStoriesStore } from '../../src/stores/storiesStore';
import { Story } from '../../src/types';

export default function HistoryScreen() {
  const theme = useTheme();
  const { stories, deleteStory, isLoading } = useStoriesStore();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleOpenStory = (story: Story) => {
    router.push(`/story/${story.id}`);
  };

  const handleDeleteStory = async (id: string) => {
    await deleteStory(id);
  };

  if (stories.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Surface style={styles.emptyCard} elevation={2}>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            No Stories Yet
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
          >
            Create your first bedtime story with puzzles for your kids!
          </Text>
          <Button
            mode="contained"
            onPress={() => router.push('/(tabs)/')}
            style={styles.emptyButton}
          >
            Create Story
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
      {stories.map((story) => (
        <Card
          key={story.id}
          style={styles.storyCard}
          onPress={() => handleOpenStory(story)}
        >
          <Card.Title
            title={story.title}
            subtitle={formatDate(story.createdAt)}
            right={(props) => (
              <IconButton
                {...props}
                icon="delete"
                onPress={() => handleDeleteStory(story.id)}
              />
            )}
          />
          <Card.Content>
            <View style={styles.chips}>
              <Chip
                icon={story.subject === 'math' ? 'calculator' : 'book-open-variant'}
                style={styles.chip}
                compact
              >
                {story.subject === 'math' ? 'Math' : 'Reading'}
              </Chip>
              <Chip icon="account-group" style={styles.chip} compact>
                {story.kids.length} {story.kids.length === 1 ? 'kid' : 'kids'}
              </Chip>
              <Chip icon="puzzle" style={styles.chip} compact>
                {story.stages.length} {story.stages.length === 1 ? 'stage' : 'stages'}
              </Chip>
            </View>
            <Text
              variant="bodySmall"
              style={[styles.kidsText, { color: theme.colors.onSurfaceVariant }]}
            >
              {story.kids.map((k) => k.name).join(', ')}
            </Text>
          </Card.Content>
        </Card>
      ))}
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
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: 320,
  },
  emptyTitle: {
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyButton: {
    marginTop: 16,
  },
  storyCard: {
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    marginRight: 4,
  },
  kidsText: {
    marginTop: 4,
  },
});
