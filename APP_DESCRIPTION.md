# Gym App - Gamified Fitness Tracker

## Overview

A gamified fitness tracking app that transforms your gym workouts into an engaging, game-like experience. Inspired by popular mobile games like Clash Royale, this app uses vibrant colors, card-based layouts, and achievement systems to make fitness fun and motivating.

## What It Does

### Core Features

**🎮 Gamified Workout Tracking**
- Track your gym sessions with a game-like XP system
- Earn experience points (XP) based on your exercises, weight lifted, and personal records
- Level up from 1 to 100 by accumulating XP
- Visual progress bars and level badges to track your advancement

**💪 Exercise & PR Tracking**
- Log exercises with weight, reps, and sets
- Automatic Personal Record (PR) detection when you beat previous bests
- PR achievements earn bonus XP (100x multiplier vs. normal 10x)
- Track your first-time exercise logs as baseline records

**🔥 Streak System**
- Build daily workout streaks
- Streak multipliers boost your XP earnings (up to 2.0x)
- Track your current streak and longest streak achievements
- Maintain consistency to maximize rewards

**📊 Monthly XP Challenges**
- Compete against yourself each month
- Monthly XP resets at the start of each month
- View your historical monthly XP performance
- Sort monthly history by highest to lowest XP

**📋 Workout Templates**
- Create custom workout session templates
- Save your favorite exercise combinations
- Quick-start sessions from templates or build custom workouts
- Organize exercises by category (Chest, Back, Legs, Shoulders, Arms, Core)

**🏆 Achievement System**
- Track total PRs achieved
- Monitor total workouts completed
- View your best streak records
- Level progression with visual feedback

**👤 User Profiles**
- Set your bodyweight for accurate XP calculations
- Social authentication (Google, Apple) or email/password
- Secure account management

** Challenge you friends**
- leaderboard section where users can join groups with their friends and see a leaderboard with who has the most points.
- also be able to challenge friends to a lift off where the challenger decides the lift and whoever lifts most wins points from the other player like a wager.

## Goals & Purpose

### Primary Goals

1. **Make Fitness Fun**
   - Transform the often-monotonous task of tracking workouts into an engaging game
   - Use vibrant colors, bold typography, and card-based layouts inspired by popular mobile games
   - Create a sense of achievement and progression similar to gaming experiences

2. **Increase Motivation**
   - Gamification elements (levels, XP, streaks) provide clear goals and rewards
   - Visual progress indicators show how close you are to leveling up
   - Monthly challenges create short-term goals while leveling provides long-term progression

3. **Encourage Consistency**
   - Streak system rewards daily gym attendance
   - Streak multipliers incentivize maintaining your routine
   - Visual feedback makes it easy to see your consistency patterns

4. **Accurate Progress Tracking**
   - XP formula: `(weight / bodyweight) × 10 × reps × sets` ensures fair comparison across different body weights
   - PR detection automatically recognizes when you've improved
   - Historical data lets you see your progress over time

5. **Build Healthy Habits**
   - Make gym attendance feel rewarding and fun
   - Turn exercise into a game you want to "play" daily
   - Create positive reinforcement loops through XP and leveling

### Target Audience

- **Fitness Enthusiasts** who want to gamify their workout routine
- **Gamers** who enjoy achievement systems and want to apply that motivation to fitness
- **People Starting Their Fitness Journey** who need extra motivation and clear goals
- **Experienced Lifters** who want to track PRs and see their progress in a fun way
- **Anyone** looking to make their gym routine more engaging and rewarding

## How It Works

### XP Calculation System

**Normal Exercise XP:**
```
XP = (Weight Lifted / Bodyweight) × 10 × Reps × Sets
```

**PR Exercise XP (when you beat a personal record):**
```
XP = (Weight Lifted / Bodyweight) × 100
```

**Session XP:**
```
Session XP = Total Exercise XP × Streak Multiplier
```

**Leveling System:**
- XP required for level N = `100 × N^1.5` (rounded)
- Level 1: 100 XP
- Level 2: 283 XP
- Level 3: 520 XP
- ...continues up to Level 100

### Monthly XP Reset

- At the start of each new month, your monthly XP resets to 0
- Your level XP (used for leveling) persists and rolls over
- Previous month's total XP is saved in your history
- This creates fresh monthly challenges while maintaining long-term progression

### PR Detection

- First time logging an exercise: Creates a baseline record (not counted as PR)
- Subsequent logs: Compares weight and reps to your current PR
- PR achieved when: New weight > old weight, OR (same weight AND new reps > old reps)
- PRs earn 10x more XP than normal exercises

## Design Philosophy

The app uses a **Clash Royale-inspired** design aesthetic:

- **Vibrant Colors**: Purple (#8B5CF6), Gold (#FFD700), and other game-like colors
- **Card-Based Layouts**: Information presented in visually appealing cards
- **Bold Typography**: Chunky, game-style fonts with text shadows
- **Visual Feedback**: Progress bars, badges, and icons to show achievements
- **Dark Theme**: Easy on the eyes with colorful accents

## Future Features (Planned)

- **Avatar Customization**: Unlock gear and customize your avatar based on level and PRs
- **Groups & Leaderboards**: Compete with friends in groups
- **Social Features**: Share achievements and compete on leaderboards
- **More Gamification**: Badges, achievements, and unlockable content

## Technical Stack

- **Frontend**: React Native (Expo) with TypeScript
- **Backend**: Supabase (PostgreSQL database, Authentication, Real-time subscriptions)
- **Design**: Custom gamified UI inspired by mobile games
- **Platform**: iOS and Android compatible

---

**The ultimate goal**: Make going to the gym as addictive and rewarding as your favorite mobile game, while helping you build real fitness habits and track genuine progress.

