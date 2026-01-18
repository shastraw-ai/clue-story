import { useState } from 'react';
import { View, ScrollView, StyleSheet, Platform, Alert } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  useTheme,
  Portal,
  Modal,
  IconButton,
  Divider,
  Surface,
  Switch,
  TouchableRipple,
  Avatar,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSettingsStore, LLM_MODELS } from '../../src/stores/settingsStore';
import { useKidsStore } from '../../src/stores/kidsStore';
import { useAuthStore } from '../../src/stores/authStore';
import { Kid } from '../../src/types';
import { GRADES, MAX_KIDS } from '../../src/constants/examples';
import { COUNTRIES, getCountryByCode } from '../../src/constants/countries';
import {
  scheduleDailyReminder,
  cancelDailyReminder,
  requestNotificationPermissions,
} from '../../src/services/notifications';

export default function SettingsScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuthStore();
  const {
    notificationSettings,
    setNotificationEnabled,
    setNotificationTime,
    country,
    setCountry,
    model,
    setModel,
  } = useSettingsStore();
  const { kids, addKid, updateKid, deleteKid } = useKidsStore();

  // Kid modal state
  const [kidModalVisible, setKidModalVisible] = useState(false);
  const [editingKid, setEditingKid] = useState<Kid | null>(null);
  const [kidName, setKidName] = useState('');
  const [kidGrade, setKidGrade] = useState('K');
  const [kidDifficulty, setKidDifficulty] = useState(3);
  const [isSavingKid, setIsSavingKid] = useState(false);

  // Grade picker modal
  const [gradeModalVisible, setGradeModalVisible] = useState(false);

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Country picker modal
  const [countryModalVisible, setCountryModalVisible] = useState(false);

  // Model picker modal
  const [modelModalVisible, setModelModalVisible] = useState(false);

  const openAddKidModal = () => {
    setEditingKid(null);
    setKidName('');
    setKidGrade('K');
    setKidDifficulty(3);
    setKidModalVisible(true);
  };

  const openEditKidModal = (kid: Kid) => {
    setEditingKid(kid);
    setKidName(kid.name);
    setKidGrade(kid.grade);
    setKidDifficulty(kid.difficultyLevel);
    setKidModalVisible(true);
  };

  const handleSaveKid = async () => {
    if (!kidName.trim()) return;

    setIsSavingKid(true);
    try {
      if (editingKid) {
        await updateKid(editingKid.id, {
          name: kidName.trim(),
          grade: kidGrade,
          difficultyLevel: kidDifficulty,
        });
      } else {
        await addKid(kidName.trim(), kidGrade, kidDifficulty);
      }
      setKidModalVisible(false);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save kid');
    } finally {
      setIsSavingKid(false);
    }
  };

  const handleDeleteKid = async (id: string) => {
    try {
      await deleteKid(id);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete kid');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const getGradeLabel = (value: string) => {
    const grade = GRADES.find((g) => g.value === value);
    return grade?.label || value;
  };

  // Notification handlers
  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive daily reminders.'
        );
        return;
      }
      await scheduleDailyReminder(notificationSettings.time);
    } else {
      await cancelDailyReminder();
    }
    await setNotificationEnabled(value);
  };

  const handleTimeChange = async (event: unknown, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newTime = {
        hour: selectedDate.getHours(),
        minute: selectedDate.getMinutes(),
      };
      await setNotificationTime(newTime);
      if (notificationSettings.enabled) {
        await scheduleDailyReminder(newTime);
      }
    }
  };

  const formatTime = (hour: number, minute: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

  // Country helpers
  const getCountryDisplayName = (): string => {
    if (!country) return 'Not set';
    const found = getCountryByCode(country);
    return found?.name || country;
  };

  // Model helpers
  const getModelDisplayName = (): string => {
    const found = LLM_MODELS.find((m) => m.value === model);
    return found?.label || model;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Account Section */}
      <Card style={styles.card}>
        <Card.Title title="Account" />
        <Card.Content>
          <View style={styles.accountRow}>
            {user?.pictureUrl ? (
              <Avatar.Image size={48} source={{ uri: user.pictureUrl }} />
            ) : (
              <Avatar.Icon size={48} icon="account" />
            )}
            <View style={styles.accountInfo}>
              <Text variant="titleMedium">{user?.name || 'User'}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {user?.email}
              </Text>
            </View>
          </View>
          <Button
            mode="outlined"
            onPress={handleSignOut}
            style={styles.signOutButton}
            icon="logout"
          >
            Sign Out
          </Button>
        </Card.Content>
      </Card>

      {/* LLM Model Section */}
      <Card style={styles.card}>
        <Card.Title title="LLM Model" />
        <Card.Content>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
          >
            Select the OpenAI model for story generation
          </Text>
          <Button
            mode="outlined"
            onPress={() => setModelModalVisible(true)}
            style={styles.countryButton}
          >
            {getModelDisplayName()}
          </Button>
        </Card.Content>
      </Card>

      {/* Daily Reminder Section */}
      <Card style={styles.card}>
        <Card.Title title="Daily Reminder" />
        <Card.Content>
          <View style={styles.notificationRow}>
            <View style={styles.notificationInfo}>
              <Text variant="bodyMedium">Enable daily notification</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Get reminded to create bedtime stories
              </Text>
            </View>
            <Switch
              value={notificationSettings.enabled}
              onValueChange={handleNotificationToggle}
            />
          </View>

          {notificationSettings.enabled && (
            <TouchableRipple
              onPress={() => setShowTimePicker(true)}
              style={styles.timePickerButton}
            >
              <View style={styles.timeRow}>
                <Text variant="bodyMedium">Reminder time</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
                  {formatTime(notificationSettings.time.hour, notificationSettings.time.minute)}
                </Text>
              </View>
            </TouchableRipple>
          )}
        </Card.Content>
      </Card>

      {showTimePicker && (
        <DateTimePicker
          value={
            new Date(
              2000,
              0,
              1,
              notificationSettings.time.hour,
              notificationSettings.time.minute
            )
          }
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* Region Section */}
      <Card style={styles.card}>
        <Card.Title title="Region" />
        <Card.Content>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
          >
            Helps the AI understand your grade level system
          </Text>
          <Button
            mode="outlined"
            onPress={() => setCountryModalVisible(true)}
            style={styles.countryButton}
          >
            {getCountryDisplayName()}
          </Button>
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
                    {getGradeLabel(kid.grade)} | Difficulty: {kid.difficultyLevel}/5
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
            <Button
              mode="contained"
              onPress={handleSaveKid}
              disabled={!kidName.trim() || isSavingKid}
              loading={isSavingKid}
            >
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

        {/* Country Picker Modal */}
        <Modal
          visible={countryModalVisible}
          onDismiss={() => setCountryModalVisible(false)}
          contentContainerStyle={[
            styles.gradeModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Select Country/Region
          </Text>
          <ScrollView style={styles.gradeList}>
            {COUNTRIES.map((c) => (
              <Button
                key={c.code}
                mode={country === c.code ? 'contained' : 'text'}
                onPress={async () => {
                  await setCountry(c.code);
                  setCountryModalVisible(false);
                }}
                style={styles.gradeItem}
              >
                {c.name}
              </Button>
            ))}
          </ScrollView>
        </Modal>

        {/* Model Picker Modal */}
        <Modal
          visible={modelModalVisible}
          onDismiss={() => setModelModalVisible(false)}
          contentContainerStyle={[
            styles.gradeModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Select LLM Model
          </Text>
          <ScrollView style={styles.gradeList}>
            {LLM_MODELS.map((m) => (
              <Button
                key={m.value}
                mode={model === m.value ? 'contained' : 'text'}
                onPress={async () => {
                  await setModel(m.value);
                  setModelModalVisible(false);
                }}
                style={styles.gradeItem}
              >
                {m.label}
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
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  accountInfo: {
    flex: 1,
  },
  signOutButton: {
    marginTop: 8,
  },
  input: {
    marginBottom: 12,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationInfo: {
    flex: 1,
    marginRight: 16,
  },
  timePickerButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countryButton: {
    marginTop: 4,
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
