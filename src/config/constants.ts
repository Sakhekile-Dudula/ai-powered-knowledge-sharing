/**
 * Application Configuration Constants
 * 
 * Centralized configuration for business logic, limits, and constraints.
 * Update these values to change application behavior across all components.
 */

/**
 * Authentication & Security
 */
export const AUTH_CONFIG = {
  /** Minimum password length for user accounts */
  MIN_PASSWORD_LENGTH: Number(import.meta.env.VITE_MIN_PASSWORD_LENGTH) || 6,
  
  /** Maximum password length */
  MAX_PASSWORD_LENGTH: 128,
  
  /** Session timeout in milliseconds (default: 24 hours) */
  SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000,
} as const;

/**
 * Collaboration & Meetings
 */
export const COLLABORATION_CONFIG = {
  /** Default maximum participants for office hours */
  DEFAULT_MAX_PARTICIPANTS: Number(import.meta.env.VITE_DEFAULT_MAX_PARTICIPANTS) || 10,
  
  /** Minimum participants required */
  MIN_PARTICIPANTS: 1,
  
  /** Maximum participants allowed */
  MAX_PARTICIPANTS_LIMIT: 100,
} as const;

/**
 * Search & Pagination
 */
export const SEARCH_CONFIG = {
  /** Debounce delay for search input in milliseconds */
  SEARCH_DEBOUNCE_MS: Number(import.meta.env.VITE_SEARCH_DEBOUNCE_MS) || 300,
  
  /** Default number of search results per page */
  DEFAULT_RESULTS_PER_PAGE: 20,
  
  /** Maximum search results to display */
  MAX_SEARCH_RESULTS: 100,
  
  /** Suggested experts limit on dashboard */
  SUGGESTED_EXPERTS_LIMIT: Number(import.meta.env.VITE_SUGGESTED_EXPERTS_LIMIT) || 3,
} as const;

/**
 * UI & UX Timeouts
 */
export const UI_CONFIG = {
  /** Toast notification duration in milliseconds */
  TOAST_DURATION_MS: 3000,
  
  /** Copy notification duration in milliseconds */
  COPY_NOTIFICATION_MS: 2000,
  
  /** Teams call initiation delay in milliseconds */
  TEAMS_CALL_DELAY_MS: 500,
  
  /** Auto-dismiss success message duration */
  SUCCESS_MESSAGE_DURATION_MS: 5000,
  
  /** Auto-dismiss error message duration */
  ERROR_MESSAGE_DURATION_MS: 7000,
} as const;

/**
 * File Upload
 */
export const FILE_UPLOAD_CONFIG = {
  /** Maximum file size in bytes (default: 5MB) */
  MAX_FILE_SIZE_BYTES: Number(import.meta.env.VITE_MAX_FILE_SIZE_BYTES) || 5 * 1024 * 1024,
  
  /** Allowed image types */
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  
  /** Allowed document types */
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

/**
 * Knowledge & Content
 */
export const CONTENT_CONFIG = {
  /** Minimum title length */
  MIN_TITLE_LENGTH: 3,
  
  /** Maximum title length */
  MAX_TITLE_LENGTH: 200,
  
  /** Minimum description length */
  MIN_DESCRIPTION_LENGTH: 10,
  
  /** Maximum description length */
  MAX_DESCRIPTION_LENGTH: 5000,
  
  /** Maximum tags per item */
  MAX_TAGS_PER_ITEM: 10,
} as const;

/**
 * Analytics & Stats
 */
export const ANALYTICS_CONFIG = {
  /** Days to look back for trending topics */
  TRENDING_DAYS_LOOKBACK: 7,
  
  /** Minimum views to be considered trending */
  MIN_TRENDING_VIEWS: 10,
  
  /** Activity feed items to display */
  ACTIVITY_FEED_LIMIT: 20,
} as const;

/**
 * API & Network
 */
export const API_CONFIG = {
  /** Default API timeout in milliseconds */
  DEFAULT_TIMEOUT_MS: 30000,
  
  /** Retry attempts for failed requests */
  MAX_RETRY_ATTEMPTS: 3,
  
  /** Delay between retry attempts in milliseconds */
  RETRY_DELAY_MS: 1000,
} as const;

/**
 * Helper function to validate configuration
 */
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (AUTH_CONFIG.MIN_PASSWORD_LENGTH < 6) {
    errors.push('MIN_PASSWORD_LENGTH must be at least 6 characters');
  }

  if (COLLABORATION_CONFIG.DEFAULT_MAX_PARTICIPANTS < COLLABORATION_CONFIG.MIN_PARTICIPANTS) {
    errors.push('DEFAULT_MAX_PARTICIPANTS must be greater than MIN_PARTICIPANTS');
  }

  if (SEARCH_CONFIG.SEARCH_DEBOUNCE_MS < 0) {
    errors.push('SEARCH_DEBOUNCE_MS must be non-negative');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Export all configs as a single object for easy access
 */
export const APP_CONFIG = {
  auth: AUTH_CONFIG,
  collaboration: COLLABORATION_CONFIG,
  search: SEARCH_CONFIG,
  ui: UI_CONFIG,
  fileUpload: FILE_UPLOAD_CONFIG,
  content: CONTENT_CONFIG,
  analytics: ANALYTICS_CONFIG,
  api: API_CONFIG,
} as const;
