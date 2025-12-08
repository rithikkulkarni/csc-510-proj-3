// app/context/UserContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { client } from "@/stack/client";
import { getUserDetails } from "../actions";

/**
 * UserProfile
 * ---------------------------------------------------
 * Shape of the user object exposed to the client.
 * Combines identity (id) with app-specific profile fields.
 */
type UserProfile =
  | {
    id: string;
    auth_id?: string | null;
    name: string;
    allergens?: string[];
    savedMeals?: string[];
    allAllergens?: string[];
  }
  | null;

/**
 * UserContextType
 * ---------------------------------------------------
 * Values exposed via the UserContext:
 * - user: current user profile (or null)
 * - setUser: direct setter for local state
 * - refreshUser: reloads the profile from the backend/auth provider
 */
type UserContextType = {
  user: UserProfile;
  setUser: (user: UserProfile) => void;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * UserProvider
 * ---------------------------------------------------
 * Top-level provider that wires the authenticated Stack/Neon user
 * to the app's own user profile stored in the database.
 *
 * Responsibilities:
 * - On mount, call refreshUser to hydrate the profile.
 * - Expose user, setUser, and refreshUser to the React tree.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(null);

  /**
   * Reload the user from the auth client and app DB.
   * - If no auth user is present, clear the profile.
   * - Otherwise, call getUserDetails(neonUser.id) and map into UserProfile.
   */
  const refreshUser = async () => {
    try {
      const neonUser = await client.getUser();
      console.log("refreshUser: neonUser.id =", neonUser?.id);

      if (!neonUser) {
        console.log("refreshUser: no authenticated user, clearing profile");
        setUser(null);
        return;
      }

      const profile = await getUserDetails(neonUser.id);
      console.log("refreshUser: profile.savedMeals =", profile?.savedMeals);

      if (profile) {
        setUser({
          id: neonUser.id,
          name: profile.name,
          savedMeals: profile.savedMeals || [],
          allergens: profile.allergens || [],
        });
      } else {
        console.log("refreshUser: no profile found for user", neonUser.id);
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to load user:", err);
      setUser(null);
    }
  };

  // Hydrate user profile on initial mount
  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * useUser
 * ---------------------------------------------------
 * Convenience hook to access the UserContext.
 *
 * Behavior:
 * - In normal runtime, throws if used outside <UserProvider>.
 * - In test environment, returns a no-op stub instead to simplify
 *   component unit tests that call useUser() without a provider.
 */
export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    // Test-friendly fallback: safe stub rather than throwing
    if (process.env.NODE_ENV === "test") {
      return {
        user: null,
        setUser: () => { },
        refreshUser: async () => { },
      } as UserContextType;
    }

    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
}
