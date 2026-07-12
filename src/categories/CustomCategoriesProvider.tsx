/**
 * BudgetArk - Custom Categories Provider
 * File: src/categories/CustomCategoriesProvider.tsx
 *
 * Global context owning the user's custom category list so pickers, the
 * Budget screen, and the manage modal all read one reactive source instead
 * of each re-reading storage. Mirrors AchievementsProvider's shape.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BudgetBucket, CustomCategory } from "../types";
import {
  getCustomCategories,
  addCustomCategory,
  updateCustomCategory,
  deleteCustomCategory,
  restoreCustomCategory,
  type CategoryMutationResult,
} from "../storage/customCategoriesStorage";

interface CustomCategoriesContextValue {
  customCategories: CustomCategory[];
  isReady: boolean;
  refresh: () => Promise<void>;
  add: (
    name: string,
    icon: string,
    defaultBucket: BudgetBucket
  ) => Promise<CategoryMutationResult>;
  update: (
    id: string,
    patch: { name?: string; icon?: string; defaultBucket?: BudgetBucket }
  ) => Promise<CategoryMutationResult>;
  remove: (id: string) => Promise<void>;
  restore: (category: CustomCategory) => Promise<CategoryMutationResult>;
}

const CustomCategoriesContext =
  createContext<CustomCategoriesContextValue | null>(null);

export const CustomCategoriesProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Promise-chain form purely to satisfy react-hooks/set-state-in-effect,
  // whose syntactic analysis flags any setState-containing local function
  // called from an effect - even when every setState sits behind an await
  // (post-await code always runs in a microtask, never synchronously in the
  // effect body). Callbacks passed to .then/.finally are recognized as
  // async, so this shape lints clean. Behaviorally identical to async/await.
  const refresh = useCallback(
    (): Promise<void> =>
      getCustomCategories()
        .then((categories) => {
          setCustomCategories(categories);
        })
        .catch((error) => {
          if (__DEV__) console.warn("Custom categories load failed:", error);
        })
        .finally(() => {
          setIsReady(true);
        }),
    []
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (
      name: string,
      icon: string,
      defaultBucket: BudgetBucket
    ): Promise<CategoryMutationResult> => {
      const result = await addCustomCategory(name, icon, defaultBucket);
      if (result.ok) setCustomCategories(result.categories);
      return result;
    },
    []
  );

  const update = useCallback(
    async (
      id: string,
      patch: { name?: string; icon?: string; defaultBucket?: BudgetBucket }
    ): Promise<CategoryMutationResult> => {
      const result = await updateCustomCategory(id, patch);
      if (result.ok) setCustomCategories(result.categories);
      return result;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    setCustomCategories(await deleteCustomCategory(id));
  }, []);

  const restore = useCallback(
    async (category: CustomCategory): Promise<CategoryMutationResult> => {
      const result = await restoreCustomCategory(category);
      if (result.ok) setCustomCategories(result.categories);
      return result;
    },
    []
  );

  const value = useMemo<CustomCategoriesContextValue>(
    () => ({ customCategories, isReady, refresh, add, update, remove, restore }),
    [customCategories, isReady, refresh, add, update, remove, restore]
  );

  return (
    <CustomCategoriesContext.Provider value={value}>
      {children}
    </CustomCategoriesContext.Provider>
  );
};

export const useCustomCategories = (): CustomCategoriesContextValue => {
  const ctx = useContext(CustomCategoriesContext);
  if (!ctx) {
    throw new Error(
      "useCustomCategories must be used within CustomCategoriesProvider"
    );
  }
  return ctx;
};
