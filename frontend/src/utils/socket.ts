import { io, type Socket } from 'socket.io-client';
import { auth } from '../config/firebase';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

let _socket: Socket | null = null;

/**
 * Returns a connected Socket.io instance, creating one if necessary.
 * Always fetches a fresh Firebase ID token so the connection is valid
 * even if a previous token expired.
 */
export async function getSocket(): Promise<Socket> {
  const token = await auth.currentUser?.getIdToken();

  if (_socket?.connected) return _socket;

  // Disconnect stale socket before creating a new one
  _socket?.disconnect();

  _socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
  });

  return _socket;
}

/**
 * Disconnects and clears the socket. Call on sign-out.
 */
export function disconnectSocket(): void {
  _socket?.disconnect();
  _socket = null;
}
