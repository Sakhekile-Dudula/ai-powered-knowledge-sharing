# Azure Infrastructure Setup

## Prerequisites
- Azure subscription
- Azure CLI installed
- Node.js 18 or later

## Required Azure Resources

### 1. Azure AD B2C
1. Create a new Azure AD B2C tenant:
   ```powershell
   az adb2c tenant create --organization-name "YourOrgName" --initial-domain-name "yourb2cdomain" --sku Standard
   ```

2. Register your application:
   - Go to Azure Portal > Azure AD B2C > App registrations
   - Click "New registration"
   - Name: "AI-Powered Knowledge Sharing"
   - Supported account types: "Accounts in any identity provider..."
   - Redirect URI: http://localhost:5173 (for development)
   - Save the Application (client) ID

3. Configure user flows:
   - Go to Azure AD B2C > User flows
   - Create flows for:
     - Sign up and sign in
     - Profile editing
     - Password reset

### 2. Azure Cosmos DB
1. Create a Cosmos DB account:
   ```powershell
   az cosmosdb create --name your-cosmos-account --resource-group your-rg --kind GlobalDocumentDB --capabilities EnableServerless
   ```

2. Create a database and containers:
   ```powershell
   az cosmosdb sql database create --account-name your-cosmos-account --resource-group your-rg --name KnowledgeDB
   
   az cosmosdb sql container create --account-name your-cosmos-account --resource-group your-rg --database-name KnowledgeDB --name Messages --partition-key-path "/id"
   ```

### 3. Azure Functions
1. Create a Function App:
   ```powershell
   az functionapp create --name your-function-app --resource-group your-rg --consumption-plan-location eastus --runtime node --runtime-version 18 --functions-version 4 --os-type Windows
   ```

### 4. Azure SignalR Service
1. Create SignalR Service:
   ```powershell
   az signalr create --name your-signalr --resource-group your-rg --sku Free_F1 --service-mode Serverless
   ```

### 5. Azure Static Web Apps
1. Create Static Web App:
   ```powershell
   az staticwebapp create --name your-static-web-app --resource-group your-rg --location eastus --branch main --app-location "/" --output-location "dist" --login-with-github
   ```

## Environment Variables
Create a `.env` file in your project root with these variables:
```
VITE_AZURE_AD_B2C_TENANT_NAME=your-b2c-tenant
VITE_AZURE_AD_B2C_CLIENT_ID=your-client-id
VITE_AZURE_AD_B2C_POLICY_NAME=B2C_1_signupsignin
VITE_COSMOS_DB_ENDPOINT=your-cosmos-endpoint
VITE_SIGNALR_CONNECTION_STRING=your-signalr-connection-string
VITE_API_ENDPOINT=your-function-app-url
```

## Next Steps
1. Update authentication configuration in `src/utils/auth.ts`
2. Configure Azure Functions in `azure/functions`
3. Set up Azure SignalR client in `src/utils/signalr.ts`
4. Configure GitHub Actions for deployment