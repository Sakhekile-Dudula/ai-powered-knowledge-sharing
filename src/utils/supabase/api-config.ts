/**
 * API Configuration Utility
 * 
 * Centralizes API endpoint construction to avoid hardcoded URLs.
 * All API calls should use these helper functions.
 */

// Get the function name from environment variables
const functionName = import.meta.env.VITE_SUPABASE_FUNCTION_NAME || 'make-server-d5b5d02c';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is not defined in environment variables');
}

/**
 * Construct the base URL for Supabase Edge Functions
 */
export const getBaseApiUrl = (): string => {
  return `${supabaseUrl}/functions/v1/${functionName}`;
};

/**
 * Build a complete API endpoint URL
 * @param path - The API path (e.g., '/knowledge/search', '/insights')
 * @param params - Optional query parameters
 */
export const buildApiUrl = (path: string, params?: Record<string, string>): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = `${getBaseApiUrl()}${cleanPath}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    return `${baseUrl}?${searchParams.toString()}`;
  }
  
  return baseUrl;
};

/**
 * Common API endpoints as constants
 */
export const API_ENDPOINTS = {
  // Health check
  HEALTH: '/health',
  
  // Knowledge endpoints
  KNOWLEDGE_SEARCH: '/knowledge/search',
  KNOWLEDGE_CREATE: '/knowledge',
  
  // Insights endpoints
  INSIGHTS_LIST: '/insights',
  INSIGHTS_CREATE: '/insights',
  INSIGHTS_LIKE: (id: string) => `/insights/${id}/like`,
  
  // Project endpoints
  PROJECTS_LIST: '/projects',
  PROJECTS_CREATE: '/projects',
  
  // Message endpoints
  MESSAGES_LIST: '/messages',
  MESSAGES_CREATE: '/messages',
  
  // Dashboard endpoints
  DASHBOARD_STATS: '/dashboard/stats',
  DASHBOARD_ACTIVITY: '/dashboard/activity',
  
  // Expert endpoints
  EXPERTS_LIST: '/experts',
  EXPERTS_UPDATE: (id: string) => `/experts/${id}`,
} as const;

/**
 * Helper to get full URL for a specific endpoint
 */
export const getApiEndpoint = (endpoint: string): string => {
  return buildApiUrl(endpoint);
};
