// CoPrompt Session Management
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';

// Generate unique session ID
export const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 10);
};

// Create new session
export const createSession = async ({
  ownerName,
  ownerEmail,
  sessionName,
  mainPrompt,
  mainResponse
}) => {
  const sessionId = generateSessionId();
  
  const sessionData = {
    id: sessionId,
    name: sessionName,
    ownerId: ownerEmail,
    ownerName: ownerName,
    mainPrompt: mainPrompt,
    mainResponse: mainResponse,
    status: 'in_progress',
    createdAt: serverTimestamp(),
    participants: {},
    analyses: {},
    synthesis: null
  };
  
  await setDoc(doc(db, 'sessions', sessionId), sessionData);
  
  console.log('✅ Session created:', sessionId);
  return sessionId;
};

// Get session data
export const getSession = async (sessionId) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);
  
  if (sessionSnap.exists()) {
    return sessionSnap.data();
  } else {
    throw new Error('Session not found');
  }
};

// Listen to session changes (real-time)
export const subscribeToSession = (sessionId, callback) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  
  return onSnapshot(sessionRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  });
};

// Add participant to session
export const addParticipant = async (sessionId, participantData) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  
  await updateDoc(sessionRef, {
    [`participants.${participantData.email}`]: {
      name: participantData.name,
      email: participantData.email,
      role: participantData.role,
      customRole: participantData.customRole || null,
      status: 'invited',
      joinedAt: serverTimestamp()
    }
  });
  
  console.log('✅ Participant added:', participantData.email);
};

// Submit analysis
export const submitAnalysis = async (sessionId, role, analysisData) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  
  await updateDoc(sessionRef, {
    [`analyses.${role}`]: {
      ...analysisData,
      submittedAt: serverTimestamp(),
      status: 'submitted'
    },
    [`participants.${analysisData.userId}.status`]: 'submitted'
  });
  
  console.log('✅ Analysis submitted:', role);
};

// Save synthesis
export const saveSynthesis = async (sessionId, synthesisData) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  
  await updateDoc(sessionRef, {
    synthesis: {
      ...synthesisData,
      generatedAt: serverTimestamp()
    },
    status: 'completed'
  });
  
  console.log('✅ Synthesis saved');
};