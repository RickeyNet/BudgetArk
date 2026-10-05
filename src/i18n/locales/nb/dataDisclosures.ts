/**
 * BudgetArk - Norske tekster: pakket data (disclosures)
 * File: src/i18n/locales/nb/dataDisclosures.ts
 *
 * Norwegian (Bokmål) counterpart of en/dataDisclosures.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary. The three
 * disclosures are rule-4 consent copy: sentence for sentence the same
 * meaning as the English, no softer and no stronger. Re-check both files
 * together when either changes.
 */

import type { Localized } from "../types";
import type { dataDisclosures as en } from "../en/dataDisclosures";

export const dataDisclosures: Localized<typeof en> = {
  mission: {
    eyebrow: "VÅRT OPPDRAG",
    title: "Hvorfor jeg laget BudgetArk",
    body: "Jeg ville være proaktiv med økonomien min, få kontroll på den og begynne å forberede meg på fremtiden, uten å gi opp personvernet mitt eller betale for enda et abonnement. Jeg trengte gjeldsnedbetaling, månedsbudsjett og et klart bilde av veien videre i én frakoblet app som blir på enheten din og ikke går noe annet sted. Jeg laget BudgetArk for å hjelpe deg med å gjøre det samme, uten kostnad for deg.",
    invite:
      "Jeg vil at dette skal føles som ditt. Har du en idé til appen - en funksjon, en feilretting, til og med et nytt tema - ta kontakt via Send tilbakemelding på Profil-fanen. Jeg leser hver melding.",
  },
  learningDisclaimer:
    "BudgetArks leksjoner gjenspeiler én apps tilnærming til personlig økonomi. Forfatteren er ikke autorisert finansrådgiver, regnskapsfører eller advokat. Dette er generell opplæring og meninger, ikke råd for din situasjon. Snakk med en kvalifisert fagperson før store beslutninger.",
  connections: {
    title: "Før du kobler til",
    intro:
      "Banktilkoblinger snakker med finansleverandørene dine direkte fra denne enheten. Her er nøyaktig hva det betyr:",
    points: {
      credentials:
        "Innloggingsopplysningene dine (en SimpleFIN-token eller Teller-sertifikatet ditt) lagres kryptert kun på denne enheten. De synkes aldri til en sammenkoblet partner og berører aldri en BudgetArk-server - BudgetArk har ingen.",
      direct:
        "For å hente saldoer og transaksjoner kobler denne enheten seg direkte til SimpleFIN eller Teller. Disse leverandørene ser at forespørslene kommer fra deg, ikke fra BudgetArk.",
      inbox:
        "Importerte transaksjoner venter i en gjennomgangsinnboks. Ingenting kommer inn i budsjettet ditt før du godkjenner det - med mindre du lagrer en «godkjenn alltid»-regel for en forhandler du stoler på, som du kan endre eller slette når som helst.",
      remove:
        "Du kan fjerne en tilkobling når som helst. Innloggingsopplysningene slettes fra denne enheten, og poster du allerede har godkjent, blir i budsjettet ditt.",
    },
  },
  exchangeRates: {
    title: "Før vi henter en kurs",
    intro:
      "Omregning av beløpene dine bruker dagens valutakurs. Her er nøyaktig hva som forlater enheten din:",
    points: {
      request:
        "Denne enheten ber om dagens offentlige kurstabell fra en gratis valutakurstjeneste (open.er-api.com). Forespørselen inneholder ingen konto, ingen beløp og ingen identitet - det er samme tabell som alle får.",
      onDevice:
        "Saldoene og postene dine regnes om på denne enheten. Ingenting om økonomien din sendes noe sted.",
      fallback:
        "Hvis tjenesten ikke kan nås, faller BudgetArk tilbake på de sist lagrede kursene, deretter på et innebygd estimat - du ser hvilken som ble brukt før du bekrefter.",
    },
  },
  holdings: {
    title: "Før du slår på dette",
    intro: "Beholdning i sanntid sender litt data fra enheten din. Her er nøyaktig hva:",
    points: {
      stored:
        "Tickersymbolene dine og antall andeler lagres på denne enheten og synkes til den sammenkoblede partneren din, akkurat som kontoene dine.",
      symbolsOnly:
        "For å vise kurser sendes bare tickersymbolene dine til BudgetArks kurstjeneste omtrent én gang om dagen. Antall andeler, saldoene og identiteten din sendes aldri.",
      thirdParty: "Kursene kommer fra en tredjeparts leverandør av markedsdata.",
    },
  },
};
