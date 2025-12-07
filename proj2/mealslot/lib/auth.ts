/**
 * Mock authentication helpers
 *
 * Provides a minimal, deterministic user identity for local development,
 * server-side seeding, and test scenarios. Intended as a temporary stand-in
 * before introducing real authentication (e.g., Auth.js with OAuth).
 */

// Phase 1: MockAuth (no secrets needed). Later we can add Auth.js with Google.
// This file exports minimal identity surface for server-side seeding/tests.

export type UserIdentity = { id: string; name: string; email: string };

/**
 * Returns a fixed mock user identity.
 * Useful for tests and environments where authentication
 * is not yet integrated.
 */
export function getMockUser(): UserIdentity {
  return { id: "user_mock_1", name: "Mock User", email: "mock@example.com" };
}
