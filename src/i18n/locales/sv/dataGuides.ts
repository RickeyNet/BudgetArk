/**
 * BudgetArk - Svenska texter: paketerad data (guides)
 * File: src/i18n/locales/sv/dataGuides.ts
 *
 * Swedish counterpart of en/dataGuides.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Provider UI labels
 * (Get Started, New Connection, Sign In, Development ...) stay in English
 * because that is what the user sees on the provider's site.
 */

import type { Localized } from "../types";
import type { dataGuides as en } from "../en/dataGuides";

export const dataGuides: Localized<typeof en> = {
  simplefin: {
    tagline:
      "Rekommenderas: en inklistrad token kopplar Chase och tusentals amerikanska banker och kort. Skrivskyddat, öppen registrering.",
    cost: "Cirka 1,50 $/månad eller 15 $/år, faktureras av SimpleFIN - inte BudgetArk.",
    steps: {
      account: {
        title: "Skapa ditt SimpleFIN Bridge-konto",
        detail:
          "Öppna beta-bridge.simplefin.org, tryck på Get Started och ange din e-postadress. SimpleFIN skickar en inloggningslänk - öppna den och godkänn villkoren.",
      },
      subscribe: {
        title: "Prenumerera",
        detail:
          "SimpleFIN är en liten betaltjänst (cirka 1,50 $/månad eller 15 $/år). Du måste prenumerera innan du kan lägga till din första bank.",
      },
      connectBank: {
        title: "Koppla din(a) bank(er)",
        detail:
          "Öppna Financial Institutions i panelen, välj New Connection, hitta din bank och logga in via dess säkra sida. Lägg till så många du vill.",
      },
      token: {
        title: "Skapa en setup-token",
        detail:
          "Välj New App (kalla den 'BudgetArk' om du blir tillfrågad) och kopiera setup-token som visas - en lång rad bokstäver och siffror.",
      },
      paste: {
        title: "Klistra in den i BudgetArk",
        detail:
          "Kom tillbaka hit, klistra in token i fältet och tryck på Koppla. BudgetArk sköter resten.",
      },
    },
    tips: {
      singleUse:
        "Setup-token är för engångsbruk: när BudgetArk har använt den kan den inte klistras in någon annanstans. Om den någon gång misslyckas, skapa bara en ny.",
      readOnly:
        "SimpleFIN är skrivskyddat - det kan se saldon och transaktioner, aldrig flytta pengar.",
      daily:
        "Det uppdateras ungefär en gång om dagen, så helt nya transaktioner kan ta upp till 24 timmar att dyka upp.",
    },
    privacy: {
      headline: "Nej - SimpleFIN säljer inte din data och visar ingen reklam.",
      points: {
        noSell: "Säljer inte din data och använder den inte för reklam eller marknadsföring.",
        noCredentials:
          "Lagrar aldrig ditt riktiga användarnamn eller lösenord till banken - de stannar mellan dig och din bank.",
        sharing:
          "Delar data bara med de tjänsteleverantörer som behövs för att nå din bank, plus de standardundantag alla företag har: när lagen kräver det, eller om företaget någon gång säljs.",
      },
    },
  },
  teller: {
    tagline:
      "100 kostnadsfria bankkopplingar - men bara om du redan har (eller kan begära) ett Teller-utvecklarkonto.",
    cost: "Gratis för upp till 100 kopplingar (Tellers Development-nivå). Nya konton ges för närvarande bara på begäran.",
    steps: {
      account: {
        title: "Skaffa ett Teller-utvecklarkonto",
        detail:
          "Teller har ingen öppen registrering just nu - teller.io erbjuder bara Sign In. Om du inte redan har ett konto, mejla support@teller.io och be om ett utvecklarkonto för en personlig budgetapp, eller använd SimpleFIN i stället (öppen registrering, fungerar idag).",
      },
      certificate: {
        title: "Ladda ner ditt certifikat och din nyckel",
        detail:
          "När ditt konto skapats ger Teller dig ett certifikat och en privat nyckel (två .pem-filer) som bevisar att förfrågningarna kommer från din app. Ladda ner dem från panelen och packa upp dem om de kommer zippade.",
      },
      appId: {
        title: "Kopiera ditt Application ID",
        detail: "Kopiera ditt Application ID från din Teller-panel. Det börjar med 'app_'.",
      },
      environment: {
        title: "Använd miljön Development",
        detail:
          "För att koppla riktiga banker gratis, välj Development (100 kostnadsfria kopplingar). Sandbox är bara påhittad testdata; Production är för betalda, storskaliga appar.",
      },
      enterDetails: {
        title: "Ange dina uppgifter i BudgetArk",
        detail:
          "Klistra in ditt Application ID, låt miljön stå på Development och importera båda .pem-filerna - certifikatet och den privata nyckeln.",
      },
      connectBank: {
        title: "Koppla din bank",
        detail:
          "Tryck på Öppna Teller Connect och logga in på din bank i Tellers säkra fönster. Din bankinloggning går till Teller, aldrig till BudgetArk.",
      },
    },
    tips: {
      noAccount:
        "Inget Teller-konto och inget svar från supporten? SimpleFIN är den enklare vägen - öppen registrering, cirka 1,50 $/månad, och det täcker tusentals amerikanska banker.",
      development:
        "Låt miljön stå på Development om inte Teller uttryckligen sagt något annat - det är gratisnivån för riktiga banker.",
      storedLocally:
        "Ditt certifikat och din nyckel lagras krypterade enbart på den här enheten och lämnar den aldrig.",
      readOnly:
        "Teller är skrivskyddat här - det läser saldon och transaktioner, det kan inte flytta pengar.",
    },
    privacy: {
      headline: "Nej - Tellers policy säger uttryckligen att de inte säljer din data.",
      points: {
        noSell:
          'Säger rakt ut: "We do not sell your End User Personal Data." (Vi säljer inte dina personuppgifter som slutanvändare.)',
        noMarketing:
          "Delar inte din information för marknadsföring - varken sin egen, sina partners eller utomstående företags.",
        sharing:
          "Delar dina kontouppgifter med appen du kopplar (det är BudgetArk, på din telefon) och de leverantörer som behövs för att driva tjänsten, plus standardundantagen vid lagkrav / företagsförsäljning.",
      },
    },
  },
};
