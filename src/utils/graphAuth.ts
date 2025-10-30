/**
 * Microsoft Graph API Authentication with MSAL
 * Handles authentication flow for Graph API access
 */

import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
import { getGraphClient } from './graphAPI';

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_GRAPH_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_GRAPH_TENANT_ID || 'common'}`,
    redirectUri: import.meta.env.VITE_GRAPH_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

const loginRequest = {
  scopes: [
    'User.Read',
    'Calendars.ReadWrite',
    'OnlineMeetings.ReadWrite',
    'Presence.Read',
    'Presence.Read.All',
    'Chat.ReadWrite',
  ],
};

let msalInstance: PublicClientApplication | null = null;

/**
 * Initialize MSAL instance
 */
export async function initializeMSAL(): Promise<PublicClientApplication | null> {
  // Check if Graph API is configured
  if (!import.meta.env.VITE_GRAPH_CLIENT_ID || !import.meta.env.VITE_GRAPH_TENANT_ID) {
    console.warn('Microsoft Graph API not configured. Advanced Teams features will be disabled.');
    return null;
  }

  if (!msalInstance) {
    try {
      msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();
    } catch (error) {
      console.error('Error initializing MSAL:', error);
      return null;
    }
  }

  return msalInstance;
}

/**
 * Get access token for Graph API
 */
export async function getGraphAccessToken(): Promise<string | null> {
  const msal = await initializeMSAL();
  if (!msal) return null;

  try {
    const accounts = msal.getAllAccounts();
    
    if (accounts.length === 0) {
      // No accounts, need to login
      console.log('No accounts found, initiating login...');
      await msal.loginPopup(loginRequest);
      return getGraphAccessToken(); // Retry after login
    }

    const account = accounts[0];

    // Try to acquire token silently
    try {
      const response = await msal.acquireTokenSilent({
        scopes: loginRequest.scopes,
        account: account,
      });

      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Silent token acquisition failed, need interaction
        const response = await msal.acquireTokenPopup(loginRequest);
        return response.accessToken;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error acquiring Graph API token:', error);
    return null;
  }
}

/**
 * Initialize Graph API client with authentication
 */
export async function initializeGraphAPI(): Promise<boolean> {
  try {
    const token = await getGraphAccessToken();
    
    if (!token) {
      console.warn('Could not acquire Graph API token. Features will be limited.');
      return false;
    }

    getGraphClient(token);
    console.log('Graph API initialized successfully');
    
    return true;
  } catch (error) {
    console.error('Error initializing Graph API:', error);
    return false;
  }
}

/**
 * Check if Graph API is available
 */
export async function isGraphAPIAvailable(): Promise<boolean> {
  const msal = await initializeMSAL();
  if (!msal) return false;

  const accounts = msal.getAllAccounts();
  return accounts.length > 0;
}

/**
 * Sign in to Microsoft Account
 */
export async function signInToMicrosoft(): Promise<boolean> {
  const msal = await initializeMSAL();
  if (!msal) {
    alert('Microsoft Graph API is not configured. Please contact your administrator.');
    return false;
  }

  try {
    await msal.loginPopup(loginRequest);
    const token = await getGraphAccessToken();
    
    if (token) {
      getGraphClient(token);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error signing in to Microsoft:', error);
    return false;
  }
}

/**
 * Sign out from Microsoft Account
 */
export async function signOutFromMicrosoft(): Promise<void> {
  const msal = await initializeMSAL();
  if (!msal) return;

  const accounts = msal.getAllAccounts();
  if (accounts.length > 0) {
    await msal.logoutPopup({
      account: accounts[0],
    });
  }
}

/**
 * Get current Microsoft account info
 */
export async function getCurrentMicrosoftAccount(): Promise<{ name: string; email: string } | null> {
  const msal = await initializeMSAL();
  if (!msal) return null;

  const accounts = msal.getAllAccounts();
  if (accounts.length === 0) return null;

  const account = accounts[0];
  return {
    name: account.name || '',
    email: account.username || '',
  };
}
