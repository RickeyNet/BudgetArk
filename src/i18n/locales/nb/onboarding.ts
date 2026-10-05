/**
 * BudgetArk - Norske tekster: introduksjon (onboarding)
 * File: src/i18n/locales/nb/onboarding.ts
 *
 * Norwegian (Bokmål) counterpart of en/onboarding.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary. "Buddy" is
 * the stored default display name and stays as it is.
 */

import type { Localized } from "../types";
import type { onboarding as en } from "../en/onboarding";

export const onboarding: Localized<typeof en> = {
  stepOf: "STEG {{step}} AV {{total}}",
  skipSetup: "Hopp over oppsettet",
  next: "Neste →",
  back: "← Tilbake",
  skip: "Hopp over",
  mission: {
    footnote:
      "Gratis, ingen reklame, ingen konto - og dataene dine forlater aldri telefonen din. Du kan lese dette igjen når som helst øverst på Profil-fanen.",
  },
  theme: {
    title: "Velg temaet ditt",
    subtitle: "Velg et fargeskjema som passer stilen din. Du kan endre det senere i innstillingene.",
  },
  welcome: {
    title: "Velkommen til BudgetArk",
    subtitle: "Din følgesvenn for personlig økonomi - følg gjelden, styr budsjettet og bygg formue.",
    features: {
      debts: {
        title: "Gjeld",
        desc: "Følg hver gjeldspost, velg en nedbetalingsstrategi, følg milepælene i Bygg arken din - og hindre at ubrukte kredittkort blir stengt",
      },
      budget: {
        title: "Budsjett",
        desc: "Logg inntekter og utgifter per kategori, sett grenser, automatiser gjentakende regninger og godkjenn bankimporter i gjennomgangsinnboksen",
      },
      bridge: {
        title: "Broen",
        desc: "Hjemfanen din: nettoformue over tid, alle kontoene dine, kjøpsplaner og valgfri aksjeovervåking i sanntid",
      },
      charts: {
        title: "Sjøkart",
        desc: "Et gratis økonomikurs med 24 leksjoner, kalkulatorer og hva om-projeksjoner bygget på dine egne tall",
      },
      profile: {
        title: "Profil",
        desc: "Temaer, banktilkoblinger, partnersynk, sikkerhetskopier - og den søkbare introduksjonen når du trenger den",
      },
      privacy: {
        title: "Privat fra bunnen av",
        desc: "Alt krypteres på denne telefonen. BudgetArk har ingen server - de økonomiske dataene dine forlater aldri enheten din",
      },
    },
  },
  template: {
    title: "Starte fra en mal?",
    subtitle:
      "Velg den som passer best, så setter BudgetArk kategorigrenser og de to største gjentakende linjene dine for deg. Alle tall kan endres - det er et første utkast, ikke en lås.",
    startEmpty: {
      title: "Start tomt",
      tagline: "Ingen grenser eller linjer - bygg det opp etter hvert",
    },
    incomeLabel: "NETTOLØNN PER MÅNED (HUSHOLDNINGEN)",
    incomePlaceholder: "f.eks. 4200",
    housingLabel: "HUSLEIE ELLER BOLIGLÅN",
    housingPlaceholder: "f.eks. 1400",
    hint: "Begge er valgfrie. Grensene settes som en andel av nettolønnen; la det stå tomt, så kan du fylle dem inn senere under Grenser på Budsjett-fanen. Lagres bare på denne telefonen.",
    startEmptyNext: "Start tomt →",
  },
  reminders: {
    title: "Vil du ha et puff for å fortsette å logge?",
    subtitle: "Budsjetter fungerer når loggevanen sitter. BudgetArk kan sende to typer milde påminnelser - og ingenting annet.",
    checkins: {
      title: "Avstemminger når det blir stille",
      desc: "Et kort «hvordan går uka?» hvis det går noen dager uten en post. Logger du jevnlig, hører du aldri fra den.",
    },
    monthStart: {
      title: "Et hint den 1.",
      desc: "Ett varsel i starten av hver måned for å sette mål og ta en kikk på forrige måned.",
    },
    privacyTitle: "🔒 Ingenting om pengene dine",
    privacyText:
      "Påminnelser inneholder aldri et beløp, en saldo, en konto eller en regning - bare et puff om å åpne appen. Ingen forfallsvarsler; det tar banken din seg av. Endre tidspunkt og hyppighet, eller slå dem av, når som helst under Profil → Loggpåminnelser.",
    enable: "Slå på påminnelser",
    asking: "Spør telefonen din...",
    notNow: "Ikke nå",
  },
  name: {
    title: "Hva skal vi kalle deg?",
    subtitle: "Velg et visningsnavn (valgfritt). Det lagres bare på enheten din.",
    placeholder: "Buddy",
    hint: "La stå tomt for å bruke standardnavnet «Buddy»",
    privacyTitle: "🔒 Personvern først",
    privacyText:
      "Ingen e-post, telefonnummer eller personopplysninger kreves. Informasjonen din lagres lokalt på enheten din og sendes aldri til noen server.",
    arkTitle: "Bygg arken din (valgfritt)",
    arkText: "Du kan sette milepælsmål nå, eller hoppe over og gjøre det senere fra Gjeld-fanen.",
    finishBuildArk: "Fullfør + Bygg arken din",
    skipForNow: "Hopp over for nå",
    tourHint:
      "Videre fortsetter introduksjonen med en guidet titt på hver fane - hvert tips har en «Les mer» med alle detaljene, og du kan gå et steg tilbake eller hoppe over når som helst. Les og søk i alt sammen senere under Profil → Hjelp → Introduksjon.",
  },
  alerts: {
    notificationsOff: {
      title: "Varsler er av",
      message:
        "Påminnelsene forblir av til varsler er tillatt for BudgetArk i telefonens innstillinger. Du kan slå dem på når som helst under Profil → Loggpåminnelser.",
    },
    saveFailed: {
      title: "Kunne ikke lagre oppsettet ditt",
      message:
        "Oppsettet ditt kunne ikke lagres på denne enheten. Dette skjer vanligvis når telefonen har veldig lite ledig lagringsplass. Frigjør litt plass og prøv igjen, eller fortsett likevel - appen kan be deg sette opp på nytt neste gang den åpnes.",
      tryAgain: "Prøv igjen",
      continueAnyway: "Fortsett likevel",
    },
    templateFailed: {
      title: "Malen ble ikke brukt",
      message:
        "Oppsettet ditt er lagret, men startgrensene kunne ikke skrives. Du kan sette grenser når som helst under Grenser på Budsjett-fanen.",
    },
  },
  coachmark: {
    eyebrow: "INTRODUKSJON",
    counter: "{{current}} av {{total}}",
    skipAll: "Hopp over alle",
  },
};
