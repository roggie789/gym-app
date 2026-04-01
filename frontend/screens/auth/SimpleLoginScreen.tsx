import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { Colors } from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import TexturedBackground from '../../components/TexturedBackground';

interface SimpleLoginScreenProps {
  onSwitchToSignup: () => void;
}

const REMEMBER_ME_KEY = '@gym_app_remember_me';

// Feature icons as emoji (can be replaced with icon library later)
const ShieldIcon = () => <Text style={styles.iconText}>🛡️</Text>;
const FlameIcon = () => <Text style={styles.iconText}>🔥</Text>;
const SwordsIcon = () => <Text style={styles.iconText}>⚔️</Text>;

function BrandMark() {
  return (
    <View style={styles.brandMarkContainer}>
      <View style={styles.brandMark}>
        <View style={styles.brandIcon}>
          <Text style={styles.brandIconText}>🔥</Text>
        </View>
        <View>
          <Text style={styles.brandTitle}>UpLift</Text>
          <Text style={styles.brandSubtitle}>Train like it's a quest.</Text>
        </View>
      </View>
    </View>
  );
}

function FeatureCard({ icon: Icon, title, body }: { icon: React.ComponentType; title: string; body: string }) {
  return (
    <Card style={styles.featureCard}>
      <View style={styles.featureCardContent}>
        <View style={styles.featureIconContainer}>
          <Icon />
        </View>
        <View style={styles.featureTextContainer}>
          <Text style={styles.featureTitle}>{title}</Text>
          <Text style={styles.featureBody}>{body}</Text>
        </View>
      </View>
    </Card>
  );
}

export default function SimpleLoginScreen({ onSwitchToSignup }: SimpleLoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithOAuth } = useAuth();
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

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert({ title: 'Error', message: 'Please fill in all fields' });
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      showAlert({ title: 'Login Failed', message: error.message || 'Invalid credentials' });
    } else {
      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_ME_KEY, 'true');
      } else {
        await AsyncStorage.removeItem(REMEMBER_ME_KEY);
      }
    }
  };

  const features = [
    {
      icon: ShieldIcon,
      title: 'Level & XP',
      body: 'Every set earns XP. Every month is a new run.',
    },
    {
      icon: FlameIcon,
      title: 'Streaks',
      body: 'Keep your flame alive with weekly consistency.',
    },
    {
      icon: SwordsIcon,
      title: 'Lift Off',
      body: 'Wager gold, challenge friends, claim glory.',
    },
  ];

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
          <BrandMark />

          <Card style={styles.loginCard}>
            <CardContent style={styles.cardContentInner}>
              <CardHeader style={styles.cardHeaderInner}>
                <CardTitle style={styles.cardTitleText}>Log in</CardTitle>
                <CardDescription>Welcome back. Your next level is waiting.</CardDescription>
              </CardHeader>

              <View style={styles.form}>
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
                    style={styles.input}
                  />
                </View>

                <Button
                  testID="button-login"
                  onPress={handleLogin}
                  disabled={loading}
                  style={styles.primaryButton}
                >
                  {loading ? 'Logging in...' : 'Enter the Gym'}
                </Button>

                <View style={styles.socialButtons}>
                  <Button
                    testID="button-google-login"
                    variant="secondary"
                    onPress={() => signInWithOAuth('google')}
                    style={styles.socialButton}
                  >
                    Continue with Google
                  </Button>
                  <Button
                    testID="button-apple-login"
                    variant="secondary"
                    onPress={() => signInWithOAuth('apple')}
                    style={styles.socialButton}
                  >
                    Continue with Apple
                  </Button>
                </View>

                <Button
                  testID="button-to-signup"
                  variant="ghost"
                  onPress={onSwitchToSignup}
                  style={styles.linkButton}
                >
                  New here? Create an account
                </Button>
              </View>
            </CardContent>
          </Card>

          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                body={feature.body}
              />
            ))}
          </View>
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
    justifyContent: 'center',
    alignItems: 'center',
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
  loginCard: {
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
  primaryButton: {
    height: 44,
    marginTop: 4,
  },
  socialButtons: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 4,
  },
  socialButton: {
    height: 44,
  },
  linkButton: {
    height: 44,
    marginTop: 4,
  },
  featuresContainer: {
    gap: 12,
  },
  featureCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  featureTextContainer: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  featureBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
