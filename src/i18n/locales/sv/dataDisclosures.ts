/**
 * BudgetArk - Svenska texter: paketerad data (disclosures)
 * File: src/i18n/locales/sv/dataDisclosures.ts
 *
 * Swedish counterpart of en/dataDisclosures.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. The three disclosures are
 * rule-4 consent copy: sentence for sentence the same meaning as the
 * English, no softer and no stronger. Re-check both files together when
 * either changes.
 */

import type { Localized } from "../types";
import type { dataDisclosures as en } from "../en/dataDisclosures";

export const dataDisclosures: Localized<typeof en> = {
  mission: {
    eyebrow: "VÅRT UPPDRAG",
    title: "Varför jag byggde BudgetArk",
    body: "Jag ville vara proaktiv med min ekonomi, få den under kontroll och börja förbereda mig för framtiden, utan att ge upp min integritet eller betala för ännu en prenumeration. Jag behövde skuldavbetalning, månadsbudget och en tydlig bild av vägen framåt i en offline-app som stannar på din enhet och inte går någon annanstans. Jag byggde BudgetArk för att hjälpa dig göra detsamma, utan kostnad för dig.",
    invite:
      "Jag vill att det ska kännas som ditt. Har du en idé för appen - en funktion, en rättning, till och med ett nytt tema - hör av dig via Skicka feedback på fliken Profil. Jag läser varje meddelande.",
  },
  learningDisclaimer:
    "BudgetArks lektioner speglar en enskild apps syn på privatekonomi. Författaren är inte licensierad finansiell rådgivare, revisor eller jurist. Detta är allmän utbildning och åsikter, inte råd för din situation. Prata med en kvalificerad yrkesperson inför stora beslut.",
  connections: {
    title: "Innan du kopplar",
    intro:
      "Bankkopplingar pratar med dina finansiella leverantörer direkt från den här enheten. Det här är exakt vad det innebär:",
    points: {
      credentials:
        "Dina inloggningsuppgifter (en SimpleFIN-token eller ditt Teller-certifikat) lagras krypterade enbart på den här enheten. De synkas aldrig till en ihopkopplad partner och rör aldrig någon BudgetArk-server - BudgetArk har ingen.",
      direct:
        "För att hämta saldon och transaktioner kopplar den här enheten upp sig direkt mot SimpleFIN eller Teller. De leverantörerna ser att förfrågningarna kommer från dig, inte från BudgetArk.",
      inbox:
        'Importerade transaktioner väntar i en granskningsinkorg. Inget hamnar i din budget förrän du godkänner det - om du inte sparar en "godkänn alltid"-regel för en handlare du litar på, vilket du kan ändra eller ta bort när som helst.',
      remove:
        "Du kan ta bort en koppling när som helst. Dess inloggningsuppgifter raderas från den här enheten, och poster du redan godkänt stannar i din budget.",
    },
  },
  exchangeRates: {
    title: "Innan vi hämtar en kurs",
    intro:
      "Omräkningen av dina belopp använder dagens växelkurs. Det här är exakt vad som lämnar din enhet:",
    points: {
      request:
        "Den här enheten begär dagens offentliga kurstabell från en kostnadsfri växelkurstjänst (open.er-api.com). Förfrågan innehåller inget konto, inget belopp och ingen identitet - det är samma tabell som alla får.",
      onDevice:
        "Dina saldon och poster räknas om på den här enheten. Inget om dina finanser skickas någonstans.",
      fallback:
        "Om tjänsten inte kan nås faller BudgetArk tillbaka på de senast sparade kurserna, därefter på en inbyggd uppskattning - du ser vilken som användes innan du bekräftar.",
    },
  },
  holdings: {
    title: "Innan du slår på detta",
    intro: "Innehav i realtid skickar lite data från din enhet. Det här är exakt vad:",
    points: {
      stored:
        "Dina tickersymboler och antal andelar lagras på den här enheten och synkas till din ihopkopplade partner, precis som dina konton.",
      symbolsOnly:
        "För att visa kurser skickas bara dina tickersymboler till BudgetArks kurstjänst ungefär en gång om dagen. Ditt antal andelar, dina saldon och din identitet skickas aldrig.",
      thirdParty: "Kurserna kommer från en extern leverantör av marknadsdata.",
    },
  },
};
