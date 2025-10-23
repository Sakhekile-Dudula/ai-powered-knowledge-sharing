/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AZURE_AD_B2C_CLIENT_ID: string
  readonly VITE_AZURE_AD_B2C_TENANT_NAME: string
  readonly VITE_AZURE_AD_B2C_POLICY_NAME: string
  readonly VITE_COSMOS_DB_ENDPOINT: string
  readonly VITE_SIGNALR_CONNECTION_STRING: string
  readonly VITE_API_ENDPOINT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}