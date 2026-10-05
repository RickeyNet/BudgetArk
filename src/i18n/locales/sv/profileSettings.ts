/**
 * BudgetArk - Svenska texter: Profil (settings)
 * File: src/i18n/locales/sv/profileSettings.ts
 *
 * Swedish counterpart of en/profileSettings.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { profileSettings as en } from "../en/profileSettings";

export const profileSettings: Localized<typeof en> = {
  sectionTitle: "INSTÄLLNINGAR",
  language: {
    label: "Språk",
    pickerTitle: "Språk",
    a11yLabel: "Språk, just nu {{current}}",
    a11yHint: "Öppnar appens språkalternativ",
    autoWithResolved: "Automatiskt ({{language}})",
    names: {
      en: "Engelska",
      de: "Tyska",
      ru: "Ryska",
      uk: "Ukrainska",
      sv: "Svenska",
      nb: "Norska",
    },
    options: {
      auto: {
        name: "Automatiskt",
        description:
          "Följer telefonens språk. Faller tillbaka på engelska när telefonens språk inte finns än.",
      },
    },
    note: "Visst innehåll - lektioner, de amerikanska skatteverktygen och versionsinformationen - finns än så länge bara på engelska.",
    translationNote:
      "Översättningarna till tyska, ryska, ukrainska, svenska och norska är maskinassisterade och har ännu inte granskats av en modersmålstalare. Hittat ett fel? Skicka rättelsen i appen via Profil → Hjälp → Skicka feedback.",
  },
  notNow: "Inte nu",
  currency: {
    label: "Valuta",
    pickerTitle: "Valuta & region",
  },
  currencyChange: {
    title: "Byt valuta",
    pairedMessage:
      "Att byta till {{to}} ändrar valutasymbolen, men dina belopp behåller samma siffror. Dina data synkas med en ihopkopplad partner, så beloppen kan inte räknas om automatiskt - koppla från först om du vill räkna om dem.",
    fetchingRate: "Hämtar dagens växelkurs...",
    convertQuestion:
      "Vill du räkna om dina befintliga belopp från {{from}} till {{to}} med kursen nedan, eller bara byta symbol och behålla samma siffror?",
    rateToday: "Dagens kurs",
    rateCached: "Kurser från {{when}} (kunde inte nå aktuella kurser)",
    rateOffline: "Offline - använder en inbyggd uppskattning",
    rateLine: "{{prefix}}: 1 {{from}} = {{rate}} {{to}}",
    convertButton: "Räkna om mina belopp",
    symbolOnlyPaired: "Byt bara symbol",
    symbolOnly: "Byt bara symbolen",
  },
  privacy: {
    label: "Sekretessläge",
    enabled: "Skärmbilder & skärminspelning blockeras",
    disabled: "Skärmbilder & skärminspelning tillåts",
    onTitle: "Sekretessläge på",
    offTitle: "Sekretessläge av",
    onMessage: "Skärmbilder och skärminspelning blockeras nu.",
    offMessage: "Skyddet mot skärmbilder och skärminspelning är avstängt.",
  },
  appLock: {
    label: "Applås",
    enabled: "PIN-kod krävs när appen öppnas",
    disabled: "Fråga efter PIN-kod när appen öppnas",
  },
  holdings: {
    label: "Innehav i realtid",
    enabled: "Aktier & ETF:er räknas in i din nettoförmögenhet",
    disabled: "Räkna in aktier & ETF:er i din nettoförmögenhet",
    enabledTitle: "Innehav i realtid på",
    enabledMessage:
      "Lägg till aktier och ETF:er från fliken Bryggan. Kurserna uppdateras ungefär en gång om dagen.",
    enable: "Aktivera",
  },
  haptics: {
    label: "Haptisk feedback",
    enabled: "Diskreta vibrationer vid viktiga åtgärder",
    disabled: "Vibrationer avstängda",
  },
  reminders: {
    label: "Loggpåminnelser",
    off: "Puffar för att logga utgifter & planera varje månad",
    afterQuietDays_one: "Efter en tyst dag",
    afterQuietDays_other: "Efter {{count}} tysta dagar",
    afterQuietWeek: "Efter en tyst vecka",
    checkInsAndMonthStart: "Avstämningar & planering vid månadsstart",
    monthStart: "Planering vid månadsstart",
    nothingSelected: "Inget valt",
    mornings: "morgnar",
    afternoons: "eftermiddagar",
    evenings: "kvällar",
    summary: "{{what}} · {{when}}",
  },
  updates: {
    checkLabel: "Sök efter uppdateringar",
    lastChecked: "Senast kontrollerat {{when}}",
    neverChecked: "Aldrig kontrollerat",
    autoLabel: "Automatiska uppdateringar",
    autoOff: "Av - bara manuella kontroller",
    autoOn: "På - kontrollerar automatiskt",
    unavailableTitle: "Uppdateringar inte tillgängliga",
    unavailableMessage:
      "Uppdateringskontroller är inte tillgängliga i utvecklingsbyggen. Installera ett EAS-förhandsgransknings- eller produktionsbygge för att använda funktionen.",
    upToDateTitle: "Allt är uppdaterat",
    upToDateMessage: "Ingen uppdatering är tillgänglig just nu. Senast kontrollerat {{when}}.",
    rejectedTitle: "Uppdatering avvisad",
    rejectedMessage:
      "Uppdateringen avvisades eftersom den riktar sig till en äldre runtime-version. Det kan tyda på ett rollback-försök.",
    failedTitle: "Uppdateringskontrollen misslyckades",
    failedNetwork:
      "Kunde inte nå uppdateringsservern. Kontrollera din internetanslutning och försök igen.",
    failedGeneric: "Det gick inte att söka efter uppdateringar just nu. Försök igen om en stund.",
    failedDetails: "{{friendly}}\n\nDetaljer: {{details}}",
    modeSavedTitle: "Uppdateringsläge sparat",
    modeManualMessage:
      "Manuellt läge är på. Appen söker bara efter uppdateringar när du trycker på ”Sök efter uppdateringar”.",
    modeAutoMessage: "Automatiska uppdateringskontroller är på.",
    readyTitle: "Uppdatering redo",
    readyMessage: "En ny uppdatering är redo att installeras.",
    published: "Publicerad {{when}}",
    later: "Senare",
    installNow: "Installera nu",
    installFailedTitle: "Installationen misslyckades",
    installFailedMessage:
      "Uppdateringen kunde inte tillämpas just nu. Försök igen.",
  },
};
