import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { Colors } from '../../constants/colors';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import TexturedBackground from '../../components/TexturedBackground';

interface SimpleSignupScreenProps {
  onSwitchToLogin: () => void;
}

function BrandMark() {
  return (
    <View style={styles.brandMarkContainer}>
      <View style={styles.brandMark}>
        <View style={styles.brandIcon}>
          <Text style={styles.brandIconText}>🔥</Text>
        </View>
        <View>
          <Text style={styles.brandTitle}>UpLift</Text>
          <Text style={styles.brandSubtitle}>Start your first quest.</Text>
        </View>
      </View>
    </View>
  );
}

export default function SimpleSignupScreen({ onSwitchToLogin }: SimpleSignupScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithOAuth } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSignup = async () => {
    if (!email || !password || !username) {
      showAlert({ title: 'Error', message: 'Please fill in all fields' });
      return;
    }

    if (!termsAccepted) {
      showAlert({ title: 'Error', message: 'Please accept the Terms and Privacy Policy' });
      return;
    }

    if (password.length < 6) {
      showAlert({ title: 'Error', message: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, username);
    setLoading(false);

    if (error) {
      showAlert({ title: 'Signup Failed', message: error.message || 'Could not create account' });
    } else {
      showAlert({ title: 'Success', message: 'Account created! You can now login.' });
      onSwitchToLogin();
    }
  };

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  };

  return (
    <TexturedBackground>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.container, animatedStyle]}>
          {/* Header with back button, title, and spacing */}
          <View style={styles.header}>
            <Button
              testID="button-back-login"
              variant="ghost"
              onPress={onSwitchToLogin}
              style={styles.backButtonHeader}
            >
              <Text style={styles.backButtonIcon}>←</Text>
              <Text style={styles.backButtonText}>Back</Text>
            </Button>
            <Text style={styles.headerTitle}>CREATE ACCOUNT</Text>
            <View style={styles.headerSpacer} />
          </View>

          <BrandMark />

          <Card style={styles.signupCard}>
            <CardContent style={styles.cardContentInner}>
              <CardHeader style={styles.cardHeaderInner}>
                <CardTitle style={styles.cardTitleText}>Sign up</CardTitle>
                <CardDescription>Create your profile and earn your first XP.</CardDescription>
              </CardHeader>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username</Text>
                  <Input
                    testID="input-username"
                    value={username}
                    onChangeText={setUsername}
                    placeholder="roggie"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <Input
                    testID="input-email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@domain.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <Input
                    testID="input-password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>

                <View style={styles.termsContainer}>
                  <Checkbox
                    testID="checkbox-terms"
                    checked={termsAccepted}
                    onCheckedChange={setTermsAccepted}
                    style={styles.checkbox}
                  />
                  <Text style={styles.termsText}>
                    I agree to the Terms and acknowledge the Privacy Policy.
                  </Text>
                </View>

                <Button
                  testID="button-create-account"
                  onPress={handleSignup}
                  disabled={loading}
                  style={styles.primaryButton}
                >
                  {loading ? 'Creating account...' : 'Create account'}
                </Button>

                <View style={styles.socialButtons}>
                  <Button
                    testID="button-google-signup"
                    variant="secondary"
                    onPress={() => signInWithOAuth('google')}
                    style={styles.socialButton}
                  >
                    Sign up with Google
                  </Button>
                  <Button
                    testID="button-apple-signup"
                    variant="secondary"
                    onPress={() => signInWithOAuth('apple')}
                    style={styles.socialButton}
                  >
                    Sign up with Apple
                  </Button>
                </View>

                <Button
                  testID="button-to-login"
                  variant="ghost"
                  onPress={onSwitchToLogin}
                  style={styles.linkButton}
                >
                  Already have an account? Log in
                </Button>
              </View>
            </CardContent>
          </Card>
        </Animated.View>
      </ScrollView>
    </TexturedBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  container: {
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButtonHeader: {
    height: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonIcon: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 64,
  },
  brandMarkContainer: {
    position: 'relative',
  },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
  },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  brandIconText: {
    fontSize: 24,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  signupCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCardTransparent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardContentInner: {
    padding: 20,
  },
  cardHeaderInner: {
    padding: 0,
    paddingTop: 6,
    marginBottom: 16,
  },
  cardTitleText: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  form: {
    gap: 12,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  input: {
    height: 44,
    backgroundColor: Colors.backgroundSecondary,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
    padding: 12,
    marginTop: 4,
  },
  checkbox: {
    marginTop: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  primaryButton: {
    height: 44,
    marginTop: 4,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  socialButton: {
    flex: 1,
    height: 44,
  },
  linkButton: {
    height: 44,
    marginTop: 4,
  },
});
