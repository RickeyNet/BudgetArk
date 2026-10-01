/**
 * BudgetArk - Svenska texter: introduktion (onboarding)
 * File: src/i18n/locales/sv/onboarding.ts
 *
 * Swedish counterpart of en/onboarding.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. "Buddy" is the stored
 * default display name and stays as it is.
 */

import type { Localized } from "../types";
import type { onboarding as en } from "../en/onboarding";

export const onboarding: Localized<typeof en> = {
  stepOf: "STEG {{step}} AV {{total}}",
  skipSetup: "Hoppa över inställningarna",
  next: "Nästa →",
  back: "← Tillbaka",
  skip: "Hoppa över",
  mission: {
    footnote:
      "Gratis, utan reklam, utan konto - och din data lämnar aldrig din telefon. Du kan läsa det här igen när som helst högst upp på Profil-fliken.",
  },
  theme: {
    title: "Välj ditt tema",
    subtitle: "Välj ett färgschema som passar din stil. Du kan ändra det senare i inställningarna.",
  },
  welcome: {
    title: "Välkommen till BudgetArk",
    subtitle: "Din följeslagare för att hålla koll på skulder, sköta budgeten och bygga förmögenhet.",
    features: {
      debts: {
        title: "Skulder",
        desc: "Håll koll på varje skuld, välj en återbetalningsstrategi, följ milstolparna i Bygg din ark - och hindra att oanvända kreditkort stängs",
      },
      budget: {
        title: "Budget",
        desc: "Logga inkomster och utgifter per kategori, sätt gränser, automatisera återkommande räkningar och godkänn bankimporter i granskningsinkorgen",
      },
      bridge: {
        title: "Bryggan",
        desc: "Din startflik: nettoförmögenhet över tid, alla dina konton, inköpsplaner och valfri aktiebevakning i realtid",
      },
      charts: {
        title: "Sjökort",
        desc: "En gratis finanskurs med 24 lektioner, kalkylatorer och tänk om-projektioner byggda på dina egna siffror",
      },
      profile: {
        title: "Profil",
        desc: "Teman, bankkopplingar, partnersynk, säkerhetskopior - och den sökbara introduktionen när du behöver den",
      },
      privacy: {
        title: "Privat i grunden",
        desc: "Allt krypteras på den här telefonen. BudgetArk har ingen server - din ekonomiska data lämnar aldrig din enhet",
      },
    },
  },
  template: {
    title: "Börja från en mall?",
    subtitle:
      "Välj den som passar bäst så sätter BudgetArk kategorigränser och dina två största återkommande rader åt dig. Alla siffror går att ändra - det är ett första utkast, inget som låser.",
    startEmpty: {
      title: "Börja tomt",
      tagline: "Inga gränser eller rader - bygg upp det efter hand",
    },
    incomeLabel: "NETTOLÖN PER MÅNAD (HUSHÅLLET)",
    incomePlaceholder: "t.ex. 4200",
    housingLabel: "HYRA ELLER BOLÅN",
    housingPlaceholder: "t.ex. 1400",
    hint: "Båda är valfria. Gränserna sätts som en andel av nettolönen; lämna tomt så kan du fylla i dem senare under Gränser på Budget-fliken. Sparas bara på den här telefonen.",
    startEmptyNext: "Börja tomt →",
  },
  reminders: {
    title: "Vill du ha en knuff att fortsätta logga?",
    subtitle: "Budgetar fungerar när loggvanan sitter. BudgetArk kan skicka två sorters milda påminnelser - och inget annat.",
    checkins: {
      title: "Avstämningar när det blir tyst",
      desc: "Ett kort ”hur går veckan?” om några dagar går utan någon post. Loggar du regelbundet hör du aldrig av den.",
    },
    monthStart: {
      title: "En påminnelse den 1:a",
      desc: "En notis i början av varje månad för att sätta mål och kasta ett öga på förra månaden.",
    },
    privacyTitle: "🔒 Inget om dina pengar",
    privacyText:
      "Påminnelser innehåller aldrig ett belopp, ett saldo, ett konto eller en räkning - bara en knuff att öppna appen. Inga förfalloaviseringar; det sköter din bank. Ändra tid och frekvens, eller stäng av dem, när som helst under Profil → Loggpåminnelser.",
    enable: "Slå på påminnelser",
    asking: "Frågar din telefon...",
    notNow: "Inte nu",
  },
  name: {
    title: "Vad ska vi kalla dig?",
    subtitle: "Välj ett visningsnamn (valfritt). Det sparas bara på din enhet.",
    placeholder: "Buddy",
    hint: "Lämna tomt för att använda standardnamnet ”Buddy”",
    privacyTitle: "🔒 Sekretess först",
    privacyText:
      "Ingen e-post, inget telefonnummer, inga personuppgifter krävs. Din information lagras lokalt på din enhet och skickas aldrig till någon server.",
    arkTitle: "Bygg din ark (valfritt)",
    arkText: "Du kan sätta milstolpemål nu, eller hoppa över det och göra det senare från Skulder-fliken.",
    finishBuildArk: "Slutför + Bygg din ark",
    skipForNow: "Hoppa över tills vidare",
    tourHint:
      "Härnäst fortsätter introduktionen med en guidad titt på varje flik - varje tips har en ”Läs mer” med alla detaljer, och du kan gå tillbaka ett steg eller hoppa över när som helst. Läs och sök i allt senare under Profil → Hjälp → Introduktion.",
  },
  alerts: {
    notificationsOff: {
      title: "Aviseringar är av",
      message:
        "Påminnelserna förblir av tills aviseringar tillåts för BudgetArk i telefonens inställningar. Du kan slå på dem när som helst under Profil → Loggpåminnelser.",
    },
    saveFailed: {
      title: "Kunde inte spara dina inställningar",
      message:
        "Dina inställningar kunde inte sparas på den här enheten. Det händer oftast när telefonen har väldigt lite ledigt utrymme. Frigör lite plats och försök igen, eller fortsätt ändå - appen kan be dig göra inställningarna igen nästa gång den öppnas.",
      tryAgain: "Försök igen",
      continueAnyway: "Fortsätt ändå",
    },
    templateFailed: {
      title: "Mallen tillämpades inte",
      message:
        "Dina inställningar är sparade, men startgränserna kunde inte skrivas. Du kan sätta gränser när som helst under Gränser på Budget-fliken.",
    },
  },
  coachmark: {
    eyebrow: "INTRODUKTION",
    counter: "{{current}} av {{total}}",
    skipAll: "Hoppa över alla",
  },
};
