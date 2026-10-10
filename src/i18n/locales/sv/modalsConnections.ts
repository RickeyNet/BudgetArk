/**
 * BudgetArk - Svenska texter: gemensamma modaler (connections)
 * File: src/i18n/locales/sv/modalsConnections.ts
 *
 * Swedish counterpart of en/modalsConnections.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Product names (SimpleFIN,
 * SimpleFIN Bridge, Teller, Teller Connect) and URLs stay as they are.
 */

import type { Localized } from "../types";
import type { modalsConnections as en } from "../en/modalsConnections";

export const modalsConnections: Localized<typeof en> = {
  teller: {
    title: "Koppla via Teller",
    failure: "Teller Connect rapporterade ett fel.",
  },
  guide: {
    cost: "KOSTNAD",
    openSite: "Öppna {{site}} ↗",
    stepByStep: "STEG FÖR STEG",
    officialGuide: "Se den officiella guiden från {{name}} ↗",
    goodToKnow: "BRA ATT VETA",
    privacy: "INTEGRITET I KORTHET",
    policy: "Läs hela integritetspolicyn från {{name}} ↗",
    disclaimer:
      "Det här är en sammanfattning i klarspråk, inte juridisk rådgivning. Policyer kan ändras - länken ovan är alltid den version som gäller.",
    startSetup: "Kom igång →",
  },
  mapping: {
    importTransactions: "Importera transaktioner",
    whoseCard: "Vems kort är det här?",
    noOne: "Ingen",
    balanceUpdates: "Saldouppdateringar",
    none: "Inget",
    newAccount: "+ Nytt konto",
    cardsOnDebts: "Kort under Skulder",
    noCardsHint:
      "Lägg först till kortet på fliken Skulder och välj det sedan här eller i kortets redigerare.",
    accountNamePlaceholder: "Kontonamn",
    createAndMap: "Skapa & matcha",
    savingsHint:
      "Sparkonton kan markeras som din buffert på Bryggan när de har skapats.",
    investmentHint:
      "Bankens saldo blir det här kontots värde på Bryggan. Om du också lägger till dess aktier eller fonder där räknas de utöver det.",
  },
  timeAgo: {
    never: "aldrig",
    justNow: "just nu",
    minutes: "{{count}} min sedan",
    hours: "{{count}} tim sedan",
    days: "{{count}} d sedan",
  },
  status: {
    reconnectNeeded: "Behöver återanslutas",
    lastSyncFailed: "Synk misslyckades",
    bridgeAttention: "En bank på din SimpleFIN Bridge behöver åtgärdas",
    lastSynced: "Senast synkad {{when}}",
  },
  list: {
    title: "Bankkopplingar",
    subtitle:
      "Kopplingar hämtar transaktioner och saldon direkt från dina leverantörer med inloggningsuppgifter som lagras på den här enheten.",
    empty:
      "Inga kopplingar än. Koppla en bank för att importera transaktioner och hålla saldon uppdaterade automatiskt.",
    addConnection: "+ Lägg till koppling",
    syncAll: "Synka alla nu",
  },
  detail: {
    back: "‹ Alla kopplingar",
    reauthBanner:
      "Den här kopplingen behöver auktoriseras på nytt. Ta bort den och lägg till den igen för att återansluta.",
    bridgeWarningIntro:
      "Din SimpleFIN Bridge rapporterar att en bank bakom den här kopplingen behöver en ny inloggning. Dess transaktioner slutar komma in tills du återansluter den:",
    bridgeWarningOutro:
      "Logga in på beta-bridge.simplefin.org och återanslut banken. När den är tillbaka hämtar nästa synk de missade transaktionerna av sig själv.",
    unfinishedSetup:
      "Konfigurationen slutfördes inte - inga konton är matchade än, så inget importeras. Din setup-token är redan inlöst, så du kan slutföra utan en ny.",
    finishSetup: "Slutför kontokonfigurationen",
    linkedAccounts: "KOPPLADE KONTON",
    noAccounts: "Inga konton matchade.",
    importsOn: "Importerar transaktioner",
    importsOff: "Import av",
    updatesAccount: " · uppdaterar {{name}}",
    balanceFallback: "saldo",
    updatesDebtCard: " · uppdaterar ett kort under Skulder",
    balanceToCard: " · saldo → {{card}}",
    linkedToCardOff: " · kopplat till {{card}} · saldo av",
    linkedDebtCardOff: " · kopplat till ett kort under Skulder · saldo av",
    balanceNotTracked: " · saldo spåras inte",
    balanceValue: " · {{amount}}",
    addAnotherBank: "+ Lägg till en bank till",
    checkNewAccounts: "+ Sök efter nya konton",
    syncNow: "Synka nu",
    reimport: "Importera om de senaste {{count}} dagarna",
    reimportHint:
      "Använd det här om en bank varit frånkopplad ett tag och dess transaktioner saknas. Allt du redan granskat blir kvar som det är.",
    bankDataAsOf: "Bankdata per {{date}}",
    bankDataNoDate: "Bankdata: inget datum än",
    bankDataDaysOld: " · {{count}} dagar gammal",
    staleHint: "Ett saldo här har inte ändrats på {{count}}+ dagar. Om banken behöver en ny inloggning säger SimpleFIN Bridge det ovan - annars uppdaterar Bridge ungefär en gång om dagen.",
    reconnectHint: "SimpleFIN Bridge godtar inte längre den här kopplingens åtkomst. Skapa en ny setup-token på beta-bridge.simplefin.org och klistra in den här - dina konton, kortkopplingar och importerad historik finns kvar.",
    reconnectPlaceholder: "Klistra in din nya setup-token",
    reconnect: "Återanslut",
    remove: "Ta bort koppling",
    errors: {
      loadAccounts: "Kunde inte läsa in kopplingens konton.",
      savePerson: "Kunde inte spara vem kortet tillhör.",
      savePreferences: "Kunde inte spara kontots inställningar.",
      createAccount: "Kunde inte skapa kontot på Bryggan.",
      reconnect: "Kunde inte återansluta. Kontrollera token och försök igen.",
    },
  },
  /** Result of a manual Sync tap, shown under the button that was tapped. */
  syncNotice: {
    updated: "Synkad nyss",
    updatedWithWarnings: "Synkad nyss - SimpleFIN Bridge rapporterar fortfarande att en bank behöver åtgärdas (se nedan)",
    fresh: "Redan synkad nyligen - du kan synka igen kl. {{time}}",
    freshSoon: "Redan synkad nyligen - du kan synka igen om några minuter",
    rateLimited: "Leverantören bad oss sakta ner - försök igen senare",
    needsReauth: "Återanslutning behövs - se nedan",
    failed: "Synken misslyckades - försök igen senare",
  },
  removeDialog: {
    title: "Ta bort den här kopplingen?",
    body:
      "Dess inloggningsuppgifter raderas från den här enheten och synkningen stoppas. Budgetposter du redan godkänt blir kvar. Ogranskade inkorgsposter från den här kopplingen kastas.",
    keep: "Behåll",
    remove: "Ta bort",
    removing: "Tar bort...",
  },
  wizard: {
    provider: {
      title: "Koppla en bank",
      subtitle:
        "Välj en leverantör. Dina inloggningsuppgifter förblir krypterade på den här enheten. Ny här? Tryck på ”Guide & integritet” för hjälp steg för steg.",
      simplefinTitle: "🏦 SimpleFIN Bridge (rekommenderas)",
      simplefinDescription:
        "En setup-token täcker Chase och tusentals amerikanska banker och kreditkort. Betaltjänst (ca 1,50 $/månad) med öppen registrering - vem som helst kan gå med idag.",
      simplefinGuide: "📖 SimpleFIN-guide & integritet",
      tellerTitle: "🔗 Teller",
      tellerDescription:
        "Använd ditt eget Teller-utvecklarkonto (100 gratis bankkopplingar). Bäst om du redan har ett: Teller har ingen öppen registrering just nu - nya konton fås på begäran via support@teller.io.",
      tellerGuide: "📖 Teller-guide & integritet",
    },
    fullGuide: "📖 Hela guiden, länkar & integritet",
    tellerSetup: {
      title: "Konfigurera Teller",
      subtitle: "Använder ditt eget gratis utvecklarkonto från teller.io.",
      step1:
        "1. Logga in på teller.io - inget konto? Registrering sker just nu bara på begäran (mejla support@teller.io), eller använd SimpleFIN istället",
      step2:
        "2. Ladda ner och packa upp teller.zip från din kontrollpanel (den innehåller certificate.pem och private_key.pem)",
      step3:
        "3. Kopiera ditt Application ID från kontrollpanelen och importera båda .pem-filerna nedan",
      applicationId: "APPLICATION ID",
      applicationIdPlaceholder: "app_...",
      environment: "MILJÖ",
      clientCertificate: "KLIENTCERTIFIKAT",
      certificateLoaded: "✓ certificate.pem inläst",
      importCertificate: "Importera certificate.pem",
      privateKey: "PRIVAT NYCKEL",
      keyLoaded: "✓ private_key.pem inläst",
      importKey: "Importera private_key.pem",
      hint:
        "Certifikatet och nyckeln förblir krypterade på den här enheten - det är så Teller verifierar att anropen kommer från din app.",
      readFileError:
        "Kunde inte läsa filen. Packa upp teller.zip och välj .pem-filerna direkt.",
    },
    tellerEnroll: {
      addBankTitle: "Lägg till en bank till",
      connectTitle: "Koppla din bank",
      addBankSubtitle:
        "Logga in på en bank till via Teller Connect. Den läggs till i samma koppling - dina befintliga banker blir kvar som de är.",
      connectSubtitle:
        "Logga sedan in på din bank via Teller Connect. Dina bankuppgifter går till Teller, aldrig till BudgetArk.",
      openTitle: "🏦 Öppna Teller Connect",
      openDescription:
        "Öppnar Tellers säkra bankinloggning. När den är klar visas dina konton här för matchning.",
    },
    simplefin: {
      rediscoverTitle: "Sök efter nya konton",
      rediscoverSubtitle:
        "Har du lagt till en bank eller ett konto på din SimpleFIN Bridge efter konfigurationen? Det här listar din bridges konton på nytt och erbjuder dem som inte matchats än. Konton du redan matchat blir kvar som de är.",
      resumeTitle: "Slutför SimpleFIN-konfigurationen",
      resumeSubtitle:
        "Din setup-token är redan inlöst och kopplingen är sparad på den här enheten - du behöver ingen ny token.",
      resumeInstruction:
        "Det gick inte att lista dina konton, oftast för att SimpleFIN Bridge kräver ett aktivt abonnemang. Kontrollera din betalning på beta-bridge.simplefin.org och läs sedan in dina konton för att slutföra konfigurationen.",
      title: "Konfigurera SimpleFIN",
      subtitle: "Tre steg på SimpleFINs webbplats, klistra sedan in en token här.",
      step1: "1. Skapa ett konto på beta-bridge.simplefin.org",
      step2: "2. Koppla din(a) bank(er) där",
      step3: "3. Välj ”New App”, kopiera setup-token och klistra in den nedan",
      setupToken: "SETUP-TOKEN",
      tokenPlaceholder: "Klistra in din SimpleFIN-setup-token",
      tokenHint:
        "En token kan bara användas en gång: när BudgetArk har löst in den kan den inte klistras in någon annanstans.",
    },
    map: {
      title: "Dina konton",
      subtitle:
        "Välj vad som ska importeras och var saldon ska landa. Omatchade konton importerar ändå transaktioner till granskningsinkorgen.",
      whoseCard: "VEMS KORT ÄR DET HÄR?",
      personHint: "Utgifter som importeras från det här kontot föreslår den här personen.",
      cardHintNegative:
        "Negativt saldo - det här ser ut som ett kreditkort. Välj det under Kort under Skulder för att följa saldot där.",
      cardHintName:
        "Det här ser ut som ett kreditkort. Välj det under Kort under Skulder för att följa saldot där.",
      balanceUpdates: "SALDOUPPDATERINGAR",
      saveError: "Det gick inte att spara kontomatchningen. Försök igen.",
    },
    done: {
      allSetTitle: "✅ Allt klart",
      rediscoverNothing:
        "Inga nya konton hittades - allt på din bridge är redan matchat. Om du precis lagt till en bank på din SimpleFIN Bridge, ge den några minuter att kopplas klart och sök igen.",
      addBankNothing:
        "Bankens konton var redan kopplade, så inget ändrades.",
      connectedTitle: "✅ Kopplad",
      summary_one:
        "{{count}} konto importerar transaktioner till din granskningsinkorg. Nya poster visas efter varje synk.",
      summary_other:
        "{{count}} konton importerar transaktioner till din granskningsinkorg. Nya poster visas efter varje synk.",
    },
    actions: {
      checking: "Söker...",
      checkNewAccounts: "Sök efter nya konton",
      loadingAccounts: "Läser in konton...",
      loadAccounts: "Läs in konton",
      connecting: "Kopplar...",
      connect: "Koppla",
      saving: "Sparar...",
      openTellerConnect: "Öppna Teller Connect",
    },
  },
};
