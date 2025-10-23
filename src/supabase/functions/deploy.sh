#!/bin/bash

# MRI Synapse - Edge Function Deployment Script
# This script reorganizes files and deploys the Edge Function to Supabase

set -e  # Exit on error

echo "🚀 MRI Synapse - Supabase Edge Function Deployment"
echo "=================================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "Please install it first: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Function name
FUNCTION_NAME="make-server-d5b5d02c"

# Create the correct directory structure
echo "📁 Organizing files..."
mkdir -p "supabase/functions/$FUNCTION_NAME"

# Copy files to the correct location
if [ -f "supabase/functions/server/index.tsx" ]; then
    cp "supabase/functions/server/index.tsx" "supabase/functions/$FUNCTION_NAME/"
    echo "  ✓ Copied index.tsx"
fi

if [ -f "supabase/functions/server/kv_store.tsx" ]; then
    cp "supabase/functions/server/kv_store.tsx" "supabase/functions/$FUNCTION_NAME/"
    echo "  ✓ Copied kv_store.tsx"
fi

echo ""
echo "📋 File structure ready:"
tree "supabase/functions/$FUNCTION_NAME" 2>/dev/null || ls -la "supabase/functions/$FUNCTION_NAME"
echo ""

# Ask for confirmation
read -p "Deploy Edge Function to Supabase? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Deploying Edge Function..."
    supabase functions deploy $FUNCTION_NAME
    
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "Next steps:"
    echo "1. Test the health endpoint:"
    echo "   curl https://<project-id>.supabase.co/functions/v1/$FUNCTION_NAME/health"
    echo ""
    echo "2. Update frontend to use real API:"
    echo "   - Set USE_MOCK_API = false in /components/Messages.tsx"
    echo "   - Set USE_MOCK_API = false in /components/MessagingDialog.tsx"
    echo ""
else
    echo "Deployment cancelled."
fi
