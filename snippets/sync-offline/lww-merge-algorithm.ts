/**
 * PATTERN: Last-Write-Wins (LWW) Multi-Device Conflict Resolution
 * STACK: Dexie.js, IndexedDB, TypeScript
 * 
 * GUARANTEES:
 * - Deterministic timestamp comparison (newest updatedAt wins).
 * - Tombstones (isDeleted: true) always override older local records.
 */

export interface SyncRecord {
  id: string;
  userId: string;
  updatedAt: string;
  isDeleted?: boolean;
  [key: string]: any;
}

export function mergeRecordsLWW<T extends SyncRecord>(
  localRecords: Map<string, T>,
  remoteRecords: T[]
): { toUpsert: T[]; toDeleteLocally: string[] } {
  const toUpsert: T[] = [];
  const toDeleteLocally: string[] = [];

  for (const remote of remoteRecords) {
    const local = localRecords.get(remote.id);

    if (!local) {
      if (remote.isDeleted) {
        toUpsert.push(remote); // Store tombstone
      } else {
        toUpsert.push(remote);
      }
      continue;
    }

    const remoteTime = new Date(remote.updatedAt).getTime();
    const localTime = new Date(local.updatedAt).getTime();

    if (remoteTime >= localTime) {
      if (remote.isDeleted) {
        toUpsert.push(remote); // Update to tombstone
      } else {
        toUpsert.push(remote);
      }
    }
  }

  return { toUpsert, toDeleteLocally };
}
