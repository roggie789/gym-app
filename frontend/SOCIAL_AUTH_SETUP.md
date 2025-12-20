# Social Authentication Setup Guide

This guide will help you set up Google, Apple, and other OAuth providers for your gym app.

## Prerequisites

1. **Install required package:**
   ```bash
   cd gym-app/frontend
   npm install expo-web-browser
   ```

## Supabase Configuration

### 1. Enable OAuth Providers in Supabase

1. Go to your Supabase Dashboard → Authentication → Providers
2. Enable the providers you want (Google, Apple, GitHub, etc.)
3. For each provider, you'll need to configure:

#### Google OAuth Setup:

**Step 1: Create OAuth Credentials in Google Cloud Console**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** (or **Google Identity Services API**):
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" or "Google Identity Services"
   - Click "Enable"
4. Go to "APIs & Services" → "Credentials"
5. Click "Create Credentials" → "OAuth 2.0 Client ID"
6. If prompted, configure the OAuth consent screen first:
   - User Type: External (unless you have a Google Workspace)
   - App name: Your Gym App
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue" through the steps
7. Back in Credentials, create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: Gym App (or any name)
   - **Authorized redirect URIs**: 
     ```
     https://emajpallpgpanxneyllu.supabase.co/auth/v1/callback
     ```
   - Click "Create"
8. **IMPORTANT**: Copy both:
   - **Client ID** (looks like: `123456789-abcdefg.apps.googleusercontent.com`)
   - **Client Secret** (looks like: `GOCSPX-xxxxxxxxxxxxx`)

**Step 2: Configure in Supabase**

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google** in the list
3. Click the toggle to enable it (it will show as disabled until you add credentials)
4. **Fill in BOTH fields:**
   - **Client ID (for OAuth)**: Paste your Google Client ID
   - **Client Secret (for OAuth)**: Paste your Google Client Secret
5. **Click "Save"** at the bottom of the page
6. The toggle should now stay enabled

**Common Issues:**
- If it still says disabled: Make sure you've filled in BOTH Client ID and Client Secret
- If you get an error: Double-check the redirect URI matches exactly
- Make sure you clicked "Save" after entering the credentials

#### Apple OAuth Setup:
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create an App ID and Service ID
3. Configure Sign in with Apple
4. Add redirect URI: `https://emajpallpgpanxneyllu.supabase.co/auth/v1/callback`
5. Copy the Service ID, Team ID, Key ID, and Private Key
6. Paste them into Supabase Dashboard → Authentication → Providers → Apple

#### GitHub OAuth Setup:
1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL: `https://emajpallpgpanxneyllu.supabase.co/auth/v1/callback`
4. Copy the Client ID and Client Secret
5. Paste them into Supabase Dashboard → Authentication → Providers → GitHub

### 2. Configure Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:
- Add redirect URL: `exp://localhost:8081/--/auth/callback` (for development)
- For production, add your app's deep link: `yourapp://auth/callback`

### 3. Update app.json for Deep Linking

Add this to your `app.json`:

```json
{
  "expo": {
    "scheme": "yourapp",
    "ios": {
      "bundleIdentifier": "com.yourapp.gymapp"
    },
    "android": {
      "package": "com.yourapp.gymapp"
    }
  }
}
```

## How It Works

1. User clicks "Continue with Google/Apple"
2. App opens browser with OAuth provider
3. User authenticates with provider
4. Provider redirects back to app via deep link
5. App exchanges code for session
6. User is logged in automatically

## Testing

1. Make sure you've installed `expo-web-browser`
2. Run the app: `npm start`
3. Click a social auth button
4. Complete the OAuth flow in the browser
5. You should be redirected back to the app and logged in

## Troubleshooting

- **Redirect not working**: Make sure the redirect URL in Supabase matches your app's scheme
- **OAuth provider not configured**: Check Supabase Dashboard → Authentication → Providers
- **Deep link not working**: Verify your `app.json` scheme configuration

