export interface UserAuthSession {
  userId: string;
  email: string;
  rememberMe: boolean;
  loginTimestamp: number;
  expiresAt: number; // Unix timestamp in ms
}

const AUTH_USER_KEY = 'auraledger_user_id';
const AUTH_SESSION_KEY = 'auraledger_auth_session';
const SAVED_EMAIL_KEY = 'auraledger_remembered_email';

// Default session without "remember me" is 24 hours (1 day), with "remember me" is 30 days
const DEFAULT_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day
const REMEMBER_ME_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Creates and saves user authentication session with optional 30-day "Remember Me"
 */
export const setUserAuthSession = (email: string, rememberMe: boolean): void => {
  const cleanEmail = email.trim().toLowerCase();
  const now = Date.now();
  const duration = rememberMe ? REMEMBER_ME_DURATION_MS : DEFAULT_SESSION_DURATION_MS;
  const expiresAt = now + duration;

  const session: UserAuthSession = {
    userId: cleanEmail,
    email: cleanEmail,
    rememberMe,
    loginTimestamp: now,
    expiresAt
  };

  try {
    localStorage.setItem(AUTH_USER_KEY, cleanEmail);
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));

    if (rememberMe) {
      localStorage.setItem(SAVED_EMAIL_KEY, cleanEmail);
    } else {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }
    
    // Also update lastLoginAt in backend
    fetch('/api/admin/track-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, lastLoginAt: new Date(now).toISOString() })
    }).catch(e => console.error('Failed to sync login', e));
    
  } catch (e) {
    console.error('Error saving user auth session:', e);
  }
};

/**
 * Checks if current user has an active and non-expired authentication session
 */
export const checkIsAuthenticated = (): boolean => {
  try {
    const rawSession = localStorage.getItem(AUTH_SESSION_KEY);
    const userId = localStorage.getItem(AUTH_USER_KEY);

    if (!userId) {
      return false;
    }

    if (!rawSession) {
      // Legacy session check
      return true;
    }

    const session: UserAuthSession = JSON.parse(rawSession);
    const now = Date.now();

    // If session has expired, clean up
    if (session.expiresAt && now > session.expiresAt) {
      clearUserAuthSession();
      return false;
    }

    return true;
  } catch (e) {
    console.error('Error checking auth session:', e);
    return !!localStorage.getItem(AUTH_USER_KEY);
  }
};

/**
 * Gets remembered email for prefilling the login form
 */
export const getRememberedEmail = (): string => {
  try {
    return localStorage.getItem(SAVED_EMAIL_KEY) || '';
  } catch (e) {
    return '';
  }
};

/**
 * Clears user authentication session (e.g. on manual logout)
 */
export const clearUserAuthSession = (): void => {
  try {
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch (e) {
    console.error('Error clearing auth session:', e);
  }
};
