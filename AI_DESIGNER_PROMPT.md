# Design Prompt for Gamified Fitness Tracking App

## App Overview
Design a mobile fitness tracking app that gamifies gym workouts with an XP system, levels, streaks, achievements, and social competition features. The app transforms traditional workout logging into an engaging game-like experience with progress tracking, leaderboards, and friend challenges.

## Design Style Requirements
- Game-inspired aesthetic (mobile game feel, not traditional fitness app)
- Card-based layouts for information display
- Bold, chunky typography with visual hierarchy
- Dark theme with vibrant accent colors
- Progress bars, badges, and achievement indicators
- Visual feedback for actions and achievements
- Clean, modern mobile-first design

## Authentication Screens

### Login Screen
- Email/password input fields
- Social login buttons (Google, Apple)
- Link to signup screen
- App branding/logo area

### Signup Screen
- Username input
- Email/password input fields
- Social signup buttons (Google, Apple)
- Link to login screen
- Terms/agreement checkbox

## Main Application Screens

### Home Screen
**Primary dashboard showing user progress and quick actions**
- Top status bar: Level number (1-100), current XP / XP needed for next level, progress bar
- Currency display: Gold amount with icon
- User profile section: Username, profile icon, navigation to profile
- Monthly XP card: Current month's total XP with trophy/achievement styling
- Workout calendar: Visual calendar showing workout days
- Active challenges section: List of current "Lift Off" challenges (friend wager challenges)
- Quick stats grid: Total PRs, total workouts, current streak, longest streak
- Primary action button: "Start Workout" prominently displayed
- Navigation to: Friends, Profile, Leaderboard, Templates, Habits

### Session Selection Screen
**Choose workout type before starting**
- Two main option cards:
  - "Use Template" card: Select from saved workout templates
  - "Custom Workout" card: Build workout from scratch
- Back button to return to home
- Template selection shows list of saved templates if choosing template option

### Exercise Selection Screen
**Browse and select exercises for workout**
- Search bar to filter exercises
- Category filter chips: Chest, Back, Legs, Shoulders, Arms, Core
- Scrollable list of exercise cards showing:
  - Exercise name
  - Exercise category
  - Selection indicator (checkmark when selected)
- Selected exercises counter/badge
- "Start Workout" button (enabled when at least one exercise selected)
- Back button to return to session selection

### Workout Screen
**Active workout logging interface**
- List of selected exercises, each as a card showing:
  - Exercise name and category
  - "Sets" section header
  - For each set: Weight input field, Reps input field
  - "+ Add Set" button to add more sets
  - Remove set option
- Exercise cards are scrollable
- "Complete Workout" button at bottom (prominent, game-styled)
- Back button to return to exercise selection
- Visual feedback when PR is achieved during logging

### Session Templates Screen
**Create and manage workout templates**
- List of existing templates showing:
  - Template name
  - Number of exercises in template
  - Edit/delete options
- "Create New Template" button
- Template creation/editing modal:
  - Template name input
  - Exercise selection interface (similar to exercise selection screen)
  - Save/Cancel buttons

### Monthly XP History Screen
**View historical monthly XP performance**
- List of past months showing:
  - Month name and year
  - Total XP earned that month
  - Visual indicator (bar chart or similar)
- Sortable by highest to lowest XP
- Current month highlighted or shown at top

### Profile Screen
**User settings and personal stats**
- User information section:
  - Username display
  - Bodyweight input field (for XP calculations)
  - Profile picture/avatar area
- Statistics section:
  - Current level
  - Total XP
  - Total PRs achieved
  - Total workouts completed
  - Current streak
  - Longest streak
  - Total gold earned
- Navigation to challenge history
- Logout button
- Back/close button to return to home

### Challenge History Screen
**View past Lift Off challenges**
- List of completed challenges showing:
  - Challenge name (exercise type)
  - Opponent username
  - Result (won/lost)
  - Date
  - Gold wagered/earned
- Tap to view challenge details
- Back button to return to profile

### Friends Screen
**Manage friends and social connections**
- Three tabs: Friends, Search, Requests
- **Friends Tab:**
  - List of current friends showing:
    - Username
    - Profile icon
    - Level
    - "Challenge" button to create Lift Off challenge
    - "View Profile" option
    - Remove friend option
- **Search Tab:**
  - Search input field
  - Search results showing:
    - Username
    - Level
    - "Add Friend" button
- **Requests Tab:**
  - Pending friend requests showing:
    - Usender username
    - Accept/Decline buttons
- Close button to return to home

### Groups Screen
**Create and manage workout groups**
- List of user's groups showing:
  - Group name
  - Group description
  - Member count
  - User's role (admin/member)
  - "View Leaderboard" button
  - Leave group option
- "Create Group" button
- Group invitations section:
  - List of pending invitations
  - Accept/Decline buttons
- Create group modal:
  - Group name input
  - Group description input
  - Create/Cancel buttons
- Invite members modal:
  - Search users input
  - Search results list
  - Invite button for each user

### Leaderboard Screen
**View available leaderboards**
- List of groups user belongs to
- "Global Leaderboard" option
- Each group card shows:
  - Group name
  - Member count
  - Top 3 users preview (optional)
- Tap group to view detailed leaderboard

### Leaderboard Detail Screen
**Detailed group or global leaderboard view**
- Header showing group name or "Global Leaderboard"
- Ranked list of users showing:
  - Rank number (1, 2, 3, etc.)
  - Username
  - Level
  - Monthly XP
  - Profile icon
  - "View Profile" option
- Top 3 users highlighted with special styling
- Back button to return to leaderboard list

### View Profile Screen
**View another user's profile**
- User information:
  - Username
  - Profile icon/avatar
  - Level
- Statistics:
  - Total XP
  - Total PRs
  - Total workouts
  - Current streak
  - Longest streak
- "Add Friend" or "Remove Friend" button (if not already friends)
- "Challenge" button to create Lift Off challenge
- Back button to return to previous screen

### Lift Off Detail Screen
**View and participate in a Lift Off challenge**
- Challenge information:
  - Exercise name (the lift being challenged)
  - Challenger username
  - Opponent username
  - Wager amount (gold)
  - Status (pending, active, completed)
  - Deadline/end date
- Current lifts section:
  - Challenger's best lift (weight x reps)
  - Opponent's best lift (weight x reps)
- Action buttons based on status:
  - If pending: Accept/Decline buttons
  - If active: "Log Lift" button to submit attempt
  - If completed: "View Results" with winner announcement
- Back button to return to home

### Habits Screen
**Track and view workout habits**
- Habit tracking interface
- Visual representation of workout consistency
- Streak information
- Calendar view of habit completion

## Navigation Structure

### Bottom Tab Bar (visible on main screens)
- Template tab
- Home tab (center, primary)
- Habits tab
- Leaderboard tab (abbreviated as "LB")

### Screen Flow
- Authentication → Home
- Home → Session Selection → Exercise Selection → Workout
- Home → Templates
- Home → Friends → View Profile
- Home → Groups → Leaderboard Detail
- Home → Profile → Challenge History → Lift Off Detail
- Home → Leaderboard → Leaderboard Detail → View Profile
- Home → Habits

## Key UI Components Needed

### Cards
- Stat cards (XP, PRs, workouts, streaks)
- Exercise cards (with selection states)
- Friend/group cards (with action buttons)
- Challenge cards (with status indicators)
- Template cards

### Buttons
- Primary action buttons (Start Workout, Complete Workout)
- Secondary buttons (Back, Cancel, Edit)
- Social action buttons (Add Friend, Challenge, Accept, Decline)
- Icon buttons (Profile, Settings)

### Input Fields
- Text inputs (username, email, password, bodyweight, search)
- Number inputs (weight, reps)
- Multi-line inputs (group description)

### Progress Indicators
- XP progress bars
- Level progression indicators
- Streak indicators
- Monthly XP charts

### Badges & Icons
- Level badges (1-100)
- PR achievement badges
- Streak badges
- Gold currency icon
- Category icons (Chest, Back, Legs, etc.)

### Modals
- Create template modal
- Create group modal
- Invite to group modal
- Create challenge modal
- Alert/confirmation modals

### Lists
- Scrollable exercise lists
- Friend lists
- Group lists
- Leaderboard ranked lists
- Challenge history lists

## Design Considerations

- All screens should maintain consistent game-like aesthetic
- Dark background with textured or gradient effects
- Vibrant accent colors for important actions and achievements
- Clear visual hierarchy for primary vs secondary actions
- Touch-friendly button sizes for mobile
- Smooth transitions between screens
- Loading states for data fetching
- Empty states for lists with no data
- Error states for failed operations
- Success animations/feedback for achievements (PRs, level ups)

## Functional Requirements to Reflect in Design

- XP system: Users earn XP from workouts, more for PRs
- Level system: 1-100 levels with increasing XP requirements
- Streak system: Daily workout streaks with multipliers
- Monthly challenges: XP resets monthly, compete against self
- Social features: Friends, groups, leaderboards
- Lift Off challenges: Friend wager challenges on specific exercises
- Gold currency: Earned from workouts and challenges
- PR tracking: Automatic detection when beating personal records
- Workout templates: Save and reuse workout combinations
