// Generates collision-resistant unique IDs for tree nodes.

// Returns a UUID, using the platform crypto API or a random fallback.
export function uid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'x' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
