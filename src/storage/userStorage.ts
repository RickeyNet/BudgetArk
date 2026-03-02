/**
 * BudgetBuddy — User Storage Utility
 * File: src/storage/userStorage.ts
 *
 * Manages anonymous user accounts.
 * Users are identified by a UUID generated on first launch — no email,
 * phone number, or any personal information is required.
 *
 * Flow:
 * 1. On first app launch, getOrCreateUser() is called
 * 2. If no user exists in AsyncStorage, a new UUID is generated
 * 3. The user object is saved and returned
 * 4. On subsequent launches, the existing user is loaded
 *
 * This enables:
 * - Fully anonymous usage (no sign-up friction)
 * - Optional display name personalization
 * - Data tied to device (portable via future cloud sync)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateUUID } from "../utils/uuid";
import { UserAccount } from "../types";

/** Storage key for the user account */
const USER_KEY = "@budgetbuddy_user" as const;

/**
 * Retrieves the existing user account, or creates a new anonymous one.
 * This is the primary entry point — call it on app startup.
 *
 * @returns Promise<UserAccount> — the current user (existing or newly created)
 */
export const getOrCreateUser = async (): Promise<UserAccount> => {
  const raw = await AsyncStorage.getItem(USER_KEY);

  /* If user already exists, return it */
  if (raw) {
    return JSON.parse(raw) as UserAccount;
  }

  /* First launch — create anonymous account */
  const newUser: UserAccount = {
    id: generateUUID(),
    displayName: "Buddy",
    createdAt: new Date().toISOString(),
    onboardingComplete: false,
  };

  await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
  return newUser;
};

/**
 * Retrieves the current user account.
 * Returns null if no account exists (should not happen after first launch).
 *
 * @returns Promise<UserAccount | null>
 */
export const getUser = async (): Promise<UserAccount | null> => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

/**
 * Updates the user's display name.
 * Merges the new name into the existing user object.
 *
 * @param name — the new display name
 * @returns Promise<UserAccount> — the updated user
 */
export const updateDisplayName = async (
  name: string
): Promise<UserAccount> => {
  const user = await getOrCreateUser();
  const updated = { ...user, displayName: name.trim() || "Buddy" };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
  return updated;
};

/**
 * Marks the onboarding flow as complete.
 * Called after the user finishes the initial walkthrough.
 *
 * @returns Promise<UserAccount> — the updated user
 */
export const completeOnboarding = async (): Promise<UserAccount> => {
  const user = await getOrCreateUser();
  const updated = { ...user, onboardingComplete: true };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
  return updated;
};

/**
 * Deletes the user account and all associated data.
 * This is a full reset — the next launch will create a fresh account.
 *
 * WARNING: Destructive and irreversible.
 */
export const deleteAccount = async (): Promise<void> => {
  await AsyncStorage.removeItem(USER_KEY);
};
