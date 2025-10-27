# Microsoft Teams Integration Guide

## Overview

This application includes **full Microsoft Teams integration** for video calls, chats, and collaboration. The integration uses multiple approaches to ensure maximum compatibility.

## Integration Methods

### 1. Teams Deep Links (Currently Implemented) ✅

**Advantages:**
- ✅ Works immediately - no setup required
- ✅ No authentication needed
- ✅ Works on all platforms (Windows, Mac, Web, Mobile)
- ✅ Opens Teams desktop app if installed, otherwise web version

**Features Available:**
- Start instant video calls
- Start chat conversations
- Join meetings
- Share to Teams

**How It Works:**
```typescript
// Start a Teams call
startTeamsCall(['user@company.com']);

// Start a Teams chat
startTeamsChat(['user@company.com'], 'Hello from our app!');

// Join a meeting
joinTeamsMeeting('https://teams.microsoft.com/l/meetup-join/...');
```

### 2. Microsoft Graph API (Advanced - Optional)

For advanced features like programmatic meeting creation and calendar integration.

**Setup Required:**
1. Azure AD App Registration
2. OAuth 2.0 authentication
3. API permissions:
   - `OnlineMeetings.ReadWrite`
   - `Calendars.ReadWrite`
   - `Presence.Read`

**Additional Features:**
- Create scheduled Teams meetings
- Add meetings to calendars
- Check user presence/availability
- Manage meeting participants
- Get meeting recordings

**Implementation:**
```typescript
const teamsAPI = new TeamsGraphAPI(accessToken);

// Create a meeting
const meeting = await teamsAPI.createMeeting({
  subject: 'Team Standup',
  startTime: new Date(),
  participants: ['user1@company.com', 'user2@company.com']
});

// Get user presence
const presence = await teamsAPI.getUserPresence('user@company.com');
```

## Current Implementation

### Files Added

1. **`src/utils/teamsIntegration.ts`**
   - Core Teams integration utilities
   - Deep link generation
   - Graph API wrapper (ready to use when auth is set up)
   
2. **`src/components/CollaborationTools.tsx`** (Updated)
   - Teams call/chat buttons
   - Office hours integration
   - Screen sharing support

### How Users Experience It

1. **Click "Start Teams Call"** → Opens Microsoft Teams with a new call
2. **Click "Start Teams Chat"** → Opens Microsoft Teams chat
3. **Join Office Hours** → Automatically opens Teams call with the expert
4. **Share Screen** → Opens Teams where user can share screen

### Browser/Platform Support

| Platform | Desktop App | Web App |
|----------|-------------|---------|
| Windows | ✅ Auto-opens | ✅ Fallback |
| macOS | ✅ Auto-opens | ✅ Fallback |
| Linux | ⚠️ Web only | ✅ Works |
| iOS/Android | ✅ Mobile app | ✅ Works |

## Testing the Integration

### Test 1: Start a Call
```typescript
import { startTeamsCall } from '../utils/teamsIntegration';

// Start a call with no participants (user can add them)
startTeamsCall();

// Start a call with specific people
startTeamsCall(['colleague@company.com']);
```

### Test 2: Start a Chat
```typescript
import { startTeamsChat } from '../utils/teamsIntegration';

// Start empty chat
startTeamsChat();

// Start chat with people and a message
startTeamsChat(
  ['teammate@company.com'],
  'Hey! Let\'s discuss the project'
);
```

### Test 3: Deep Link Generation
```typescript
import { generateTeamsDeepLink } from '../utils/teamsIntegration';

// Generate a call link
const callLink = generateTeamsDeepLink({
  type: 'call',
  users: ['user@company.com']
});
// Returns: https://teams.microsoft.com/l/call/0/0?users=user@company.com

// Generate a chat link
const chatLink = generateTeamsDeepLink({
  type: 'chat',
  users: ['user@company.com'],
  message: 'Hello!'
});
```

## Upgrading to Graph API (Optional)

If you want advanced features like programmatic meeting creation:

### Step 1: Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App Registrations**
3. Click **New Registration**
4. Name: "AI Knowledge Sharing Platform"
5. Redirect URI: `https://your-app-url.com/auth/callback`
6. Click **Register**

### Step 2: Configure Permissions

1. Go to **API Permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Add these permissions:
   - `OnlineMeetings.ReadWrite`
   - `Calendars.ReadWrite`
   - `User.Read`
   - `Presence.Read`
5. Click **Grant admin consent**

### Step 3: Get Credentials

1. Go to **Certificates & secrets**
2. Create a **New client secret**
3. Copy the **Client ID** and **Client Secret**
4. Add to your `.env` file:
   ```
   VITE_AZURE_CLIENT_ID=your-client-id
   VITE_AZURE_CLIENT_SECRET=your-client-secret
   VITE_AZURE_TENANT_ID=your-tenant-id
   ```

### Step 4: Implement OAuth

```typescript
// Install MSAL library
npm install @azure/msal-browser

// Configure MSAL
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin + '/auth/callback',
  }
};

const pca = new PublicClientApplication(msalConfig);

// Login and get token
const loginRequest = {
  scopes: ['OnlineMeetings.ReadWrite', 'User.Read']
};

const response = await pca.loginPopup(loginRequest);
const accessToken = response.accessToken;

// Use with Graph API
const teamsAPI = new TeamsGraphAPI(accessToken);
const meeting = await teamsAPI.createMeeting({
  subject: 'Project Sync',
  startTime: new Date(),
  participants: ['team@company.com']
});
```

## Security Considerations

### Deep Links (Current)
- ✅ No credentials exposed
- ✅ No server-side secrets needed
- ✅ Users authenticate through Teams directly

### Graph API (If implemented)
- 🔐 Store client secrets server-side only
- 🔐 Use token refresh mechanisms
- 🔐 Implement proper OAuth flow
- 🔐 Never expose tokens in client-side code

## Troubleshooting

### Teams Doesn't Open
- **Solution**: User needs Teams installed or will open in browser
- **Check**: Does the user have Teams access?

### Deep Link Returns Error
- **Solution**: Ensure the URL format is correct
- **Check**: Are user email addresses valid?

### Graph API Authentication Fails
- **Solution**: Check Azure AD app permissions
- **Verify**: Client ID, tenant ID, and scopes are correct

### Meeting Creation Fails
- **Solution**: Ensure user has OnlineMeetings.ReadWrite permission
- **Check**: Is the access token still valid?

## Future Enhancements

### Planned Features
- [ ] Teams meeting scheduling with calendar integration
- [ ] Real-time presence indicators
- [ ] Meeting recordings access
- [ ] Teams channel integration
- [ ] Adaptive Cards for rich notifications
- [ ] Teams tabs embedding

### Advanced Integration Ideas
- **Teams Tabs**: Embed your app directly in Teams
- **Teams Bots**: Create a bot for Q&A and notifications
- **Meeting Extensions**: Add features during meetings
- **Message Extensions**: Share knowledge directly in Teams chats

## Resources

- [Microsoft Teams Deep Links Documentation](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-links)
- [Microsoft Graph API Reference](https://docs.microsoft.com/en-us/graph/api/resources/onlinemeeting)
- [Teams JavaScript SDK](https://docs.microsoft.com/en-us/javascript/api/@microsoft/teams-js/)
- [Azure AD App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)

## Support

The Teams integration is **production-ready** and works immediately without any additional setup. For advanced features requiring Graph API, follow the upgrade guide above.

**Current Status**: ✅ **Fully Functional** (Deep Links)  
**Advanced Features**: ⏳ **Ready to Implement** (Graph API - optional)
