/**
 * BudgetArk - Norske tekster: pakket data (guides)
 * File: src/i18n/locales/nb/dataGuides.ts
 *
 * Norwegian (Bokmål) counterpart of en/dataGuides.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary. Provider UI
 * labels (Get Started, New Connection, Sign In, Development ...) stay in
 * English because that is what the user sees on the provider's site.
 */

import type { Localized } from "../types";
import type { dataGuides as en } from "../en/dataGuides";

export const dataGuides: Localized<typeof en> = {
  simplefin: {
    tagline:
      "Anbefalt: én innlimt token kobler til Chase og tusenvis av amerikanske banker og kort. Skrivebeskyttet, åpen registrering.",
    cost: "Omtrent 1,50 $/måned eller 15 $/år, fakturert av SimpleFIN - ikke BudgetArk.",
    steps: {
      account: {
        title: "Opprett SimpleFIN Bridge-kontoen din",
        detail:
          "Åpne beta-bridge.simplefin.org, trykk på Get Started og skriv inn e-postadressen din. SimpleFIN sender deg en innloggingslenke på e-post - åpne den og godta vilkårene.",
      },
      subscribe: {
        title: "Abonner",
        detail:
          "SimpleFIN er en liten betalingstjeneste (omtrent 1,50 $/måned eller 15 $/år). Du må abonnere før du kan legge til din første bank.",
      },
      connectBank: {
        title: "Koble til banken(e) dine",
        detail:
          "I dashbordet åpner du Financial Institutions, velger New Connection, finner banken din og logger inn via dens sikre side. Legg til så mange du vil.",
      },
      token: {
        title: "Opprett en setup-token",
        detail:
          "Velg New App (kall den 'BudgetArk' hvis du blir spurt) og kopier setup-tokenen som vises - en lang rekke bokstaver og tall.",
      },
      paste: {
        title: "Lim den inn i BudgetArk",
        detail:
          "Kom tilbake hit, lim tokenen inn i feltet og trykk på Koble til. BudgetArk tar seg av resten.",
      },
    },
    tips: {
      singleUse:
        "Setup-tokenen er til engangsbruk: når BudgetArk har brukt den, kan den ikke limes inn noe annet sted. Hvis den noen gang svikter, bare lag en ny.",
      readOnly:
        "SimpleFIN er skrivebeskyttet - det kan se saldoer og transaksjoner, aldri flytte penger.",
      daily:
        "Det oppdateres omtrent én gang om dagen, så helt nye transaksjoner kan ta opptil 24 timer før de dukker opp.",
    },
    privacy: {
      headline: "Nei - SimpleFIN selger ikke dataene dine og viser ingen reklame.",
      points: {
        noSell: "Selger ikke dataene dine og bruker dem ikke til reklame eller markedsføring.",
        noCredentials:
          "Lagrer aldri det faktiske brukernavnet eller passordet ditt til banken - de blir mellom deg og banken din.",
        sharing:
          "Deler data bare med de tjenesteleverandørene som trengs for å nå banken din, pluss standardunntakene alle selskaper har: når loven krever det, eller hvis selskapet noen gang blir solgt.",
      },
    },
  },
  teller: {
    tagline:
      "100 gratis banktilkoblinger - men bare hvis du allerede har (eller kan be om) en Teller-utviklerkonto.",
    cost: "Gratis for opptil 100 tilkoblinger (Tellers Development-nivå). Nye kontoer gis for øyeblikket bare på forespørsel.",
    steps: {
      account: {
        title: "Få en Teller-utviklerkonto",
        detail:
          "Teller har ingen åpen registrering akkurat nå - teller.io tilbyr bare Sign In. Hvis du ikke allerede har en konto, send e-post til support@teller.io og be om en utviklerkonto for en personlig budsjettapp, eller bruk SimpleFIN i stedet (åpen registrering, fungerer i dag).",
      },
      certificate: {
        title: "Last ned sertifikatet og nøkkelen din",
        detail:
          "Når kontoen din er opprettet, gir Teller deg et sertifikat og en privat nøkkel (to .pem-filer) som beviser at forespørslene kommer fra appen din. Last dem ned fra dashbordet, og pakk dem ut hvis de kommer zippet.",
      },
      appId: {
        title: "Kopier Application ID-en din",
        detail: "Kopier Application ID-en din fra Teller-dashbordet. Den begynner med 'app_'.",
      },
      environment: {
        title: "Bruk miljøet Development",
        detail:
          "For å koble til ekte banker gratis velger du Development (100 gratis tilkoblinger). Sandbox er bare oppdiktede testdata; Production er for betalte apper i stor skala.",
      },
      enterDetails: {
        title: "Skriv inn opplysningene dine i BudgetArk",
        detail:
          "Lim inn Application ID-en din, la miljøet stå på Development og importer begge .pem-filene - sertifikatet og den private nøkkelen.",
      },
      connectBank: {
        title: "Koble til banken din",
        detail:
          "Trykk på Åpne Teller Connect og logg inn på banken din i Tellers sikre vindu. Bankinnloggingen din går til Teller, aldri til BudgetArk.",
      },
    },
    tips: {
      noAccount:
        "Ingen Teller-konto og ikke noe svar fra supporten? SimpleFIN er den enklere veien - åpen registrering, omtrent 1,50 $/måned, og den dekker tusenvis av amerikanske banker.",
      development:
        "La miljøet stå på Development med mindre Teller uttrykkelig har sagt noe annet - det er gratisnivået for ekte banker.",
      storedLocally:
        "Sertifikatet og nøkkelen din lagres kryptert kun på denne enheten og forlater den aldri.",
      readOnly:
        "Teller er skrivebeskyttet her - det leser saldoer og transaksjoner, det kan ikke flytte penger.",
    },
    privacy: {
      headline: "Nei - Tellers retningslinjer sier uttrykkelig at de ikke selger dataene dine.",
      points: {
        noSell:
          "Sier det rett ut: «We do not sell your End User Personal Data.» (Vi selger ikke personopplysningene dine som sluttbruker.)",
        noMarketing:
          "Deler ikke informasjonen din for markedsføring - verken sin egen, sine partneres eller utenforstående selskapers.",
        sharing:
          "Deler kontodataene dine med appen du kobler til (det er BudgetArk, på telefonen din) og leverandørene som trengs for å drive tjenesten, pluss standardunntakene ved lovkrav / salg av selskapet.",
      },
    },
  },
};
