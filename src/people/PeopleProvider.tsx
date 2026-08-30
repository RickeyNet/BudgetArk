/**
 * BudgetArk - People & Businesses Provider
 * File: src/people/PeopleProvider.tsx
 *
 * Global context owning the two "who / what for" tag lists - people
 * (whose spending) and businesses (client / side-gig tagging) - so the
 * Budget screen, the connection modals, the manage sheets and the reports
 * read one reactive source instead of each re-reading storage on every
 * focus/open (seven call sites did). Mirrors CustomCategoriesProvider,
 * plus a dataChangeNotifier subscription: both lists partner-sync and
 * import, so a background merge must refresh every consumer at once.
 *
 * Both live and tombstoned records are kept: pickers want the live list,
 * the reports want deleted names to still resolve on old entries.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Business, Person } from "../types";
import {
  addPerson as addPersonInStore,
  deletePerson as deletePersonInStore,
  getPeopleIncludingDeleted,
  restorePerson as restorePersonInStore,
  updatePerson as updatePersonInStore,
  type PersonMutationResult,
} from "../storage/personStorage";
import {
  addBusiness as addBusinessInStore,
  deleteBusiness as deleteBusinessInStore,
  getBusinessesIncludingDeleted,
  restoreBusiness as restoreBusinessInStore,
  updateBusiness as updateBusinessInStore,
  type BusinessMutationResult,
} from "../storage/businessStorage";
import { subscribeDataChanged } from "../storage/dataChangeNotifier";

interface PeopleContextValue {
  people: Person[];
  peopleIncludingDeleted: Person[];
  businesses: Business[];
  businessesIncludingDeleted: Business[];
  isReady: boolean;
  refresh: () => Promise<void>;
  addPerson: (name: string) => Promise<PersonMutationResult>;
  updatePerson: (id: string, patch: { name?: string }) => Promise<PersonMutationResult>;
  deletePerson: (id: string) => Promise<void>;
  restorePerson: (id: string) => Promise<void>;
  addBusiness: (name: string) => Promise<BusinessMutationResult>;
  updateBusiness: (id: string, patch: { name?: string }) => Promise<BusinessMutationResult>;
  deleteBusiness: (id: string) => Promise<void>;
  restoreBusiness: (id: string) => Promise<void>;
}

const PeopleContext = createContext<PeopleContextValue | null>(null);

const live = <T extends { deletedAt?: string }>(records: T[]): T[] =>
  records.filter((record) => !record.deletedAt);

export const PeopleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [peopleIncludingDeleted, setPeopleIncludingDeleted] = useState<Person[]>([]);
  const [businessesIncludingDeleted, setBusinessesIncludingDeleted] = useState<Business[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Promise-chain form to satisfy react-hooks/set-state-in-effect (see the
  // note in CustomCategoriesProvider) - behaviourally async/await.
  const refresh = useCallback(
    (): Promise<void> =>
      Promise.all([getPeopleIncludingDeleted(), getBusinessesIncludingDeleted()])
        .then(([people, businesses]) => {
          setPeopleIncludingDeleted(people);
          setBusinessesIncludingDeleted(businesses);
        })
        .catch((error) => {
          if (__DEV__) console.warn("People/businesses load failed:", error);
        })
        .finally(() => {
          setIsReady(true);
        }),
    []
  );

  useEffect(() => {
    void refresh();
    // Partner sync, bank sync and import all write these collections behind
    // the UI; re-read so every picker reflects the merge immediately.
    return subscribeDataChanged(() => {
      void refresh();
    });
  }, [refresh]);

  const addPerson = useCallback(
    async (name: string) => {
      const result = await addPersonInStore(name);
      if (result.ok) await refresh();
      return result;
    },
    [refresh]
  );
  const updatePerson = useCallback(
    async (id: string, patch: { name?: string }) => {
      const result = await updatePersonInStore(id, patch);
      if (result.ok) await refresh();
      return result;
    },
    [refresh]
  );
  const deletePerson = useCallback(
    async (id: string) => {
      await deletePersonInStore(id);
      await refresh();
    },
    [refresh]
  );
  const restorePerson = useCallback(
    async (id: string) => {
      await restorePersonInStore(id);
      await refresh();
    },
    [refresh]
  );
  const addBusiness = useCallback(
    async (name: string) => {
      const result = await addBusinessInStore(name);
      if (result.ok) await refresh();
      return result;
    },
    [refresh]
  );
  const updateBusiness = useCallback(
    async (id: string, patch: { name?: string }) => {
      const result = await updateBusinessInStore(id, patch);
      if (result.ok) await refresh();
      return result;
    },
    [refresh]
  );
  const deleteBusiness = useCallback(
    async (id: string) => {
      await deleteBusinessInStore(id);
      await refresh();
    },
    [refresh]
  );
  const restoreBusiness = useCallback(
    async (id: string) => {
      await restoreBusinessInStore(id);
      await refresh();
    },
    [refresh]
  );

  const people = useMemo(() => live(peopleIncludingDeleted), [peopleIncludingDeleted]);
  const businesses = useMemo(
    () => live(businessesIncludingDeleted),
    [businessesIncludingDeleted]
  );

  const value = useMemo<PeopleContextValue>(
    () => ({
      people,
      peopleIncludingDeleted,
      businesses,
      businessesIncludingDeleted,
      isReady,
      refresh,
      addPerson,
      updatePerson,
      deletePerson,
      restorePerson,
      addBusiness,
      updateBusiness,
      deleteBusiness,
      restoreBusiness,
    }),
    [
      people,
      peopleIncludingDeleted,
      businesses,
      businessesIncludingDeleted,
      isReady,
      refresh,
      addPerson,
      updatePerson,
      deletePerson,
      restorePerson,
      addBusiness,
      updateBusiness,
      deleteBusiness,
      restoreBusiness,
    ]
  );

  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
};

const useCtx = (): PeopleContextValue => {
  const ctx = useContext(PeopleContext);
  if (!ctx) throw new Error("usePeople/useBusinesses must be used within PeopleProvider");
  return ctx;
};

/** People (whose spending) - live list, tombstones, and mutations. */
export const usePeople = () => {
  const { people, peopleIncludingDeleted, isReady, refresh, addPerson, updatePerson, deletePerson, restorePerson } =
    useCtx();
  return useMemo(
    () => ({ people, peopleIncludingDeleted, isReady, refresh, addPerson, updatePerson, deletePerson, restorePerson }),
    [people, peopleIncludingDeleted, isReady, refresh, addPerson, updatePerson, deletePerson, restorePerson]
  );
};

/** Businesses (client / side-gig tags) - live list, tombstones, and mutations. */
export const useBusinesses = () => {
  const {
    businesses,
    businessesIncludingDeleted,
    isReady,
    refresh,
    addBusiness,
    updateBusiness,
    deleteBusiness,
    restoreBusiness,
  } = useCtx();
  return useMemo(
    () => ({
      businesses,
      businessesIncludingDeleted,
      isReady,
      refresh,
      addBusiness,
      updateBusiness,
      deleteBusiness,
      restoreBusiness,
    }),
    [businesses, businessesIncludingDeleted, isReady, refresh, addBusiness, updateBusiness, deleteBusiness, restoreBusiness]
  );
};
