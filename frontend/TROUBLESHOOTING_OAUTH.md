# Troubleshooting OAuth Provider Setup

## Google Sign-In Won't Stay Enabled

If you click the toggle to enable Google but it immediately disables, here's how to fix it:

### Problem: Missing Required Credentials

Supabase requires **both** Client ID and Client Secret to enable Google OAuth. If either is missing, it won't stay enabled.

### Solution:

1. **Make sure you have both credentials from Google Cloud Console:**
   - Client ID (starts with numbers, ends with `.apps.googleusercontent.com`)
   - Client Secret (starts with `GOCSPX-`)

2. **In Supabase Dashboard:**
   - Go to Authentication → Providers → Google
   - Fill in **Client ID (for OAuth)** field
   - Fill in **Client Secret (for OAuth)** field
   - **Click "Save" button** (important!)
   - Then toggle it on

3. **If it still doesn't work:**
   - Check browser console for errors
   - Make sure the redirect URI in Google Cloud Console matches exactly:
     ```
     https://emajpallpgpanxneyllu.supabase.co/auth/v1/callback
     ```
   - Try refreshing the Supabase dashboard page
   - Make sure you're using the correct Supabase project

### Quick Checklist:

- [ ] Created OAuth 2.0 Client ID in Google Cloud Console
- [ ] Added redirect URI: `https://emajpallpgpanxneyllu.supabase.co/auth/v1/callback`
- [ ] Copied both Client ID and Client Secret
- [ ] Pasted both into Supabase (not just one)
- [ ] Clicked "Save" button in Supabase
- [ ] Then toggled Google provider to enabled

### Still Having Issues?

1. **Check the redirect URI:**
   - In Google Cloud Console, go to your OAuth 2.0 Client ID
   - Under "Authorized redirect URIs", make sure you have:
     ```
     https://emajpallpgpanxneyllu.supabase.co/auth/v1/callback
     ```
   - Replace `emajpallpgpanxneyllu` with your actual Supabase project reference ID

2. **Verify your Supabase project:**
   - Go to Supabase Dashboard → Settings → API
   - Check your project URL (should match the redirect URI)

3. **Try disabling and re-enabling:**
   - Clear both credential fields
   - Save
   - Re-enter credentials
   - Save again
   - Then enable

