# Sharing Your App in Development

## Quick Method: Expo Tunnel (Recommended)

Your app is already configured to use tunnel mode! Here's how to share it:

### Steps:

1. **Start the Expo server with tunnel:**
   ```bash
   cd gym-app/frontend
   npm start
   ```
   (This already includes `--tunnel` flag)

2. **Wait for the tunnel URL:**
   - Expo will create a public URL (e.g., `exp://abc123.ngrok.io:8081`)
   - This URL is accessible from anywhere on the internet
   - You'll see a QR code in your terminal

3. **Share with your friend:**
   - **Option A:** Send them the QR code screenshot
   - **Option B:** Send them the URL that appears in the terminal
   - **Option C:** They can scan the QR code if you're on a video call

4. **Your friend needs:**
   - Expo Go app installed on their phone (iOS or Android)
   - To scan the QR code or open the URL in Expo Go

### Troubleshooting Tunnel Mode:

If tunnel mode doesn't work:

1. **Install ngrok (if needed):**
   ```bash
   npm install -g @expo/ngrok
   ```

2. **Or use LAN mode with port forwarding:**
   - Use a service like ngrok manually
   - Or use Expo's built-in tunnel (should work automatically)

3. **Check firewall settings:**
   - Make sure your firewall allows Expo/Node connections
   - Tunnel mode should bypass most firewall issues

### Alternative: Using Expo's Development Build URL

If tunnel doesn't work, you can also:

1. **Get your local IP address:**
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`

2. **Share your IP + port:**
   - Format: `exp://YOUR_IP:8081`
   - Your friend needs to be able to reach your network (VPN, etc.)

3. **Use LAN mode:**
   ```bash
   npm start -- --lan
   ```
   Then share the LAN URL (only works if friend is on same network or VPN)

### Best Practice:

**Tunnel mode is the easiest** - it creates a public URL that works from anywhere. Just make sure:
- Your terminal shows the tunnel URL (not just localhost)
- The QR code is visible
- Your friend has Expo Go installed

### Security Note:

Tunnel URLs are public but temporary. They expire when you stop the server. Only share with trusted friends during development.

