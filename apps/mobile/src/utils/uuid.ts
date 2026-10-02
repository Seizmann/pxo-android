import uuid from 'react-native-uuid';

/** Generate a new UUID v4 string. */
export function newId(): string {
  return uuid.v4() as string;
}

/** Current timestamp as ISO 8601 UTC string. */
export function nowIso(): string {
  return new Date().toISOString();
}
