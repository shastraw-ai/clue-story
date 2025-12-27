import { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  useTheme,
  Portal,
  Modal,
  SegmentedButtons,
  IconButton,
  Divider,
  Surface,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useKidsStore } from '../../src/stores/kidsStore';
import { Kid, Gender } from '../../src/types';
import { GRADES, MAX_KIDS } from '../../src/constants/examples';

export default function SettingsScreen() {
  const theme = useTheme();
  const { hasApiKey, setApiKey, deleteApiKey } = useSettingsStore();
  const { kids, addKid, updateKid, deleteKid } = useKidsStore();

  // API Key state
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Kid modal state
  const [kidModalVisible, setKidModalVisible] = useState(false);
  const [editingKid, setEditingKid] = useState<Kid | null>(null);
  const [kidName, setKidName] = useState('');
  const [kidGrade, setKidGrade] = useState('K');
  const [kidGender, setKidGender] = useState<Gender>('boy');
  const [kidDifficulty, setKidDifficulty] = useState(3);

  // Grade picker modal
  const [gradeModalVisible, setGradeModalVisible] = useState(false);

  const handleSaveApiKey = async () => {
    if (apiKeyInput.trim()) {
      await setApiKey(apiKeyInput.trim());
      setApiKeyInput('');
    }
  };

  const handleDeleteApiKey = async () => {
    await deleteApiKey();
  };

  const openAddKidModal = () => {
    setEditingKid(null);
    setKidName('');
    setKidGrade('K');
    setKidGender('boy');
    setKidDifficulty(3);
    setKidModalVisible(true);
  };

  const openEditKidModal = (kid: Kid) => {
    setEditingKid(kid);
    setKidName(kid.name);
    setKidGrade(kid.grade);
    setKidGender(kid.gender);
    setKidDifficulty(kid.difficultyLevel);
    setKidModalVisible(true);
  };

  const handleSaveKid = async () => {
    if (!kidName.trim()) return;

    if (editingKid) {
      await updateKid(editingKid.id, {
        name: kidName.trim(),
        grade: kidGrade,
        gender: kidGender,
        difficultyLevel: kidDifficulty,
      });
    } else {
      await addKid(kidName.trim(), kidGrade, kidGender, kidDifficulty);
    }

    setKidModalVisible(false);
  };

  const handleDeleteKid = async (id: string) => {
    await deleteKid(id);
  };

  const getGradeLabel = (value: string) => {
    const grade = GRADES.find((g) => g.value === value);
    return grade?.label || value;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* API Key Section */}
      <Card style={styles.card}>
        <Card.Title title="OpenAI API Key" />
        <Card.Content>
          {hasApiKey ? (
            <View style={styles.apiKeyContainer}>
              <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
                API Key is configured
              </Text>
              <Button mode="outlined" onPress={handleDeleteApiKey} style={styles.button}>
                Remove Key
              </Button>
            </View>
          ) : (
            <View>
              <TextInput
                mode="outlined"
                label="Enter API Key"
                value={apiKeyInput}
                onChangeText={setApiKeyInput}
                secureTextEntry={!showApiKey}
                right={
                  <TextInput.Icon
                    icon={showApiKey ? 'eye-off' : 'eye'}
                    onPress={() => setShowApiKey(!showApiKey)}
                  />
                }
                style={styles.input}
              />
              <Button
                mode="contained"
                onPress={handleSaveApiKey}
                disabled={!apiKeyInput.trim()}
                style={styles.button}
              >
                Save API Key
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Kids Section */}
      <Card style={styles.card}>
        <Card.Title
          title="Kids"
          subtitle={`${kids.length}/${MAX_KIDS} kids added`}
          right={() =>
            kids.length < MAX_KIDS ? (
              <IconButton icon="plus" onPress={openAddKidModal} />
            ) : null
          }
        />
        <Card.Content>
          {kids.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              No kids added yet. Add a kid to start creating stories.
            </Text>
          ) : (
            kids.map((kid) => (
              <Surface key={kid.id} style={styles.kidCard} elevation={1}>
                <View style={styles.kidInfo}>
                  <Text variant="titleMedium">{kid.name}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {getGradeLabel(kid.grade)} | {kid.gender === 'boy' ? 'Boy' : 'Girl'} |
                    Difficulty: {kid.difficultyLevel}/5
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                    Story alias: {kid.alias}
                  </Text>
                </View>
                <View style={styles.kidActions}>
                  <IconButton icon="pencil" size={20} onPress={() => openEditKidModal(kid)} />
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleDeleteKid(kid.id)}
                  />
                </View>
              </Surface>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Add/Edit Kid Modal */}
      <Portal>
        <Modal
          visible={kidModalVisible}
          onDismiss={() => setKidModalVisible(false)}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {editingKid ? 'Edit Kid' : 'Add Kid'}
          </Text>

          <TextInput
            mode="outlined"
            label="Name"
            value={kidName}
            onChangeText={setKidName}
            style={styles.input}
          />

          <Text variant="labelLarge" style={styles.label}>
            Gender
          </Text>
          <SegmentedButtons
            value={kidGender}
            onValueChange={(value) => setKidGender(value as Gender)}
            buttons={[
              { value: 'boy', label: 'Boy' },
              { value: 'girl', label: 'Girl' },
            ]}
            style={styles.segmentedButtons}
          />

          <Text variant="labelLarge" style={styles.label}>
            Grade
          </Text>
          <Button
            mode="outlined"
            onPress={() => setGradeModalVisible(true)}
            style={styles.gradeButton}
          >
            {getGradeLabel(kidGrade)}
          </Button>

          <Text variant="labelLarge" style={styles.label}>
            Difficulty Level: {kidDifficulty}
          </Text>
          <View style={styles.sliderContainer}>
            <Text variant="bodySmall">1</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={kidDifficulty}
              onValueChange={setKidDifficulty}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.outlineVariant}
              thumbTintColor={theme.colors.primary}
            />
            <Text variant="bodySmall">5</Text>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.modalActions}>
            <Button onPress={() => setKidModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSaveKid} disabled={!kidName.trim()}>
              Save
            </Button>
          </View>
        </Modal>

        {/* Grade Picker Modal */}
        <Modal
          visible={gradeModalVisible}
          onDismiss={() => setGradeModalVisible(false)}
          contentContainerStyle={[
            styles.gradeModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Select Grade
          </Text>
          <ScrollView style={styles.gradeList}>
            {GRADES.map((grade) => (
              <Button
                key={grade.value}
                mode={kidGrade === grade.value ? 'contained' : 'text'}
                onPress={() => {
                  setKidGrade(grade.value);
                  setGradeModalVisible(false);
                }}
                style={styles.gradeItem}
              >
                {grade.label}
              </Button>
            ))}
          </ScrollView>
        </Modal>
      </Portal>
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
  card: {
    marginBottom: 16,
  },
  apiKeyContainer: {
    gap: 12,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
  },
  kidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  kidInfo: {
    flex: 1,
    gap: 4,
  },
  kidActions: {
    flexDirection: 'row',
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: {
    marginBottom: 16,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  gradeButton: {
    marginBottom: 8,
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
  divider: {
    marginVertical: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  gradeModal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  gradeList: {
    maxHeight: 400,
  },
  gradeItem: {
    marginBottom: 4,
  },
});
