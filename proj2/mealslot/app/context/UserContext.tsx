// app/context/UserContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { client } from "@/stack/client";
import { getUserDetails } from "../actions";

// -------------------------
// Extend user profile to include Favorites and dietary preferences
// -------------------------
type UserProfile = {
    id: string;
    auth_id?: string | null;
    name: string;
    allergens?: string[];
    savedMeals?: string[];
    allAllergens?: string[];
} | null;


type UserContextType = {
    user: UserProfile;
    setUser: (user: UserProfile) => void;
    refreshUser: () => Promise<void>; // method to reload user data from DB
};

const UserContext = createContext<UserContextType | undefined>(undefined);

// -------------------------
// Provider
// -------------------------
export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile>(null);

    const refreshUser = async () => {
        try {
            const neonUser = await client.getUser();
            if (!neonUser) {
                setUser(null);
                return;
            }

            const profile = await getUserDetails(neonUser.id);
            if (profile) {
                setUser({
                    id: neonUser.id,
                    name: profile.name,
                    savedMeals: profile.savedMeals || [],
                    allergens: profile.allergens || [],
                });
            } else {
                setUser({ id: neonUser.id, name: "User", savedMeals: [], allergens: [] });
            }
        } catch (err) {
            console.error("Failed to load user:", err);
            setUser(null);
        }
    };

    useEffect(() => {
        refreshUser();
    }, []);

    return (
        <UserContext.Provider value={{ user, setUser, refreshUser }}>
            {children}
        </UserContext.Provider>
    );
}

// -------------------------
// Hook
// -------------------------
export function useUser() {
    const context = useContext(UserContext);
    if (!context) throw new Error("useUser must be used within a UserProvider");
    return context;
}
