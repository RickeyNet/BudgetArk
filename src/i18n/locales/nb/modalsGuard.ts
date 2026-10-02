/**
 * BudgetArk - Norske tekster: felles modaler (guard)
 * File: src/i18n/locales/nb/modalsGuard.ts
 *
 * Norwegian (Bokmål) counterpart of en/modalsGuard.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { modalsGuard as en } from "../en/modalsGuard";

export const modalsGuard: Localized<typeof en> = {
  pairing: {
    title: "Koble sammen med partner",
    subtitle: "Begge enhetene må være på samme wifi-nettverk.",
    roles: {
      show: {
        title: "Vis kode",
        hint: "Lag en kode som partneren din skriver inn",
      },
      enter: {
        title: "Skriv inn kode",
        hint: "Skriv inn koden fra partnerens enhet",
      },
    },
    portHint:
      "Port: {{port}} - finn IP-adressen din i wifi-innstillingene\nog del IP:{{port}} med partneren din",
    waiting: "Venter på partner... {{seconds}} s",
    connecting: "Kobler til...",
    connect: "Koble til",
    discovery: {
      useAutomatic: "Bruk automatisk søk",
      enterManually: "Finner du ikke enheten? Skriv inn IP manuelt",
    },
    verify: {
      heading: "Bekreft partneren din",
      hint: "Begge enhetene skal vise samme kode under. Hvis ikke, avbryt og prøv å koble sammen igjen.",
      match: "Kodene stemmer - fullfør sammenkoblingen",
      mismatch: "Kodene stemmer ikke",
    },
    errors: {
      timedOut: "Sammenkoblingen tok for lang tid. Prøv igjen.",
      failed: "Sammenkoblingen mislyktes",
      codeLength: "Skriv inn koden på {{length}} tegn fra partnerens enhet.",
      invalidAddress: "Skriv inn en gyldig adresse (f.eks. 192.168.1.5:12345)",
      connectFailed: "Kunne ikke koble til",
      keystoreUnavailable:
        "BudgetArk kunne ikke lagre sammenkoblingsnøkkelen sikkert på denne enheten (sikker nøkkellagring utilgjengelig). Ingenting ble lagret - prøv igjen etter å ha startet appen på nytt.",
      saveFailed: "Kunne ikke lagre sammenkoblingen",
    },
  },
  backup: {
    title: "Automatiske sikkerhetskopier",
    closeA11y: "Lukk automatiske sikkerhetskopier",
    intro:
      "BudgetArk kan i stillhet lagre en kryptert kopi av dataene dine i sitt eget lagringsområde på denne telefonen, så en dårlig import eller en utilsiktet sletting aldri blir slutten på historien.",
    toggleLabel: "Automatiske sikkerhetskopier",
    statusOn: "{{cadence}}, de 3 siste beholdes",
    statusOff: "Av - bare manuelle sikkerhetskopier",
    cadence: {
      weekly: "Ukentlig",
      monthly: "Månedlig",
    },
    cadenceA11y: "Ta sikkerhetskopi {{cadence}}",
    backUpNow: "Ta sikkerhetskopi nå",
    backedUpNow: "Sikkerhetskopiert akkurat nå.",
    sectionTitle: "SIKKERHETSKOPIER PÅ DENNE TELEFONEN",
    empty: {
      base: "Ingen sikkerhetskopier ennå.",
      enabled: " Den første skrives automatisk, eller trykk på Ta sikkerhetskopi nå.",
      disabled: " Slå på automatiske sikkerhetskopier, eller trykk på Ta sikkerhetskopi nå.",
    },
    mostRecent: "Nyeste",
    olderBackup: "Eldre sikkerhetskopi",
    restore: "Gjenopprett",
    restoreHint:
      "Slå sammen legger til det som mangler og beholder nyere endringer. Erstatt sletter det som er på telefonen nå og gjenoppretter nøyaktig denne sikkerhetskopien.",
    merge: "Slå sammen",
    replace: "Erstatt",
    restored: {
      title: "Sikkerhetskopi gjenopprettet",
      summary: "Gjenopprettet {{parts}}.",
    },
    errors: {
      loadSettings:
        "Kunne ikke laste inn innstillingene for sikkerhetskopier. Lukk og åpne igjen for å prøve på nytt.",
      saveSetting: "Kunne ikke lagre innstillingen. Prøv igjen.",
      write:
        "Kunne ikke skrive sikkerhetskopien. Hvis dette fortsetter, kan telefonens sikre lagring være utilgjengelig.",
      unreadable:
        "Sikkerhetskopien kunne ikke leses. Den kan være skadet, eller den ble laget før appens krypteringsnøkkel ble endret.",
      restoreFailed: "Noe gikk galt under gjenopprettingen.",
    },
  },
  lock: {
    title: "Applås",
    closeA11y: "Lukk applåsinnstillingene",
    menuNote: "Applåsen er på - BudgetArk ber om den {{digits}}-sifrede PIN-koden din når appen åpnes.",
    changePin: "Endre PIN-kode",
    turnOff: "Slå av applåsen",
    steps: {
      verify: "Skriv inn gjeldende PIN-kode",
      confirm: "Skriv inn den nye PIN-koden igjen",
      change: "Velg en ny PIN-kode",
      choose: "Velg en PIN-kode",
    },
    lockedOut: "For mange forsøk - prøv igjen om {{remaining}}",
    newHint: "{{min}}-{{max}} sifre, trykk så på ✓",
    confirmHint: "Samme sifre, en gang til",
    saving: "Lagrer...",
    privacyNote:
      "PIN-koden din blir på denne telefonen - den blir aldri sikkerhetskopiert, eksportert eller synket til partneren din. Glemmer du den, må du installere appen på nytt og gjenopprette fra en sikkerhetskopi.",
    mismatch: "PIN-kodene stemte ikke - velg PIN-kode igjen",
    digitsRange: "Bruk {{min}}-{{max}} sifre",
    results: {
      on: {
        title: "Applås på",
        message:
          "BudgetArk ber om PIN-koden din når appen åpnes. PIN-koden blir bare på denne telefonen - glemmer du den, må du installere appen på nytt og gjenopprette fra en sikkerhetskopi.",
      },
      changed: {
        title: "PIN-kode endret",
        message: "Den nye PIN-koden gjelder neste gang appen låses.",
      },
      off: {
        title: "Applås av",
        message: "BudgetArk åpnes uten å be om PIN-kode.",
      },
    },
    errors: {
      savePin: "Kunne ikke lagre PIN-koden. Prøv igjen.",
      disable: "Kunne ikke slå av applåsen. Prøv igjen.",
    },
    gate: {
      title: "BudgetArk er låst",
      enterPin: "Skriv inn PIN-koden din",
      forgot: "Glemt PIN-koden?",
      forgotA11y: "Hjelp ved glemt PIN-kode",
      forgotMessage:
        "PIN-koden din lagres bare på denne telefonen og kan ikke gjenopprettes eller nullstilles herfra.\n\nFor å bruke BudgetArk igjen må du slette appen og installere den på nytt. Det sletter dataene på denne telefonen, så gjenopprett deretter fra en sikkerhetskopifil - eller synk fra partnerens enhet hvis dere er sammenkoblet.",
    },
  },
  pin: {
    dotsA11y: "{{entered}} av {{total}} PIN-sifre skrevet inn",
    confirmA11y: "Bekreft PIN-kode",
    deleteA11y: "Slett siste siffer",
    digitA11y: "Siffer {{digit}}",
  },
  feedback: {
    title: "Send tilbakemelding",
    subtitle: "Rapporter en feil eller foreslå en funksjon.",
    types: {
      bug: "Feilrapport",
      feature: "Funksjonsidé",
    },
    prompt: {
      bug: "HVA SKJEDDE?",
      feature: "HVA VIL DU GJERNE SE?",
    },
    placeholder: {
      bug: "Beskriv feilen - hva du forventet og hva som skjedde...",
      feature: "Beskriv funksjonen du ønsker deg...",
    },
    autoAttached: "LEGGES VED AUTOMATISK",
    sendEmail: "Send via e-post",
    openGithub: "Åpne GitHub Issues",
    chooseApp: "Velg e-postapp",
    thanks: {
      title: "Takk!",
      message: "Tilbakemeldingen din gjør BudgetArk bedre.",
    },
    noEmailApp: {
      title: "Ingen e-postapp",
      message:
        "Fant ingen e-postapp. Du kan sende tilbakemelding til {{email}} eller opprette en sak på GitHub.",
    },
    linkFailed: {
      title: "Kunne ikke åpne lenken",
      message: "Gå til {{url}} i nettleseren for å opprette en sak.",
    },
    template: {
      bug: {
        whatHappened: "HVA SKJEDDE",
        steps: "TRINN FOR Å GJENSKAPE",
        expected: "HVA JEG FORVENTET I STEDET",
        howOften: "HVOR OFTE SKJER DET? (hver gang / noen ganger / én gang)",
        screenshots: "SKJERMBILDER (legg ved under hvis du har noen)",
      },
      feature: {
        idea: "FUNKSJONSIDÉ",
        problem: "HVILKET PROBLEM VILLE DETTE LØST FOR DEG?",
        howItWorks: "HVORDAN BØR DET FUNGERE?",
      },
    },
  },
};
