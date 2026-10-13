import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Single shared Firebase App instance
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const PROJECT_ID = firebaseConfig.projectId;

// Required Workspace OAuth Scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.messages',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Mandatory Firestore error handler per Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Auth state listener with in-memory token management
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;

    // Ensure user profile exists in Firestore adhering to firebase-blueprint.json
    const userPath = `users/${result.user.uid}`;
    try {
      const existingDoc = await getDocFromServer(doc(db, 'users', result.user.uid));
      if (!existingDoc.exists()) {
        const displayName = (result.user.displayName || 'HydroSight Operator')
          .slice(0, 100)
          .trim();
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          displayName: displayName || 'HydroSight Operator',
          role: 'analyst',
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      // Non-fatal if user doc already exists or rules evaluate
      console.warn('User profile sync info:', err);
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Firestore Helpers for Saved Simulations & Alert Acknowledgements
export interface SavedSimulationRecord {
  id: string;
  ownerId: string;
  scenarioName: string;
  month: string;
  avgDepth: number;
  avgRiskScore: number;
  notes: string;
  createdAt?: any;
}

export interface AlertAckRecord {
  id: string;
  ownerId: string;
  alertId: string;
  zoneId: string;
  status: 'acknowledged' | 'resolved';
  actionTaken: string;
  createdAt?: any;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export async function saveSimulationToFirestore(
  scenarioName: string,
  month: string,
  avgDepth: number,
  avgRiskScore: number,
  notes: string
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in to save simulation.');

  const simId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  if (!VALID_ID_REGEX.test(simId)) throw new Error('Invalid simulation ID');

  const path = `simulations/${simId}`;
  try {
    await setDoc(doc(db, 'simulations', simId), {
      id: simId,
      ownerId: user.uid,
      scenarioName: scenarioName.slice(0, 100),
      month: month.slice(0, 30),
      avgDepth: Math.max(0, Math.min(500, Number(avgDepth.toFixed(1)))),
      avgRiskScore: Math.max(0, Math.min(100, Math.round(avgRiskScore))),
      notes: (notes || 'Saved from HydroSight AI Simulation Lab').slice(0, 500),
      createdAt: serverTimestamp(),
    });
    return simId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteSimulationFromFirestore(simId: string) {
  const path = `simulations/${simId}`;
  try {
    await deleteDoc(doc(db, 'simulations', simId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function logAlertAckToFirestore(
  alertId: string,
  zoneId: string,
  status: 'acknowledged' | 'resolved',
  actionTaken: string
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in to log alert acknowledgement.');

  const cleanAlertId = alertId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64);
  const ackId = `ack_${cleanAlertId}_${Date.now()}`;
  const path = `alertAcknowledgements/${ackId}`;

  try {
    await setDoc(doc(db, 'alertAcknowledgements', ackId), {
      id: ackId,
      ownerId: user.uid,
      alertId: cleanAlertId,
      zoneId: zoneId.slice(0, 64),
      status,
      actionTaken: (actionTaken || 'Acknowledged by operator').slice(0, 300),
      createdAt: serverTimestamp(),
    });
    return ackId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeUserSimulations(
  uid: string,
  callback: (items: SavedSimulationRecord[]) => void
) {
  const q = query(collection(db, 'simulations'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: SavedSimulationRecord[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as SavedSimulationRecord);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'simulations');
    }
  );
}

export function subscribeUserAlertAcks(
  uid: string,
  callback: (items: AlertAckRecord[]) => void
) {
  const q = query(collection(db, 'alertAcknowledgements'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: AlertAckRecord[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as AlertAckRecord);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'alertAcknowledgements');
    }
  );
}

// Google Workspace API Helpers (Google Tasks & Google Chat)
export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
}

export interface GoogleChatSpace {
  name: string;
  displayName: string;
  spaceType?: string;
}

export async function fetchGoogleTasks(accessToken: string): Promise<GoogleTaskItem[]> {
  const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listsRes.ok) {
    const errText = await listsRes.text();
    throw new Error(`Google Tasks API Error (${listsRes.status}): ${errText}`);
  }
  const listsData = await listsRes.json();
  const primaryListId = listsData.items?.[0]?.id || '@default';

  const tasksRes = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${primaryListId}/tasks?showCompleted=true&maxResults=20`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!tasksRes.ok) {
    throw new Error(`Failed to fetch tasks (${tasksRes.status})`);
  }
  const tasksData = await tasksRes.json();
  return tasksData.items || [];
}

export async function createGoogleTask(
  accessToken: string,
  title: string,
  notes: string
): Promise<GoogleTaskItem> {
  const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      notes,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Google Task (${res.status}): ${errText}`);
  }
  return await res.json();
}

export async function fetchGoogleChatSpaces(
  accessToken: string
): Promise<GoogleChatSpace[]> {
  const res = await fetch('https://chat.googleapis.com/v1/spaces', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      errMsg = errJson.error?.message || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  const data = await res.json();
  return data.spaces || [];
}

export async function sendGoogleChatMessage(
  accessToken: string,
  spaceName: string,
  text: string
) {
  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      errMsg = errJson.error?.message || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return await res.json();
}
