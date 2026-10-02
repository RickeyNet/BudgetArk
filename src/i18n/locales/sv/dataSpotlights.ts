/**
 * BudgetArk - Svenska texter: paketerad data (spotlights)
 * File: src/i18n/locales/sv/dataSpotlights.ts
 *
 * Swedish counterpart of en/dataSpotlights.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Theme names (Deep Sea,
 * Slate, Lighthouse, ...) and product names stay untranslated. The `guide`
 * breadcrumbs name the Swedish labels the user actually sees on screen
 * (tab names from nav.ts, row and tool titles from their own fragments).
 */

import type { Localized } from "../types";
import type { dataSpotlights as en } from "../en/dataSpotlights";

export const dataSpotlights: Localized<typeof en> = {
  "feature-guide": {
    title: "Varje funktion, ett tryck bort",
    blurb:
      "Den nya Funktionsguiden listar allt BudgetArk kan göra, ordnat per flik, med var du hittar varje funktion och hur du använder den i några få steg. Sök på ett ord, läs stegen och hoppa direkt dit.",
    cta: "Öppna Funktionsguiden",
    guide: {
      where: "Fliken Profil → Hjälp → Funktionsguide",
      step1: "Öppna fliken Profil och bläddra till kortet Hjälp.",
      step2: "Tryck på Funktionsguide och bläddra sedan per flik, eller skriv ett ord som ”kvitto” eller ”lön”.",
      step3: "Tryck på en funktion för att se var den finns och stegen för att använda den. Knappen under stegen tar dig direkt dit.",
    },
  },
  languages: {
    title: "BudgetArk talar ditt språk",
    blurb:
      "Varje flik, panel och påminnelse finns nu på tyska, ryska, ukrainska, svenska och norska. Språket följer automatiskt din telefon, eller så väljer du själv under Profil, direkt bredvid Valuta.",
    cta: "Välj språk",
    guide: {
      where: "Fliken Profil → Inställningar → Språk",
      step1: "Öppna fliken Profil och leta upp Språk, direkt bredvid Valuta.",
      step2: "Låt det stå på Automatiskt för att följa telefonen, eller välj ett språk själv.",
      step3: "Alla flikar byter direkt. Loggpåminnelserna och widgeten på hemskärmen följer med.",
    },
  },
  "bill-fulfillment": {
    title: "Räkningar som stämmer av sig själva",
    blurb:
      "Lägg upp en räkning en gång med din bästa uppskattning. När den verkliga el- eller vattenavgiften kommer - från banken eller inknappad - kopplar du den till räkningen, och det faktiska beloppet ersätter uppskattningen för den månaden, överallt. Ingen dubbelräkning, ingen ändring av planen.",
    cta: "Logga en räknings faktiska belopp",
    guide: {
      where: "Fliken Budget → + Ny post → Gäller räkningen",
      step1: "Lägg till en återkommande utgift en gång, med din bästa uppskattning som belopp.",
      step2: "När den verkliga dragningen kommer lägger du till den som utgift och väljer räkningen under Gäller räkningen. I granskningsinkorgen erbjuder importerade dragningar samma lista.",
      step3: "Det faktiska beloppet ersätter uppskattningen för den månaden överallt - i budgeten, kalendern och kassaflödeskortet.",
    },
  },
  "bank-card-balances": {
    title: "Kreditkort som håller koll på sig själva",
    blurb:
      "Koppla ett kort på fliken Skulder till bankkontot bakom det, så uppdateras saldot efter varje synk - samma koppling stämplar kortets senaste användning för aktivitetsbevakningen. Ett val per kort, och skulderna håller i stort sett koll på sig själva.",
    cta: "Koppla ett kort",
    guide: {
      where: "Fliken Skulder → tryck på ett kort → Redigera → Kopplat bankkonto",
      step1: "Koppla din bank först under Profil → Bankkopplingar.",
      step2: "Öppna kortet på fliken Skulder, tryck på Redigera och välj det bankkonto som är det här kortet under Kopplat bankkonto.",
      step3: "Efter varje synk landar kortets saldo här av sig självt; med aktivitetsbevakningen på stämplar köpen också senaste användning.",
    },
  },
  "cash-flow-budget": {
    title: "Vet vad som är kvar att spendera",
    blurb:
      "Berätta för BudgetArk vad som finns på lönekontot i början av månaden, så räknar fliken Budget ut var månaden slutar - inkomster in, räkningar och minimibetalningar ut - med ett riktigt kvar-att-spendera-belopp i stället för en gissning.",
    guide: {
      where: "Fliken Budget → kassaflödeskortet högst upp",
      step1: "I början av en månad svarar du på frågan om ingående saldo med vad som finns på lönekontot (eller trycker på kassaflödeskortet för att ange det senare).",
      step2: "Kortet räknar fram var månaden slutar: inkomster in, räkningar och minimibetalningar ut.",
      step3: "Läs av beloppet kvar att spendera före ett köp - det tar redan hänsyn till det som återstår att betala.",
    },
  },
  "private-entries": {
    title: "En del utgifter är bara dina",
    blurb:
      "Markera en budgetpost som privat så synkas den aldrig till din partners enhet - perfekt för presenter och överraskningar. Den räknas fortfarande i din egen budget och följer med i dina säkerhetskopior; bara delningen ändras.",
    cta: "Lägg till en privat post",
    guide: {
      where: "Fliken Budget → + Ny post → 🔒 Privat",
      step1: "Lägg till eller redigera en post och slå på reglaget 🔒 Privat.",
      step2: "Posten stannar i din egen budget och dina säkerhetskopior, men lämnar aldrig telefonen för din partners enhet vid synk.",
      step3: "Stänger du av det senare synkas den vid nästa pass; en kopia som redan synkats dras inte tillbaka.",
    },
  },
  "card-keep-alive": {
    title: "Låt inte ett vilande kort stängas",
    blurb:
      "Kortutgivare kan stänga ett kreditkort som ligger oanvänt - och din kreditvärdighet tar smällen. Slå på aktivitetsbevakningen för valfritt kort så varnar BudgetArk dig innan inaktivitetsfönstret löper ut, direkt på Bryggan.",
    cta: "Ställ in kortbevakning",
    guide: {
      where: "Fliken Skulder → tryck på ett kort → Redigera → Aktivitetsbevakning",
      step1: "Öppna ett kreditkort på fliken Skulder och tryck på Redigera.",
      step2: "Slå på aktivitetsbevakningen och ange det tillåtna inaktivitetsfönstret - det varierar mellan utgivare, 6 till 12 månader är vanligt.",
      step3: "Logga ett köp på kortet (eller låt ett kopplat bankkonto stämpla det) för att nollställa klockan. En banner på Bryggan varnar innan fönstret löper ut.",
    },
  },
  "income-types": {
    title: "W-2 eller 1099? Märk dina löneutbetalningar",
    blurb:
      "Markera inkomst som W-2-lön eller 1099-uppdragsersättning. W-2-poster kan följa 401(k)-avdraget från varje utbetalning, och 1099-poster visar exakt hur mycket du ska sätta undan till skatt - summerat per månad i din Budget.",
    cta: "Logga en löneutbetalning",
    guide: {
      where: "Fliken Budget → + Ny post → Inkomst → typ av inkomst",
      step1: "Lägg till en inkomstpost och välj W-2-lön eller 1099 / uppdragstagare.",
      step2: "För W-2 anger du 401(k)-avdraget från utbetalningen; för 1099 anger du andelen att sätta undan till skatt (25-30 % är en vanlig start).",
      step3: "Fliken Budget summerar avdrag och avsättning varje månad, och 1099-inkomster matar verktyget Kvartalsskatt på Sjökort.",
    },
  },
  "bank-connections": {
    title: "Din bank på autopilot",
    blurb:
      "Koppla din bank och låt transaktionerna importera sig själva - inget hamnar i din budget förrän du godkänner det i granskningsinkorgen. Dina inloggningsuppgifter förblir krypterade på den här enheten; BudgetArk har ingen server och står aldrig mellan dig och din bank.",
    cta: "Ställ in en koppling",
    guide: {
      where: "Fliken Profil → Bankkopplingar",
      step1: "Öppna Profil → Bankkopplingar och lägg till en koppling. Guiden leder dig genom SimpleFIN eller Teller - ditt eget konto hos dem.",
      step2: "Välj vilka konton som ska importeras och var deras saldon ska landa på Bryggan.",
      step3: "Nya transaktioner väntar i granskningsinkorgen på fliken Budget tills du godkänner, kategoriserar eller hoppar över dem. Inget hamnar i din budget av sig självt.",
    },
  },
  "business-expenses": {
    title: "Företagsutgifter, sorterade",
    blurb:
      "Märk valfri utgift med ett företag eller en sidoverksamhet och ta sedan fram en deklarationsrapport med summor per företag och en CSV till din revisor. Märkta poster räknas fortfarande i din vanliga budget - uppdelningen sker i rapporten.",
    cta: "Skapa ett företag",
    guide: {
      where: "Fliken Profil → Företag",
      step1: "Skapa ett företag under Profil → Företag.",
      step2: "När du lägger till en utgift på fliken Budget märker du den med företaget. Den räknas fortfarande i din privata budget.",
      step3: "Tillbaka under Profil → Företag öppnar du rapporten med summor per företag och år samt en CSV till din revisor.",
    },
  },
  "people-assignment": {
    title: "Vem spenderade det?",
    blurb:
      "Lägg till personerna i ditt hushåll och tilldela dem valfri utgift - när du lägger till poster eller godkänner importerade banktransaktioner. Varje post visar vem den tillhör, så att gemensamma utgifter äntligen får namn.",
    cta: "Lägg till dina personer",
    guide: {
      where: "Fliken Profil → Personer",
      step1: "Lägg till personerna i ditt hushåll under Profil → Personer.",
      step2: "När du lägger till en utgift, eller godkänner en i granskningsinkorgen, väljer du vem den var för - en person, eller alla som delade på den.",
      step3: "Varje post visar sina namn; delade utgifter delas lika i rapporterna per person.",
    },
  },
  "receipt-photos": {
    title: "Bifoga kvittot",
    blurb:
      "Fota upp till tre kvitton till valfri post, direkt i formulären Lägg till och Redigera. Bilderna krypteras innan de sparas och lämnar aldrig din telefon om du inte själv exporterar dem.",
    cta: "Lägg till en post",
    guide: {
      where: "Fliken Budget → + Ny post → Kvittofoton",
      step1: "Lägg till eller redigera en utgift och bläddra ner till Kvittofoton.",
      step2: "Ta ett foto eller välj ett från bildbiblioteket - upp till tre per post.",
      step3: "Fotona krypteras på den här telefonen och hålls utanför partnersynk och säkerhetskopior. Att exportera dem är en separat, uttrycklig åtgärd.",
    },
  },
  "tracking-reminders": {
    title: "Vänliga loggpåminnelser",
    blurb:
      "Välj att få en påminnelse när du inte loggat utgifter på ett tag, eller en påminnelse vid ny månad om att sätta dina mål. Allt schemaläggs på din telefon - inget om dina finanser visas någonsin på låsskärmen.",
    cta: "Ställ in påminnelser",
    guide: {
      where: "Fliken Profil → Inställningar → Loggpåminnelser",
      step1: "Öppna Profil → Loggpåminnelser och slå på de påminnelser du vill ha: en avstämning efter en tyst period, eller en påminnelse vid ny månad.",
      step2: "Tillåt aviseringar när telefonen frågar.",
      step3: "Påminnelserna schemaläggs bara på den här telefonen och nämner aldrig belopp eller konton.",
    },
  },
  "account-change-tracker": {
    title: "Se dina konton stiga och sjunka",
    blurb:
      "Varje konto och kategori på Bryggan visar nu hur mycket det gått upp eller ner under perioden du väljer - en dag, en vecka, en månad eller ett kvartal. Följs privat på den här telefonen utifrån dina egna saldon och kurser; inget lämnar enheten.",
    cta: "Gå till Bryggan",
    guide: {
      where: "Fliken Bryggan → Förändring ovanför dina konton",
      step1: "Öppna Bryggan och välj en period med knapparna under Förändring: en dag, en vecka, en månad eller ett kvartal.",
      step2: "Varje konto och kategori visar hur mycket det gått upp eller ner under den perioden.",
      step3: "Historiken byggs upp från en daglig ögonblicksbild som tas på den här telefonen, så de första dagarna visar mindre än en hel period.",
    },
  },
  "what-if-spending": {
    title: "Tänk om du slutade lägga pengar på…?",
    blurb:
      "Välj en utgiftskategori och se vad det kan ge att styra om pengarna: hur mycket tidigare du blir skuldfri, räntan du slipper eller vad de växer till på 1, 5 och 10 år. Du hittar det under Verktyg på fliken Sjökort.",
    cta: "Kör Tänk om",
    guide: {
      where: "Fliken Sjökort → Verktyg → Tänk om jag slutade lägga pengar på…",
      step1: "Öppna fliken Sjökort, bläddra till Verktyg och tryck på Tänk om jag slutade lägga pengar på….",
      step2: "Välj en kategori; BudgetArk använder ditt verkliga månadssnitt för den.",
      step3: "Jämför utfallen: skuldfri tidigare och ränta du slipper, eller vad pengarna växer till på 1, 5 och 10 år.",
    },
  },
  "purchase-planner": {
    title: "Planera ett inköp, behåll dina mål",
    blurb:
      "Namnge det du sparar till så bygger BudgetArk målsparandet runt det: ett månadsbelopp som passar ditt verkliga kassaflöde, månaden då det är klart och råd anpassade till ditt steg i Bygg din ark - så att inköpet aldrig spårar ur planen.",
    cta: "Planera ett inköp",
    guide: {
      where: "Fliken Sjökort → Verktyg → Planera ett inköp",
      step1: "Öppna Sjökort → Verktyg → Planera ett inköp och ange vad du sparar till, priset och när du vill ha det.",
      step2: "BudgetArk föreslår ett månadsbelopp som passar ditt kassaflöde och säger vilken månad det är klart.",
      step3: "Sparade planer visas på kortet Inköpsplaner på Bryggan, där du loggar det du satt undan.",
    },
  },
  "take-home-pay": {
    title: "Vad som faktiskt landar på kontot",
    blurb:
      "Ange lön, deklarationsstatus och delstat och se din verkliga nettolön per utbetalning - federal skatt, delstatsskatt, Social Security och Medicare, allt från inbyggda skattetabeller som aldrig ringer hem. Tryck på en annan delstat för att se vad samma lön ger där.",
    cta: "Uppskatta din nettolön",
    guide: {
      where: "Fliken Sjökort → Verktyg → Nettolön",
      step1: "Öppna Sjökort → Verktyg → Nettolön och ange lön, deklarationsstatus och delstat.",
      step2: "Läs av nettolönen per utbetalning med federal skatt, delstatsskatt, Social Security och Medicare uppdelade var för sig.",
      step3: "Tryck på en annan delstat för att jämföra vad samma lön ger där. Endast amerikanska skattetabeller, inbyggda i appen - inget skickas någonstans.",
    },
  },
  "app-lock": {
    title: "Lås appen med en PIN-kod",
    blurb:
      "Slå på applåset så frågar BudgetArk efter en PIN-kod med 4-8 siffror varje gång appen öppnas, så att ingen som lånar din telefon kan bläddra i dina finanser. PIN-koden stannar på den här enheten - synkas, exporteras eller säkerhetskopieras aldrig.",
    cta: "Ställ in applås",
    guide: {
      where: "Fliken Profil → Inställningar → Applås",
      step1: "Öppna Profil → Applås och slå på det.",
      step2: "Välj en PIN-kod med 4-8 siffror och bekräfta den.",
      step3: "BudgetArk frågar efter PIN-koden varje gång appen öppnas. Den stannar på den här enheten - synkas, exporteras eller säkerhetskopieras aldrig - så förvara den på ett säkert ställe.",
    },
  },
  "theme-fleet": {
    title: "Sju nya teman till din ark",
    blurb:
      "Deep Sea, Slate, Classic, Lighthouse, Chart Room, Harbor Dawn och Ledger har anslutit till flottan - från djuphavsblått med självlysande sken till ett högkontrasttema granskat för läsbarhet, ett sjökort, en persikofärgad soluppgång och klassiskt grönt bokföringspapper. Prova alla under Utseende.",
    cta: "Bläddra bland teman",
    guide: {
      where: "Fliken Profil → Utseende → Tema",
      step1: "Öppna Profil → Utseende och tryck på Tema.",
      step2: "Välj ett tema; hela appen byter medan du trycker.",
      step3: "Designstil och Bakgrundseffekter på samma kort justerar glaskorten och den rörliga bakgrunden.",
    },
  },
  "subscription-detective": {
    title: "Prenumerationsdetektiven",
    blurb:
      "Ett nytt verktyg på fliken Sjökort hittar bankimporterade dragningar som återkommer som en prenumeration - månadsvis eller årsvis - utan någon räkning registrerad, räknar ihop vad de kostar per år och gör var och en till en återkommande räkning med ett tryck.",
    cta: "Kör detektiven",
    guide: {
      where: "Fliken Sjökort → Verktyg → Prenumerationsdetektiven",
      step1: "Koppla en bank eller importera ett kontoutdrag först - detektiven läser importerade dragningar.",
      step2: "Öppna Sjökort → Verktyg → Prenumerationsdetektiven för att se dragningar som återkommer månadsvis eller årsvis utan registrerad räkning, och vad de kostar per år.",
      step3: "Tryck på en för att göra den till en återkommande räkning; framtida dragningar kopplas till den automatiskt.",
    },
  },
  "owed-to-you": {
    title: "Att få tillbaka",
    blurb:
      "Lånat ut pengar till någon? Namnge personen på utgiften när du loggar den (eller i granskningsinkorgen), följ sedan vad hen fortfarande är skyldig och logga varje återbetalning under Profil → Personer → Att få tillbaka.",
    cta: "Öppna Att få tillbaka",
    guide: {
      where: "Fliken Profil → Personer → Att få tillbaka",
      step1: "När du loggar en utgift du väntar dig tillbaka fyller du i Utlånat till någon? med personens namn.",
      step2: "Öppna Profil → Personer → Att få tillbaka för att se vad varje person fortfarande är skyldig.",
      step3: "Logga varje återbetalning där; saldot krymper tills allt är reglerat.",
    },
  },
  "net-worth-goal": {
    title: "Vart din nettoförmögenhet är på väg",
    blurb:
      "Bryggan drar nu din nettoförmögenhetslinje framåt utifrån budgetens månadsöverskott och dina skulder på minimibetalning. Sätt ett mål - ett belopp till en viss månad - och se om du ligger i fas eller inte, vad det skulle kräva per månad och när dagens takt tar dig dit.",
    cta: "Se prognosen",
    guide: {
      where: "Fliken Bryggan → kortet Vart det här är på väg",
      step1: "Öppna Bryggan och leta upp nettoförmögenhetsdiagrammet under dina konton.",
      step2: "Tryck på Sätt ett mål för nettoförmögenheten och ange ett belopp och en månad.",
      step3: "Kortet säger om du ligger i fas eller inte, vad det skulle kräva per månad och när dagens takt tar dig dit.",
    },
  },
  "paycheck-cycle": {
    title: "Till lönen",
    blurb:
      "Budgetera per löneperiod i stället för kalendermånad: berätta för BudgetArk när du får lön så visar fliken Budget vad som ska betalas före nästa utbetalning och vad som är kvar att spendera till dess.",
    cta: "Ställ in löneperioder",
    guide: {
      where: "Fliken Budget → kortet Till lönen",
      step1: "På fliken Budget trycker du på Ställ in löneperioder på kortet Till lönen.",
      step2: "Ange när du får lön och hur ofta.",
      step3: "Kortet visar vad som ska betalas före nästa utbetalning och, med ett ingående saldo angivet, vad som är kvar att spendera till lönen.",
    },
  },
  "quarterly-taxes": {
    title: "Kvartalsskatt",
    blurb:
      "Logga 1099-inkomster så visar det nya verktyget på Sjökort varje IRS-kvartal: vad du tjänat, vad du satt undan, den beräknade betalningen och dess förfallodag - med Markera som betald per kvartal.",
    cta: "Visa mina kvartal",
    guide: {
      where: "Fliken Sjökort → Verktyg → Kvartalsskatt",
      step1: "Logga inkomst som 1099 / uppdragstagare med en andel att sätta undan till skatt.",
      step2: "Öppna Sjökort → Verktyg → Kvartalsskatt för att se varje IRS-kvartal: intjänat, undansatt, den beräknade betalningen och dess förfallodag.",
      step3: "Tryck på Markera som betald när du har skickat ett kvartals betalning.",
    },
  },
  "purchase-plan-priorities": {
    title: "Inköpsplaner, i ordning",
    blurb:
      "Kortet Inköpsplaner räknar nu ihop allt - sparat, kvar att spara och när allt är finansierat - och låter dig rangordna planerna minst först, mest brådskande först eller i din egen ordning. Sätt ett månadsbelopp så rinner det ner genom listan som en skuldsnöboll, där varje plan rullar över i nästa.",
    cta: "Se dina planer",
    guide: {
      where: "Fliken Bryggan → kortet Inköpsplaner → Ordning",
      step1: "Spara två eller fler planer med Planera ett inköp på fliken Sjökort.",
      step2: "På kortet Inköpsplaner på Bryggan väljer du en Ordning: minsta först, behövs snarast eller din egen.",
      step3: "Sätt ett månadsbelopp; det finansierar den första planen och rullar sedan över i nästa som en skuldsnöboll.",
    },
  },
  "bank-statement-import": {
    title: "Importera ett kontoutdrag",
    blurb:
      "Ladda ner en CSV från bankens webbplats så läser BudgetArk den: bekräfta en gång vilka kolumner som är datum, beskrivning och belopp, så hamnar varje transaktion i granskningsinkorgen för godkännande. För månaderna innan du kopplade en bank - eller en bank du aldrig kommer att koppla.",
    cta: "Importera ett kontoutdrag",
    guide: {
      where: "Fliken Profil → Data → Importera → Kontoutdrag",
      step1: "Ladda ner en transaktions-CSV från bankens webbplats.",
      step2: "Öppna Profil → Data → Importera → Kontoutdrag och välj filen; bekräfta vilka kolumner som innehåller datum, beskrivning och belopp.",
      step3: "Varje rad landar i granskningsinkorgen på fliken Budget för att godkännas, kategoriseras eller hoppas över. Layouten kommer ihåg per bank, och en ny import dubblerar aldrig något.",
    },
  },
  "tip-jar": {
    title: "Dricksburk",
    blurb:
      "Frivillig engångsdricks, hanteras helt av appbutiken. Låser inte upp något - varje funktion är redan gratis.",
    guide: {
      where: "Fliken Profil → Dricksburk",
      step1: "Öppna Profil → Dricksburk.",
      step2: "Välj ett belopp; appbutiken sköter betalningen. Det låser inte upp något - varje funktion är redan gratis.",
    },
  },
};
