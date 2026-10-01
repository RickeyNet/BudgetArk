/**
 * BudgetArk - Svenska texter: rena hjälpfunktioner (övrigt)
 * File: src/i18n/locales/sv/helpersMisc.ts
 *
 * Swedish counterpart of en/helpersMisc.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { helpersMisc as en } from "../en/helpersMisc";

export const helpersMisc: Localized<typeof en> = {
  dates: {
    unknownDate: "Okänt datum",
  },
  syncActivity: {
    nothingNew: "inget nytt",
    removed: "({{n}} borttagna)",
    collections: {
      budgetEntries_one: "{{count}} post",
      budgetEntries_other: "{{count}} poster",
      payments_one: "{{count}} betalning",
      payments_other: "{{count}} betalningar",
      debts_one: "{{count}} skuld",
      debts_other: "{{count}} skulder",
      savingsGoals_one: "{{count}} sparmål",
      savingsGoals_other: "{{count}} sparmål",
      assetAccounts_one: "{{count}} konto",
      assetAccounts_other: "{{count}} konton",
      holdings_one: "{{count}} innehav",
      holdings_other: "{{count}} innehav",
      budgetLimits_one: "{{count}} gräns",
      budgetLimits_other: "{{count}} gränser",
      monthStartBalances_one: "{{count}} ingående saldo",
      monthStartBalances_other: "{{count}} ingående saldon",
      customCategories_one: "{{count}} kategori",
      customCategories_other: "{{count}} kategorier",
      businesses_one: "{{count}} företag",
      businesses_other: "{{count}} företag",
      people_one: "{{count}} person",
      people_other: "{{count}} personer",
      dismissedTransactions_one: "{{count}} överhoppad transaktion",
      dismissedTransactions_other: "{{count}} överhoppade transaktioner",
      netWorthSnapshots_one: "{{count}} ögonblicksbild av nettoförmögenheten",
      netWorthSnapshots_other: "{{count}} ögonblicksbilder av nettoförmögenheten",
    },
  },
  validation: {
    tooLong: "Högst {{max}} tecken.",
    alreadyExists: "”{{name}}” finns redan.",
  },
  categories: {
    nameRequired: "Ange ett kategorinamn.",
    builtIn: "”{{name}}” är redan en inbyggd kategori.",
    limit: "Du kan ha upp till {{max}} egna kategorier.",
    notFound: "Kategorin hittades inte.",
  },
  people: {
    nameRequired: "Ange ett namn.",
    limit: "Du kan ha upp till {{max}} personer.",
    notFound: "Personen hittades inte.",
  },
  businesses: {
    nameRequired: "Ange ett företagsnamn.",
    limit: "Du kan ha upp till {{max}} företag.",
    notFound: "Företaget hittades inte.",
  },
  pin: {
    incorrect: "Fel PIN-kod - försök igen",
  },
  connections: {
    keystoreUnavailable:
      "Den här enheten kan inte lagra bankuppgifter säkert (säker nyckellagring saknas), så kopplingen sparades inte. Det kan drabba rootade eller sidoladdade installationer.",
    credentialsMissing:
      "Kopplingens sparade inloggningsuppgifter saknas. Ta bort den och lägg till den igen.",
    syncFailed: "Något gick fel när kopplingen synkades.",
    teller: {
      appIdRequired: "Ange ditt Teller-applikations-id först.",
      badPemFiles:
        "De filerna ser inte ut som certificate.pem och private_key.pem från din teller.zip.",
      listAccountsFailed: "Teller är anslutet men kontona kunde inte hämtas.",
      authRejected:
        "Teller avvisade kopplingens inloggningsuppgifter. Anslut banken på nytt för att fortsätta synka.",
      rateLimited: "Tellers gräns för antal förfrågningar är nådd. Försök igen senare.",
      unexpectedResponse: "Teller gav ett oväntat svar (HTTP {{status}}).",
      certificateRefused:
        "Teller avvisade klientcertifikatet. Importera certifikatet och nyckeln från din teller.zip igen.",
      unreachable: "Kunde inte nå Teller. Kontrollera din uppkoppling och försök igen.",
      unparsable: "Svaret från Teller kunde inte tolkas.",
      noEnrollments: "Inga Teller-registreringar än. Anslut en bank via Teller först.",
    },
    simplefin: {
      tokenRequired: "Klistra in din SimpleFIN-setup-token först.",
      tokenInvalid:
        "Det ser inte ut som en SimpleFIN-setup-token. Kopiera hela token från din SimpleFIN Bridge-appsida och försök igen.",
      tokenUsed:
        "Den token fungerade inte - SimpleFIN-token kan bara användas en gång, så skapa en ny i SimpleFIN Bridge och klistra in den här.",
      paymentRequired:
        "SimpleFIN Bridge säger att betalning krävs. Kontrollera ditt abonnemang på bridge.simplefin.org och försök igen.",
      unexpectedResponse: "SimpleFIN gav ett oväntat svar (HTTP {{status}}).",
      accessUrlUnreadable: "SimpleFIN skickade en åtkomst-URL som BudgetArk inte kunde läsa.",
      accessUrlMalformed:
        "Den sparade SimpleFIN-åtkomst-URL:en är felaktig. Ta bort kopplingen och lägg till den igen.",
      authRejected: "SimpleFIN avvisade kopplingens inloggningsuppgifter.",
      rateLimited: "SimpleFIN:s dagliga gräns för förfrågningar är nådd. Försök igen senare.",
      unreachable: "Kunde inte nå SimpleFIN. Kontrollera din uppkoppling och försök igen.",
    },
  },
  sync: {
    notPaired: "Inte ihopkopplad med någon partner",
  },
};
