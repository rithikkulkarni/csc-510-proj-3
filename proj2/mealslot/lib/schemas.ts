/**
 * Shared domain schemas
 *
 * Defines Zod schemas and inferred TypeScript types used across API
 * contracts and UI components. These schemas serve as the single
 * source of truth for validation and data shape consistency.
 */

import { z } from "zod";

/**
 * Dish
 *
 * Canonical dish model used by APIs, slot machine logic, and UI
 * rendering. Represents a normalized dish with categorical and
 * filtering metadata.
 */
export const Dish = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  costBand: z.number().int().min(1).max(3),
  timeBand: z.number().int().min(1).max(3),
  isHealthy: z.boolean(),
  allergens: z.array(z.string()),
  ytQuery: z.string(),
});
export type Dish = z.infer<typeof Dish>;

/**
 * PowerUpsInput
 *
 * Optional user-selected modifiers that influence dish selection
 * and filtering logic (e.g., healthier, cheaper, faster).
 */
export const PowerUpsInput = z.object({
  healthy: z.boolean().optional(),
  cheap: z.boolean().optional(),
  max30m: z.boolean().optional(),
});
export type PowerUpsInput = z.infer<typeof PowerUpsInput>;

/**
 * RecipeSchema
 *
 * Strict recipe contract returned by /api/recipe and used by the UI.
 * Validates complete recipe data including ingredients, steps,
 * nutrition, and associated media.
 */
export const RecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  servings: z.number().int().min(1),
  total_minutes: z.number().int().min(1),
  equipment: z.array(z.string()),
  ingredients: z.array(
    z.object({
      item: z.string(),
      qty: z.number().positive(),
      unit: z.string(),
    }),
  ),
  steps: z.array(
    z.object({
      order: z.number().int().min(1),
      text: z.string(),
      timer_minutes: z.number().int().min(0),
    }),
  ),
  nutrition: z.object({
    kcal: z.number().min(0),
    protein_g: z.number().min(0),
    carbs_g: z.number().min(0),
    fat_g: z.number().min(0),
  }),
  warnings: z.array(z.string()).default([]),
  videos: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string().url(),
      thumbnail: z.string().url(),
    }),
  ),
});
export type RecipeJSON = z.infer<typeof RecipeSchema>;
