/**
 * BudgetArk - Svenska texter: paketerad data (spotlights)
 * File: src/i18n/locales/sv/dataSpotlights.ts
 *
 * Swedish counterpart of en/dataSpotlights.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Theme names (Deep Sea,
 * Slate, Lighthouse, ...) and product names stay untranslated.
 */

import type { Localized } from "../types";
import type { dataSpotlights as en } from "../en/dataSpotlights";

export const dataSpotlights: Localized<typeof en> = {
  "german-language": {
    title: "BudgetArk talar ditt språk",
    blurb:
      "Varje flik, panel och påminnelse finns nu på tyska, ryska, ukrainska och svenska. Språket följer automatiskt din telefon, eller så väljer du själv under Profil, direkt bredvid Valuta.",
    cta: "Välj språk",
  },
  "bill-fulfillment": {
    title: "Räkningar som stämmer av sig själva",
    blurb:
      "Lägg upp en räkning en gång med din bästa uppskattning. När den verkliga el- eller vattenavgiften kommer - från banken eller inknappad - kopplar du den till räkningen, och det faktiska beloppet ersätter uppskattningen för den månaden, överallt. Ingen dubbelräkning, ingen ändring av planen.",
    cta: "Logga en räknings faktiska belopp",
  },
  "bank-card-balances": {
    title: "Kreditkort som håller koll på sig själva",
    blurb:
      "Koppla ett kort på fliken Skulder till bankkontot bakom det, så uppdateras saldot efter varje synk - samma koppling stämplar kortets senaste användning för aktivitetsbevakningen. Ett val per kort, och skulderna håller i stort sett koll på sig själva.",
    cta: "Koppla ett kort",
  },
  "cash-flow-budget": {
    title: "Vet vad som är kvar att spendera",
    blurb:
      "Berätta för BudgetArk vad som finns på lönekontot i början av månaden, så räknar fliken Budget ut var månaden slutar - inkomster in, räkningar och minimibetalningar ut - med ett riktigt kvar-att-spendera-belopp i stället för en gissning.",
  },
  "private-entries": {
    title: "En del utgifter är bara dina",
    blurb:
      "Markera en budgetpost som privat så synkas den aldrig till din partners enhet - perfekt för presenter och överraskningar. Den räknas fortfarande i din egen budget och följer med i dina säkerhetskopior; bara delningen ändras.",
    cta: "Lägg till en privat post",
  },
  "card-keep-alive": {
    title: "Låt inte ett vilande kort stängas",
    blurb:
      "Kortutgivare kan stänga ett kreditkort som ligger oanvänt - och din kreditvärdighet tar smällen. Slå på aktivitetsbevakningen för valfritt kort så varnar BudgetArk dig innan inaktivitetsfönstret löper ut, direkt på Bryggan.",
    cta: "Ställ in kortbevakning",
  },
  "income-types": {
    title: "W-2 eller 1099? Märk dina löneutbetalningar",
    blurb:
      "Markera inkomst som W-2-lön eller 1099-uppdragsersättning. W-2-poster kan följa 401(k)-avdraget från varje utbetalning, och 1099-poster visar exakt hur mycket du ska sätta undan till skatt - summerat per månad i din Budget.",
    cta: "Logga en löneutbetalning",
  },
  "bank-connections": {
    title: "Din bank på autopilot",
    blurb:
      "Koppla din bank och låt transaktionerna importera sig själva - inget hamnar i din budget förrän du godkänner det i granskningsinkorgen. Dina inloggningsuppgifter förblir krypterade på den här enheten; BudgetArk har ingen server och står aldrig mellan dig och din bank.",
    cta: "Ställ in en koppling",
  },
  "business-expenses": {
    title: "Företagsutgifter, sorterade",
    blurb:
      "Märk valfri utgift med ett företag eller en sidoverksamhet och ta sedan fram en deklarationsrapport med summor per företag och en CSV till din revisor. Märkta poster räknas fortfarande i din vanliga budget - uppdelningen sker i rapporten.",
    cta: "Skapa ett företag",
  },
  "people-assignment": {
    title: "Vem spenderade det?",
    blurb:
      "Lägg till personerna i ditt hushåll och tilldela dem valfri utgift - när du lägger till poster eller godkänner importerade banktransaktioner. Varje post visar vem den tillhör, så att gemensamma utgifter äntligen får namn.",
    cta: "Lägg till dina personer",
  },
  "receipt-photos": {
    title: "Bifoga kvittot",
    blurb:
      "Fota upp till tre kvitton till valfri post, direkt i formulären Lägg till och Redigera. Bilderna krypteras innan de sparas och lämnar aldrig din telefon om du inte själv exporterar dem.",
    cta: "Lägg till en post",
  },
  "tracking-reminders": {
    title: "Vänliga loggpåminnelser",
    blurb:
      "Välj att få en påminnelse när du inte loggat utgifter på ett tag, eller en påminnelse vid ny månad om att sätta dina mål. Allt schemaläggs på din telefon - inget om dina finanser visas någonsin på låsskärmen.",
    cta: "Ställ in påminnelser",
  },
  "account-change-tracker": {
    title: "Se dina konton stiga och sjunka",
    blurb:
      "Varje konto och kategori på Bryggan visar nu hur mycket det gått upp eller ner under perioden du väljer - en dag, en vecka, en månad eller ett kvartal. Följs privat på den här telefonen utifrån dina egna saldon och kurser; inget lämnar enheten.",
    cta: "Gå till Bryggan",
  },
  "what-if-spending": {
    title: "Tänk om du slutade lägga pengar på…?",
    blurb:
      "Välj en utgiftskategori och se vad det kan ge att styra om pengarna: hur mycket tidigare du blir skuldfri, räntan du slipper eller vad de växer till på 1, 5 och 10 år. Du hittar det under Verktyg på fliken Sjökort.",
    cta: "Kör Tänk om",
  },
  "purchase-planner": {
    title: "Planera ett inköp, behåll dina mål",
    blurb:
      "Namnge det du sparar till så bygger BudgetArk målsparandet runt det: ett månadsbelopp som passar ditt verkliga kassaflöde, månaden då det är klart och råd anpassade till ditt steg i Bygg din ark - så att inköpet aldrig spårar ur planen.",
    cta: "Planera ett inköp",
  },
  "take-home-pay": {
    title: "Vad som faktiskt landar på kontot",
    blurb:
      "Ange lön, deklarationsstatus och delstat och se din verkliga nettolön per utbetalning - federal skatt, delstatsskatt, Social Security och Medicare, allt från inbyggda skattetabeller som aldrig ringer hem. Tryck på en annan delstat för att se vad samma lön ger där.",
    cta: "Uppskatta din nettolön",
  },
  "app-lock": {
    title: "Lås appen med en PIN-kod",
    blurb:
      "Slå på applåset så frågar BudgetArk efter en PIN-kod med 4-8 siffror varje gång appen öppnas, så att ingen som lånar din telefon kan bläddra i dina finanser. PIN-koden stannar på den här enheten - synkas, exporteras eller säkerhetskopieras aldrig.",
    cta: "Ställ in applås",
  },
  "theme-fleet": {
    title: "Sju nya teman till din ark",
    blurb:
      "Deep Sea, Slate, Classic, Lighthouse, Chart Room, Harbor Dawn och Ledger har anslutit till flottan - från djuphavsblått med självlysande sken till ett högkontrasttema granskat för läsbarhet, ett sjökort, en persikofärgad soluppgång och klassiskt grönt bokföringspapper. Prova alla under Utseende.",
    cta: "Bläddra bland teman",
  },
  "subscription-detective": {
    title: "Prenumerationsdetektiven",
    blurb:
      "Ett nytt verktyg på fliken Sjökort hittar bankimporterade dragningar som återkommer som en prenumeration - månadsvis eller årsvis - utan någon räkning registrerad, räknar ihop vad de kostar per år och gör var och en till en återkommande räkning med ett tryck.",
    cta: "Kör detektiven",
  },
  "owed-to-you": {
    title: "Att få tillbaka",
    blurb:
      "Lånat ut pengar till någon? Namnge personen på utgiften när du loggar den (eller i granskningsinkorgen), följ sedan vad hen fortfarande är skyldig och logga varje återbetalning under Profil → Personer → Att få tillbaka.",
    cta: "Öppna Att få tillbaka",
  },
  "net-worth-goal": {
    title: "Vart din nettoförmögenhet är på väg",
    blurb:
      "Bryggan drar nu din nettoförmögenhetslinje framåt utifrån budgetens månadsöverskott och dina skulder på minimibetalning. Sätt ett mål - ett belopp till en viss månad - och se om du ligger i fas eller inte, vad det skulle kräva per månad och när dagens takt tar dig dit.",
    cta: "Se prognosen",
  },
  "paycheck-cycle": {
    title: "Till lönen",
    blurb:
      "Budgetera per löneperiod i stället för kalendermånad: berätta för BudgetArk när du får lön så visar fliken Budget vad som ska betalas före nästa utbetalning och vad som är kvar att spendera till dess.",
    cta: "Ställ in löneperioder",
  },
  "quarterly-taxes": {
    title: "Kvartalsskatt",
    blurb:
      "Logga 1099-inkomster så visar det nya verktyget på Sjökort varje IRS-kvartal: vad du tjänat, vad du satt undan, den beräknade betalningen och dess förfallodag - med Markera som betald per kvartal.",
    cta: "Visa mina kvartal",
  },
  "purchase-plan-priorities": {
    title: "Inköpsplaner, i ordning",
    blurb:
      "Kortet Inköpsplaner räknar nu ihop allt - sparat, kvar att spara och när allt är finansierat - och låter dig rangordna planerna minst först, mest brådskande först eller i din egen ordning. Sätt ett månadsbelopp så rinner det ner genom listan som en skuldsnöboll, där varje plan rullar över i nästa.",
    cta: "Se dina planer",
  },
  "bank-statement-import": {
    title: "Importera ett kontoutdrag",
    blurb:
      "Ladda ner en CSV från bankens webbplats så läser BudgetArk den: bekräfta en gång vilka kolumner som är datum, beskrivning och belopp, så hamnar varje transaktion i granskningsinkorgen för godkännande. För månaderna innan du kopplade en bank - eller en bank du aldrig kommer att koppla.",
    cta: "Importera ett kontoutdrag",
  },
  "tip-jar": {
    title: "Dricksburk",
    blurb:
      "Frivillig engångsdricks, hanteras helt av appbutiken. Låser inte upp något - varje funktion är redan gratis.",
  },
};
