"use client";

import { useUser } from "@/app/context/UserContext";
import { useState } from "react";
import Link from "next/link";

// Minimal meal type for display
type Meal = {
    id: string;
    name: string;
    description?: string;
};

export default function SavedMealsPage() {
    const { user, setUser, refreshUser } = useUser();
    const [loading, setLoading] = useState(false);

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <p className="text-lg text-gray-700">
                    You must be signed in to see favorites.
                </p>
                <Link
                    href="/auth/callback?action=login"
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                    Sign In
                </Link>
            </div>
        );
    }

    // Map savedMeals (IDs) to Meal objects for UI
    const savedMeals: Meal[] =
        user.savedMeals?.map((id) => ({
            id,
            name: `Meal ${id}`, // Placeholder name; replace with DB lookup if available
        })) || [];

    const handleRemoveMeal = async (mealId: string) => {
        setLoading(true);
        try {
            // TODO: Call backend API to remove meal from user
            // await removeSavedMeal(user.id, mealId);

            // Update local context immediately
            const updatedMeals = user.savedMeals?.filter((id) => id !== mealId) || [];
            setUser({ ...user, savedMeals: updatedMeals });

            // Optionally refresh user from DB
            await refreshUser();
        } catch (err) {
            console.error("Failed to remove meal:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Saved Meals</h1>

            {savedMeals.length === 0 ? (
                <p className="text-gray-600">You have no saved meals yet.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {savedMeals.map((meal) => (
                        <div
                            key={meal.id}
                            className="border rounded-lg p-4 flex flex-col justify-between shadow hover:shadow-md transition"
                        >
                            <div>
                                <h2 className="text-lg font-semibold">{meal.name}</h2>
                                {meal.description && (
                                    <p className="text-gray-600">{meal.description}</p>
                                )}
                            </div>
                            <button
                                onClick={() => handleRemoveMeal(meal.id)}
                                disabled={loading}
                                className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
