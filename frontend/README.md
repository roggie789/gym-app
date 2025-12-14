# Gym App - React Native Frontend

A React Native app built with Expo, TypeScript, and Supabase for tracking gym workouts, PRs, and competing with friends.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Supabase:**
   - Copy `.env.example` to `.env`
   - Get your Supabase URL and anon key from your Supabase project settings (API section)
   - Update `config/supabase.ts` with your credentials

3. **Run the app:**
   ```bash
   npm start
   ```

## Project Structure

```
frontend/
├── config/
│   └── supabase.ts          # Supabase client configuration
├── contexts/
│   └── AuthContext.tsx      # Authentication context and provider
├── navigation/
│   └── AppNavigator.tsx     # Main navigation setup
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── SignupScreen.tsx
│   └── main/
│       ├── DashboardScreen.tsx
│       ├── WorkoutsScreen.tsx
│       ├── LeaderboardScreen.tsx
│       └── ProfileScreen.tsx
├── App.tsx                  # Root component
└── index.tsx                # Entry point
```

## Features

- ✅ User authentication (Login/Signup)
- ✅ Supabase integration
- ✅ Navigation with bottom tabs
- ✅ TypeScript support
- 🚧 Dashboard (to be implemented)
- 🚧 Workout tracking (to be implemented)
- 🚧 PR tracking (to be implemented)
- 🚧 Leaderboards (to be implemented)
- 🚧 Avatar customization (to be implemented)

## Next Steps

1. Update `config/supabase.ts` with your Supabase credentials
2. Test authentication flow
3. Implement dashboard with user stats
4. Add workout logging functionality
5. Implement PR tracking
6. Add leaderboard functionality
7. Create avatar customization screen

