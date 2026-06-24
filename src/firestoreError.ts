import { auth } from "./firebase";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth?.currentUser;

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
    },
    operationType,
    path
  };
  
  // Suppress thrown exception and red console error logs for non-blocking read streams or chat paths to fall back peacefully
  if (operationType === OperationType.LIST || (path && (path.includes('chat_sessions') || path.includes('messages')))) {
    console.warn('[Firestore Fallback Handler] Non-blocking permission warning. Swapping to local emulation where applicable.', path, errInfo.error);
    return;
  }

  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
