/**
 * User / cart-owner model.
 *
 * The app never assumes one global anonymous shopper. Every cart and order
 * belongs to an "owner":
 *   - a guest (Phase 1 — a random ID saved in this browser), or
 *   - a signed-in user (Phase 2 — the ID from Google sign-in / the database).
 *
 * When Google sign-in is added, the guest's cart can be merged into the
 * signed-in user's cart (see CartService.mergeCarts).
 */

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

export type CartOwner =
  | { kind: 'guest'; id: string }
  | { kind: 'user'; id: string }

/** A stable string key for an owner, e.g. "guest:abc123" or "user:42". */
export function ownerKey(owner: CartOwner): string {
  return `${owner.kind}:${owner.id}`
}
