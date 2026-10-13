/**
 * HydroSight AI — Firestore Security Rules Test Suite
 * Verifies that all "Dirty Dozen" adversarial payloads return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  { id: 1, name: 'Unauthenticated Write', collection: 'simulations', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 2, name: 'Unverified Email Spoof', collection: 'users', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 3, name: 'Identity Spoofing (ownerId mismatch)', collection: 'simulations', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 4, name: 'Self-Assigned Admin Role Escalation', collection: 'users', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 5, name: 'Shadow Field Injection (isVerified: true)', collection: 'simulations', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 6, name: 'ID Poisoning Attack (Invalid Regex)', collection: 'simulations', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 7, name: 'Oversized String (>500 chars in notes)', collection: 'simulations', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 8, name: 'Timestamp Forgery (createdAt != request.time)', collection: 'alertAcknowledgements', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 9, name: 'Immortal Field Mutation (ownerId / createdAt)', collection: 'simulations', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 10, name: 'Terminal State Bypass (status == resolved)', collection: 'alertAcknowledgements', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 11, name: 'Cross-Tenant List Query Scraping', collection: 'simulations', operation: 'list', expectedResult: 'PERMISSION_DENIED' },
  { id: 12, name: 'Value Poisoning on Update (non-string notes)', collection: 'simulations', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
];
