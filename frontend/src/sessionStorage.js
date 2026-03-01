// Session storage and tracking utilities

const STORAGE_KEY = 'coprompt_sessions';
const ANALYTICS_KEY = 'coprompt_analytics';
const SIGNUP_KEY = 'coprompt_signup';
const FREE_SESSIONS = 3;
const FREE_AFTER_SIGNUP = 10;

// Get browser fingerprint (simple, privacy-friendly)
const getBrowserId = () => {
  let browserId = localStorage.getItem('coprompt_browser_id');
  if (!browserId) {
    browserId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('coprompt_browser_id', browserId);
  }
  return browserId;
};

// Get all sessions from localStorage
export const getAllSessions = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading sessions:', error);
    return [];
  }
};

// Save a new session
export const saveSession = (sessionData) => {
  try {
    const sessions = getAllSessions();
    const newSession = {
      sessionId: sessionData.sessionId,
      title: sessionData.title,
      mcName: sessionData.mcName,
      sessionType: sessionData.sessionType || 'general',  // ADD THIS LINE
      createdAt: new Date().toISOString(),
      status: 'active',
      collaboratorCount: sessionData.selectedRoles?.length || 0
    };
    
    sessions.unshift(newSession); // Add to beginning
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    
    // Track analytics
    trackEvent('session_created', {
      sessionId: sessionData.sessionId,
      collaboratorCount: newSession.collaboratorCount
    });
    
    return newSession;
  } catch (error) {
    console.error('Error saving session:', error);
    return null;
  }
};

// Update session status
export const updateSessionStatus = (sessionId, status) => {
  try {
    const sessions = getAllSessions();
    const updated = sessions.map(s => 
      s.sessionId === sessionId ? { ...s, status } : s
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating session:', error);
  }
};

// Check rate limit (max 10 sessions per 24 hours)
export const checkRateLimit = () => {
  const sessions = getAllSessions();
  const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
  
  const recentSessions = sessions.filter(s => 
    new Date(s.createdAt).getTime() > last24Hours
  );
  
  return {
    allowed: recentSessions.length < 10,
    count: recentSessions.length,
    limit: 10,
    resetTime: new Date(recentSessions[0]?.createdAt).getTime() + (24 * 60 * 60 * 1000)
  };
};

// Get signup data
export const getSignupData = () => {
  try {
    const data = localStorage.getItem(SIGNUP_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
};

// Save signup data
export const saveSignupData = (name, email) => {
  try {
    const data = { name, email, signedUpAt: new Date().toISOString() };
    localStorage.setItem(SIGNUP_KEY, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error saving signup:', error);
    return null;
  }
};

// Check session gate — returns what action to take
export const checkSessionGate = () => {
  const sessions = getAllSessions();
  const count = sessions.length;
  const signup = getSignupData();

  if (count < FREE_SESSIONS) {
    return { action: 'allow' };
  }
  if (count >= FREE_SESSIONS && !signup) {
    return { action: 'signup', sessionsUsed: count };
  }
  if (count >= FREE_AFTER_SIGNUP) {
    return { action: 'upgrade', sessionsUsed: count };
  }
  return { action: 'allow' };
};

// Analytics tracking
export const trackEvent = (eventName, data = {}) => {
  try {
    const analytics = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
    const event = {
      eventName,
      timestamp: new Date().toISOString(),
      browserId: getBrowserId(),
      ...data
    };
    
    analytics.push(event);
    
    // Keep only last 100 events
    if (analytics.length > 100) {
      analytics.splice(0, analytics.length - 100);
    }
    
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};

// Get analytics summary
export const getAnalyticsSummary = () => {
  try {
    const analytics = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
    const sessions = getAllSessions();
    
    return {
      totalSessions: sessions.length,
      totalEvents: analytics.length,
      browserId: getBrowserId(),
      firstSession: sessions[sessions.length - 1]?.createdAt,
      lastSession: sessions[0]?.createdAt
    };
  } catch (error) {
    return null;
  }
};