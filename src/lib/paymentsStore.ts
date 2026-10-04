import fs from 'fs';
import path from 'path';

export interface PendingPayment {
  id: string;
  user_id: string;
  item_type: 'GAME' | 'PREMIUM';
  item_id: string | null;
  amount: number;
  username: string;
  userToken?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

// Global in-memory map so API routes share state across requests in Node process
const globalRef = global as unknown as { __pendingPaymentsStore?: Map<string, PendingPayment> };

if (!globalRef.__pendingPaymentsStore) {
  globalRef.__pendingPaymentsStore = new Map<string, PendingPayment>();
}

const store = globalRef.__pendingPaymentsStore;

export function registerPendingPayment(
  reqId: string,
  userId: string,
  itemType: 'GAME' | 'PREMIUM',
  itemId: string | null,
  amount: number,
  username: string,
  userToken?: string
): string {
  // Generate short 6-char unique code e.g. P7A9B2
  const code = 'P' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const entry: PendingPayment = {
    id: reqId,
    user_id: userId,
    item_type: itemType,
    item_id: itemId,
    amount: amount,
    username: username,
    userToken: userToken,
    status: 'PENDING',
    created_at: new Date().toISOString()
  };
  
  store.set(code, entry);
  // Also index by reqId for reverse lookup
  store.set(reqId, entry);

  return code;
}

export function getPendingPayment(codeOrId: string): PendingPayment | undefined {
  return store.get(codeOrId);
}

export function updatePendingPaymentStatus(codeOrId: string, status: 'APPROVED' | 'REJECTED') {
  const item = store.get(codeOrId);
  if (item) {
    item.status = status;
    store.set(item.id, item);
  }
}
