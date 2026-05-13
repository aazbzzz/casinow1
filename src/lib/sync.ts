/**
 * Global Synchronization Utility
 * Uses KVDB.io for public key-value storage (No API key required for public buckets)
 */

const BUCKET_ID = 'el_casino_global_v1'; // Unique bucket for this project
const KVDB_BASE_URL = `https://kvdb.io/${BUCKET_ID}`;

export async function globalSyncWrite(key: string, value: any): Promise<void> {
  try {
    await fetch(`${KVDB_BASE_URL}/${key}`, {
      method: 'POST',
      body: JSON.stringify(value),
    });
  } catch (e) {
    console.error(`[Sync] Failed to write key ${key}:`, e);
  }
}

export async function globalSyncRead<T>(key: string): Promise<T | null> {
  try {
    const response = await fetch(`${KVDB_BASE_URL}/${key}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error(`[Sync] Failed to read key ${key}:`, e);
    return null;
  }
}

// Leaderboard specific sync
export async function syncLeaderboard(user: { id: string, username: string, balance: number }): Promise<void> {
  const current = await globalSyncRead<any[]>('leaderboard') || [];
  const index = current.findIndex(u => u.id === user.id);
  
  if (index >= 0) {
    current[index] = { ...user, timestamp: Date.now() };
  } else {
    current.push({ ...user, timestamp: Date.now() });
  }
  
  // Keep top 50 and sort
  const updated = current
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 50);
    
  await globalSyncWrite('leaderboard', updated);
}

// Promo Codes specific sync
export async function syncPromoCodes(codes: any[]): Promise<void> {
  await globalSyncWrite('promo_codes', codes);
}

export async function getGlobalPromoCodes(): Promise<any[]> {
  return await globalSyncRead<any[]>('promo_codes') || [];
}
