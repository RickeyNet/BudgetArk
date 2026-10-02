/**
 * BudgetArk - Norske tekster: rene hjelpefunksjoner (notifications)
 * File: src/i18n/locales/nb/helpersNotifications.ts
 *
 * Norwegian (Bokmål) counterpart of en/helpersNotifications.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary.
 *
 * Security rule 11 applies here exactly as in English: lock-screen copy
 * stays free of amounts, account or card names, balances and counts.
 */

import type { Localized } from "../types";
import type { helpersNotifications as en } from "../en/helpersNotifications";

export const helpersNotifications: Localized<typeof en> = {
  tracking: {
    channel: {
      name: "Utgiftsavstemminger",
      description: "Vennlige påminnelser om å fortsette å logge forbruket ditt",
    },
    checkIn: {
      quick: {
        title: "Tid for en rask avstemming",
        body: "Har du et minutt? Logg det siste forbruket ditt mens det er friskt i minnet.",
      },
      onCourse: {
        title: "Hold arken din på rett kurs",
        body: "Noter eventuelle utgifter fra de siste dagene.",
      },
      expense: {
        title: "Rask utgiftsavstemming",
        body: "Noe forbruk å logge? Det tar bare et øyeblikk.",
      },
      tidyLedger: {
        title: "En ryddig loggbok bygger en solid ark",
        body: "Legg til de siste utgiftene dine så budsjettet stemmer.",
      },
      drift: {
        title: "Ikke la forbruket drive forbi",
        body: "Bruk 30 sekunder på å logge alt du har brukt.",
      },
    },
    monthStart: {
      newMonth: {
        title: "En ny måned begynner",
        body: "Sett budsjettmålene for måneden og se hvordan forrige måned gikk.",
      },
      chartCourse: {
        title: "Sett kursen for måneden",
        body: "Se tilbake på forrige måneds forbruk og sett målene dine for måneden som kommer.",
      },
      freshStart: {
        title: "Ny måned, ny start",
        body: "Bruk noen minutter på å planlegge månedens budsjett og sjekke forrige måneds oversikt.",
      },
    },
  },
  keepAlive: {
    channel: {
      name: "Kortaktivitetspåminnelser",
      description:
        "Vennlige påminnelser om å bruke et overvåket kredittkort før utstederen stenger det på grunn av inaktivitet",
    },
    messages: {
      activity: {
        title: "Et kort kunne trengt litt aktivitet",
        body: "Et av kredittkortene dine har ikke vært i bruk på en stund. Et lite kjøp holder det aktivt.",
      },
      afloat: {
        title: "Hold kredittrammen din flytende",
        body: "Et ubrukt kort kan bli stengt av utstederen. Åpne BudgetArk for å se hvilket som trenger et raskt kjøp.",
      },
      quickCheck: {
        title: "Rask kortsjekk",
        body: "Et kort du overvåker, nærmer seg fristen for inaktivitet. Et kjøp på størrelse med en kaffe nullstiller klokken.",
      },
    },
  },
};
