/**
 * BudgetArk - Norske tekster: delte modaler (connections)
 * File: src/i18n/locales/nb/modalsConnections.ts
 *
 * Norwegian (Bokmål) counterpart of en/modalsConnections.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary. Product
 * names (SimpleFIN, SimpleFIN Bridge, Teller, Teller Connect) and URLs stay
 * as they are.
 */

import type { Localized } from "../types";
import type { modalsConnections as en } from "../en/modalsConnections";

export const modalsConnections: Localized<typeof en> = {
  teller: {
    title: "Koble til via Teller",
    failure: "Teller Connect rapporterte en feil.",
  },
  guide: {
    cost: "KOSTNAD",
    openSite: "Åpne {{site}} ↗",
    stepByStep: "STEG FOR STEG",
    officialGuide: "Se den offisielle oppsettsguiden fra {{name}} ↗",
    goodToKnow: "GODT Å VITE",
    privacy: "PERSONVERN I KORTE TREKK",
    policy: "Les hele personvernerklæringen fra {{name}} ↗",
    disclaimer:
      "Dette er et sammendrag i klarspråk, ikke juridisk rådgivning. Retningslinjer kan endres - lenken over er alltid den gjeldende versjonen.",
    startSetup: "Start oppsettet →",
  },
  mapping: {
    importTransactions: "Importer transaksjoner",
    whoseCard: "Hvem sitt kort er dette?",
    noOne: "Ingen",
    balanceUpdates: "Saldooppdateringer",
    none: "Ingen",
    newAccount: "+ Ny konto",
    accountNamePlaceholder: "Kontonavn",
    createAndMap: "Opprett og knytt til",
    savingsHint:
      "Sparekontoer kan merkes som bufferen din fra Broen når de er opprettet.",
    investmentHint:
      "Bankens saldo blir denne kontoens verdi på Broen. Hvis du også legger til aksjene eller fondene dens der, telles de i tillegg.",
  },
  timeAgo: {
    never: "aldri",
    justNow: "akkurat nå",
    minutes: "{{count}} min siden",
    hours: "{{count}} t siden",
    days: "{{count}} d siden",
  },
  status: {
    reconnectNeeded: "Må kobles til igjen",
    lastSyncFailed: "Siste synk mislyktes",
    bridgeAttention: "En bank på SimpleFIN Bridge trenger oppfølging",
    lastSynced: "Sist synket {{when}}",
  },
  list: {
    title: "Banktilkoblinger",
    subtitle:
      "Tilkoblinger henter transaksjoner og saldoer direkte fra leverandørene dine med innloggingsopplysninger som lagres på denne enheten.",
    empty:
      "Ingen tilkoblinger enda. Koble til en bank for å importere transaksjoner og holde saldoer oppdatert automatisk.",
    addConnection: "+ Legg til tilkobling",
    syncAll: "Synk alle nå",
  },
  detail: {
    back: "‹ Alle tilkoblinger",
    reauthBanner:
      "Denne tilkoblingen må autoriseres på nytt. Fjern den og legg den til igjen for å koble til på nytt.",
    bridgeWarningIntro:
      "SimpleFIN Bridge rapporterer at en bank bak denne tilkoblingen trenger en ny innlogging. Transaksjonene dens stopper opp til du kobler den til igjen:",
    bridgeWarningOutro:
      "Logg inn på beta-bridge.simplefin.org og koble banken til igjen. Når den er tilbake, henter neste synk de manglende transaksjonene av seg selv.",
    unfinishedSetup:
      "Oppsettet ble ikke fullført - ingen kontoer er knyttet til enda, så ingenting importeres. Oppsettstokenet ditt er allerede brukt, så du kan fullføre uten et nytt.",
    finishSetup: "Fullfør kontooppsettet",
    linkedAccounts: "TILKNYTTEDE KONTOER",
    noAccounts: "Ingen kontoer knyttet til.",
    importsOn: "Importerer transaksjoner",
    importsOff: "Import av",
    updatesAccount: " · oppdaterer {{name}}",
    balanceFallback: "saldo",
    updatesDebtCard: " · oppdaterer et kort under Gjeld",
    balanceNotTracked: " · saldo spores ikke",
    balanceValue: " · {{amount}}",
    addAnotherBank: "+ Legg til en bank til",
    checkNewAccounts: "+ Se etter nye kontoer",
    syncNow: "Synk nå",
    reimport: "Importer de siste {{count}} dagene på nytt",
    reimportHint:
      "Bruk dette hvis en bank har vært frakoblet en stund og transaksjonene dens mangler. Alt du allerede har gjennomgått blir som det er.",
    remove: "Fjern tilkobling",
    errors: {
      loadAccounts: "Kunne ikke laste inn tilkoblingens kontoer.",
      savePerson: "Kunne ikke lagre hvem kortet tilhører.",
      savePreferences: "Kunne ikke lagre kontoens innstillinger.",
      createAccount: "Kunne ikke opprette kontoen på Broen.",
    },
  },
  removeDialog: {
    title: "Fjerne denne tilkoblingen?",
    body:
      "Innloggingsopplysningene slettes fra denne enheten, og synkingen stopper. Budsjettposter du allerede har godkjent, blir værende. Ugjennomgåtte innboksposter fra denne tilkoblingen forkastes.",
    keep: "Behold",
    remove: "Fjern",
    removing: "Fjerner...",
  },
  wizard: {
    provider: {
      title: "Koble til en bank",
      subtitle:
        "Velg en leverandør. Innloggingsopplysningene dine forblir kryptert på denne enheten. Ny her? Trykk på «Oppsettsguide og personvern» for hjelp steg for steg.",
      simplefinTitle: "🏦 SimpleFIN Bridge (anbefalt)",
      simplefinDescription:
        "Ett oppsettstoken dekker Chase og tusenvis av amerikanske banker og kredittkort. Betalt tjeneste (ca. 1,50 $/måned) med åpen registrering - hvem som helst kan bli med i dag.",
      simplefinGuide: "📖 SimpleFIN-oppsettsguide og personvern",
      tellerTitle: "🔗 Teller",
      tellerDescription:
        "Bruk din egen Teller-utviklerkonto (100 gratis banktilkoblinger). Best hvis du allerede har en: Teller har ingen åpen registrering akkurat nå - nye kontoer fås på forespørsel via support@teller.io.",
      tellerGuide: "📖 Teller-oppsettsguide og personvern",
    },
    fullGuide: "📖 Hele oppsettsguiden, lenker og personvern",
    tellerSetup: {
      title: "Teller-oppsett",
      subtitle: "Bruker din egen gratis utviklerkonto fra teller.io.",
      step1:
        "1. Logg inn på teller.io - ingen konto? Registrering skjer for øyeblikket bare på forespørsel (send e-post til support@teller.io), eller bruk SimpleFIN i stedet",
      step2:
        "2. Last ned og pakk ut teller.zip fra kontrollpanelet ditt (den inneholder certificate.pem og private_key.pem)",
      step3:
        "3. Kopier Application ID fra kontrollpanelet og importer begge .pem-filene nedenfor",
      applicationId: "APPLICATION ID",
      applicationIdPlaceholder: "app_...",
      environment: "MILJØ",
      clientCertificate: "KLIENTSERTIFIKAT",
      certificateLoaded: "✓ certificate.pem lastet inn",
      importCertificate: "Importer certificate.pem",
      privateKey: "PRIVAT NØKKEL",
      keyLoaded: "✓ private_key.pem lastet inn",
      importKey: "Importer private_key.pem",
      hint:
        "Sertifikatet og nøkkelen forblir kryptert på denne enheten - det er slik Teller bekrefter at forespørslene kommer fra appen din.",
      readFileError:
        "Kunne ikke lese filen. Pakk ut teller.zip og velg .pem-filene direkte.",
    },
    tellerEnroll: {
      addBankTitle: "Legg til en bank til",
      connectTitle: "Koble til banken din",
      addBankSubtitle:
        "Logg inn på en bank til via Teller Connect. Den legges til i samme tilkobling - bankene du allerede har, blir som de er.",
      connectSubtitle:
        "Logg deretter inn på banken din via Teller Connect. Bankopplysningene dine går til Teller, aldri til BudgetArk.",
      openTitle: "🏦 Åpne Teller Connect",
      openDescription:
        "Åpner Tellers sikre bankinnlogging. Når den er ferdig, vises kontoene dine her for tilknytning.",
    },
    simplefin: {
      rediscoverTitle: "Se etter nye kontoer",
      rediscoverSubtitle:
        "Har du lagt til en bank eller konto på SimpleFIN Bridge etter oppsettet? Dette lister opp bridgens kontoer på nytt og tilbyr dem som ikke er knyttet til enda. Kontoer du allerede har knyttet til, blir som de er.",
      resumeTitle: "Fullfør SimpleFIN-oppsettet",
      resumeSubtitle:
        "Oppsettstokenet ditt er allerede brukt, og tilkoblingen er lagret på denne enheten - du trenger ikke et nytt token.",
      resumeInstruction:
        "Kunne ikke liste opp kontoene dine, som oftest fordi SimpleFIN Bridge krever et aktivt abonnement. Sjekk betalingen din på beta-bridge.simplefin.org, og last så inn kontoene dine for å fullføre oppsettet.",
      title: "SimpleFIN-oppsett",
      subtitle: "Tre steg på SimpleFINs nettsted, så limer du inn ett token her.",
      step1: "1. Opprett en konto på beta-bridge.simplefin.org",
      step2: "2. Koble til banken(e) dine der",
      step3: "3. Velg «New App», kopier oppsettstokenet og lim det inn nedenfor",
      setupToken: "OPPSETTSTOKEN",
      tokenPlaceholder: "Lim inn SimpleFIN-oppsettstokenet ditt",
      tokenHint:
        "Et token kan bare brukes én gang: når BudgetArk har brukt det, kan det ikke limes inn noe annet sted.",
    },
    map: {
      title: "Kontoene dine",
      subtitle:
        "Velg hva som skal importeres, og hvor saldoer skal lande. Kontoer uten tilknytning importerer likevel transaksjoner til gjennomgangsinnboksen.",
      whoseCard: "HVEM SITT KORT ER DETTE?",
      personHint: "Utgifter som importeres fra denne kontoen, foreslår denne personen.",
      balanceUpdates: "SALDOOPPDATERINGER",
      saveError: "Kunne ikke lagre kontotilknytningen. Prøv igjen.",
    },
    done: {
      allSetTitle: "✅ Alt klart",
      rediscoverNothing:
        "Ingen nye kontoer funnet - alt på bridgen din er allerede knyttet til. Hvis du nettopp la til en bank på SimpleFIN Bridge, gi den noen minutter til å bli ferdig koblet og se etter igjen.",
      addBankNothing:
        "Bankens kontoer var allerede koblet til, så ingenting ble endret.",
      connectedTitle: "✅ Tilkoblet",
      summary_one:
        "{{count}} konto importerer transaksjoner til gjennomgangsinnboksen din. Nye poster vises etter hver synk.",
      summary_other:
        "{{count}} kontoer importerer transaksjoner til gjennomgangsinnboksen din. Nye poster vises etter hver synk.",
    },
    actions: {
      checking: "Ser etter...",
      checkNewAccounts: "Se etter nye kontoer",
      loadingAccounts: "Laster inn kontoer...",
      loadAccounts: "Last inn kontoer",
      connecting: "Kobler til...",
      connect: "Koble til",
      saving: "Lagrer...",
      openTellerConnect: "Åpne Teller Connect",
    },
  },
};
