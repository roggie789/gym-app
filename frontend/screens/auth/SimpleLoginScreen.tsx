import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SimpleLoginScreenProps {
  onSwitchToSignup: () => void;
}

const REMEMBER_ME_KEY = '@gym_app_remember_me';

export default function SimpleLoginScreen({ onSwitchToSignup }: SimpleLoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithOAuth } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } else {
      // Save remember me preference
      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_ME_KEY, 'true');
      } else {
        await AsyncStorage.removeItem(REMEMBER_ME_KEY);
      }
    }
    // If successful, the AuthContext will update and AppNavigator will show Dashboard
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>START GAME</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={styles.rememberMeContainer}
        onPress={() => setRememberMe(!rememberMe)}
        activeOpacity={0.8}
      >
        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
          {rememberMe && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.rememberMeText}>Remember Me</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity 
        style={styles.socialButton}
        onPress={() => signInWithOAuth('google')}
      >
        <Text style={styles.socialButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.socialButton}
        onPress={() => signInWithOAuth('apple')}
      >
        <Text style={styles.socialButtonText}>Continue with Apple</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={onSwitchToSignup}>
        <Text style={styles.linkText}>
          Don't have an account? <Text style={styles.linkTextBold}>Sign up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 48,
    color: Colors.accent1,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 3,
    borderColor: Colors.accent1,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  linkTextBold: {
    fontWeight: '900',
    color: Colors.accent1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  socialButton: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.secondary,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  socialButtonText: {
    color: Colors.secondary,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.secondary,
    backgroundColor: Colors.backgroundCard,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent1,
  },
  checkmark: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  rememberMeText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

