/**
 * BudgetArk - Norske tekster: rene hjelpefunksjoner (diverse)
 * File: src/i18n/locales/nb/helpersMisc.ts
 *
 * Norwegian (Bokmål) counterpart of en/helpersMisc.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { helpersMisc as en } from "../en/helpersMisc";

export const helpersMisc: Localized<typeof en> = {
  dates: {
    unknownDate: "Ukjent dato",
  },
  syncActivity: {
    nothingNew: "ingenting nytt",
    removed: "({{n}} fjernet)",
    collections: {
      budgetEntries_one: "{{count}} post",
      budgetEntries_other: "{{count}} poster",
      payments_one: "{{count}} betaling",
      payments_other: "{{count}} betalinger",
      debts_one: "{{count}} gjeldspost",
      debts_other: "{{count}} gjeldsposter",
      savingsGoals_one: "{{count}} sparemål",
      savingsGoals_other: "{{count}} sparemål",
      assetAccounts_one: "{{count}} konto",
      assetAccounts_other: "{{count}} kontoer",
      holdings_one: "{{count}} beholdning",
      holdings_other: "{{count}} beholdninger",
      budgetLimits_one: "{{count}} grense",
      budgetLimits_other: "{{count}} grenser",
      monthStartBalances_one: "{{count}} inngående saldo",
      monthStartBalances_other: "{{count}} inngående saldoer",
      customCategories_one: "{{count}} kategori",
      customCategories_other: "{{count}} kategorier",
      businesses_one: "{{count}} bedrift",
      businesses_other: "{{count}} bedrifter",
      people_one: "{{count}} person",
      people_other: "{{count}} personer",
      dismissedTransactions_one: "{{count}} overhoppet transaksjon",
      dismissedTransactions_other: "{{count}} overhoppede transaksjoner",
      netWorthSnapshots_one: "{{count}} øyeblikksbilde av nettoformuen",
      netWorthSnapshots_other: "{{count}} øyeblikksbilder av nettoformuen",
    },
  },
  validation: {
    tooLong: "Hold det under {{max}} tegn.",
    alreadyExists: "«{{name}}» finnes allerede.",
  },
  categories: {
    nameRequired: "Skriv inn et kategorinavn.",
    builtIn: "«{{name}}» er allerede en innebygd kategori.",
    limit: "Du kan ha opptil {{max}} egne kategorier.",
    notFound: "Fant ikke kategorien.",
  },
  people: {
    nameRequired: "Skriv inn et navn.",
    limit: "Du kan ha opptil {{max}} personer.",
    notFound: "Fant ikke personen.",
  },
  businesses: {
    nameRequired: "Skriv inn et bedriftsnavn.",
    limit: "Du kan ha opptil {{max}} bedrifter.",
    notFound: "Fant ikke bedriften.",
  },
  pin: {
    incorrect: "Feil PIN-kode - prøv igjen",
  },
  connections: {
    keystoreUnavailable:
      "Denne enheten kan ikke lagre bankopplysninger sikkert (sikker nøkkellagring er utilgjengelig), så tilkoblingen ble ikke lagret. Dette kan ramme rootede eller sidelastede installasjoner.",
    credentialsMissing:
      "Tilkoblingens lagrede innloggingsopplysninger mangler. Fjern den og legg den til igjen.",
    syncFailed: "Noe gikk galt under synkingen av denne tilkoblingen.",
    teller: {
      appIdRequired: "Skriv inn Teller-applikasjons-id-en din først.",
      badPemFiles:
        "De filene ser ikke ut som certificate.pem og private_key.pem fra teller.zip-filen din.",
      listAccountsFailed: "Teller er tilkoblet, men kontoene kunne ikke hentes.",
      authRejected:
        "Teller avviste tilkoblingens innloggingsopplysninger. Koble til banken på nytt for å fortsette synkingen.",
      rateLimited: "Tellers grense for antall forespørsler er nådd. Prøv igjen senere.",
      unexpectedResponse: "Teller ga et uventet svar (HTTP {{status}}).",
      certificateRefused:
        "Teller avviste klientsertifikatet. Importer sertifikatet og nøkkelen fra teller.zip-filen din på nytt.",
      unreachable: "Fikk ikke kontakt med Teller. Sjekk tilkoblingen din og prøv igjen.",
      unparsable: "Svaret fra Teller kunne ikke tolkes.",
      noEnrollments: "Ingen Teller-registreringer enda. Koble til en bank via Teller først.",
    },
    simplefin: {
      tokenRequired: "Lim inn SimpleFIN-oppsettstokenet ditt først.",
      tokenInvalid:
        "Det ser ikke ut som et SimpleFIN-oppsettstoken. Kopier hele tokenet fra SimpleFIN Bridge-appsiden din og prøv igjen.",
      tokenUsed:
        "Det tokenet fungerte ikke - SimpleFIN-tokener kan bare brukes én gang, så lag et nytt i SimpleFIN Bridge og lim det inn her.",
      paymentRequired:
        "SimpleFIN Bridge sier at betaling kreves. Sjekk abonnementet ditt på bridge.simplefin.org og prøv igjen.",
      unexpectedResponse: "SimpleFIN ga et uventet svar (HTTP {{status}}).",
      accessUrlUnreadable: "SimpleFIN sendte en tilgangs-URL som BudgetArk ikke kunne lese.",
      accessUrlMalformed:
        "Den lagrede SimpleFIN-tilgangs-URL-en er ugyldig. Fjern tilkoblingen og legg den til igjen.",
      authRejected: "SimpleFIN avviste tilkoblingens innloggingsopplysninger.",
      rateLimited: "SimpleFINs daglige grense for forespørsler er nådd. Prøv igjen senere.",
      unreachable: "Fikk ikke kontakt med SimpleFIN. Sjekk tilkoblingen din og prøv igjen.",
    },
  },
  sync: {
    notPaired: "Ikke sammenkoblet med noen partner",
  },
};
