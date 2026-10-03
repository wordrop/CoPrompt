import { db } from './firebase.js';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

// Generate a unique token for each invitee
function generateToken() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

// Create a new ProcessIQ session
export async function createSession({ graph, tier, owningEntity, analystName, commentary, uncertainty, teamNeeds, invitees, deadline }) {
  const sessionRef = await addDoc(collection(db, 'processiq_sessions'), {
    created_at: serverTimestamp(),
    status: 'active',
    tier,
    owning_entity: owningEntity,
    analyst_name: analystName,
    commentary: {
      recommendation: commentary,
      uncertainty,
      team_needs: teamNeeds
    },
    deadline: deadline || null,
    graph,
    synthesis: null
  });

  const sessionId = sessionRef.id;

  // Create invitee records with unique tokens
  const inviteeRecords = [];
  for (const invitee of invitees) {
    const token = generateToken();
    const inviteeRef = doc(db, 'processiq_sessions', sessionId, 'invitees', token);
    await setDoc(inviteeRef, {
      name: invitee.name,
      role: invitee.role,
      email: invitee.email,
      tabs: invitee.tabs,
      token,
      submitted: false,
      submitted_at: null
    });
    inviteeRecords.push({ ...invitee, token });
  }

  return { sessionId, invitees: inviteeRecords };
}

// Get a session by ID
export async function getSession(sessionId) {
  const sessionRef = doc(db, 'processiq_sessions', sessionId);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// Get invitee by token
export async function getInvitee(sessionId, token) {
  const inviteeRef = doc(db, 'processiq_sessions', sessionId, 'invitees', token);
  const snap = await getDoc(inviteeRef);
  if (!snap.exists()) return null;
  return { ...snap.data() };
}

// Submit invitee feedback
export async function submitFeedback(sessionId, token, feedback) {
  const inviteeRef = doc(db, 'processiq_sessions', sessionId, 'invitees', token);
  await updateDoc(inviteeRef, {
    submitted: true,
    submitted_at: serverTimestamp(),
    feedback
  });
}

// Listen to session invitees in real time
export function watchInvitees(sessionId, callback) {
  const inviteesRef = collection(db, 'processiq_sessions', sessionId, 'invitees');
  return onSnapshot(inviteesRef, (snap) => {
    const invitees = snap.docs.map(d => ({ token: d.id, ...d.data() }));
    callback(invitees);
  });
}

// Save synthesis output
export async function saveSynthesis(sessionId, synthesis) {
  const sessionRef = doc(db, 'processiq_sessions', sessionId);
  await updateDoc(sessionRef, {
    synthesis,
    status: 'synthesised',
    synthesised_at: serverTimestamp()
  });
}

// Build the invite link for an invitee
export function buildInviteLink(sessionId, token) {
  const base = window.location.origin;
  return `${base}/processiq/session/${sessionId}?token=${token}`;
}