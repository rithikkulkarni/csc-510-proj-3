// app/context/UserContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { client } from "@/stack/client";
import { getUserDetails } from "../actions";

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
    refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

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
                setUser(null);
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

export function useUser() {
    const context = useContext(UserContext);
    // In tests we prefer to return a safe no-op stub instead of throwing so
    // components that call `useUser()` can run without wrapping with the
    // provider. This keeps tests simpler and avoids sprinkling providers in
    // many unit tests.
    if (!context) {
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
