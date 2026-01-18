import { useState, useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Button, Surface, useTheme, ActivityIndicator } from 'react-native-paper';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '../src/stores/authStore';

WebBrowser.maybeCompleteAuthSession();

// Configure with your Google OAuth credentials
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

export default function LoginScreen() {
  const theme = useTheme();
  const { signInWithGoogle, isLoading, error, clearError } = useAuthStore();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        handleGoogleSignIn(id_token);
      }
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken: string) => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle(idToken);
    } catch (err) {
      // Error is handled by the store
    } finally {
      setIsSigningIn(false);
    }
  };

  const handlePress = () => {
    clearError();
    promptAsync();
  };

  const showLoading = isLoading || isSigningIn;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.card} elevation={2}>
        <View style={styles.logoContainer}>
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.primary }]}>
            Clue Story
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Personalized bedtime stories with educational adventures
          </Text>
        </View>

        {error && (
          <Surface
            style={[styles.errorCard, { backgroundColor: theme.colors.errorContainer }]}
            elevation={0}
          >
            <Text style={{ color: theme.colors.onErrorContainer }}>{error}</Text>
          </Surface>
        )}

        <Button
          mode="contained"
          onPress={handlePress}
          disabled={!request || showLoading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          icon={showLoading ? undefined : 'google'}
        >
          {showLoading ? (
            <ActivityIndicator color={theme.colors.onPrimary} size="small" />
          ) : (
            'Sign in with Google'
          )}
        </Button>

        <Text variant="bodySmall" style={[styles.terms, { color: theme.colors.onSurfaceVariant }]}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </Text>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    padding: 32,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  errorCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  button: {
    width: '100%',
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  terms: {
    textAlign: 'center',
    marginTop: 8,
  },
});
