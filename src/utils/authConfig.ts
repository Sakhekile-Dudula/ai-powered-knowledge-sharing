import { Configuration, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_AD_B2C_CLIENT_ID,
    authority: `https://${import.meta.env.VITE_AZURE_AD_B2C_TENANT_NAME}.b2clogin.com/${import.meta.env.VITE_AZURE_AD_B2C_TENANT_NAME}.onmicrosoft.com/${import.meta.env.VITE_AZURE_AD_B2C_POLICY_NAME}`,
    knownAuthorities: [`${import.meta.env.VITE_AZURE_AD_B2C_TENANT_NAME}.b2clogin.com`],
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      }
    }
  }
};

export const loginRequest = {
  scopes: ["openid", "profile", "offline_access"]
};

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me"
};