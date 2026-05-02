import { io, type Socket } from 'socket.io-client';
import { auth } from '../config/firebase';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

let _socket: Socket | null = null;
let _socketUid: string | null = null; // tracks which Firebase UID this socket is authenticated as

/**
 * Returns a connected Socket.io instance for the current Firebase user.
 * If a socket already exists for a DIFFERENT user, it is torn down first
 * so the new user gets a fresh connection with the correct auth token.
 */
export async function getSocket(): Promise<Socket> {
  const currentUid = auth.currentUser?.uid ?? null;
  const token = await auth.currentUser?.getIdToken();

  // Stale socket from a previous user — must disconnect before reusing
  if (_socket?.connected && _socketUid !== currentUid) {
    _socket.disconnect();
    _socket = null;
    _socketUid = null;
  }

  if (_socket?.connected) return _socket;

  // Disconnect any partially-connected stale socket
  _socket?.disconnect();

  _socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
  });
  _socketUid = currentUid;

  return _socket;
}

/**
 * Disconnects and clears the socket. Call on sign-out.
 */
export function disconnectSocket(): void {
  _socket?.disconnect();
  _socket = null;
  _socketUid = null;
}
