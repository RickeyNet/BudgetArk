/**
 * BudgetArk — UUID Utility
 * File: src/utils/uuid.ts
 *
 * Cryptographically strong UUID v4 generator via the `uuid` package,
 * which uses crypto.getRandomValues() under the hood.
 */

import { v4 } from "uuid";

export const generateUUID = (): string => v4();
