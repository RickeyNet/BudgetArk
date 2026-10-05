/**
 * BudgetArk - Svenska texter: paketerad data (coachmarks)
 * File: src/i18n/locales/sv/dataCoachmarks.ts
 *
 * Swedish counterpart of en/dataCoachmarks.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. `keywords` are lowercase,
 * comma-separated search synonyms: Swedish terms plus the product words a
 * Swedish user would still type in English (csv, excel, simplefin, etf).
 * Theme and product names stay untranslated.
 */

import type { Localized } from "../types";
import type { dataCoachmarks as en } from "../en/dataCoachmarks";

export const dataCoachmarks: Localized<typeof en> = {
  DebtTracker: {
    intro: "Skulder - din återbetalningsplan",
    steps: {
      "debts-summary": {
        title: "Dina skulder i korthet",
        body: "Totalt saldo, totalt betalat och det samlade framsteget står här. Ringen till höger visar hur många procent du har betalat av över alla skulder, och nedräkningen under räknar ut dagen då du är skuldfri utifrån din verkliga betalningstakt.",
        detail: "Sammanfattningskortet summerar varje skuld du följer: vad du fortfarande är skyldig, vad du redan har betalat av, och framstegsringen visar andelen som är avklarad. Under det begränsar filtret Mina / Partnerns / Gemensamma listan till en ägare - summorna följer filtret, så ett par kan se vardera sidan med ett tryck. Avbetalda skulder stannar i listan med saldo 0 (med historiken intakt) så att ditt framsteg aldrig tappar det du redan klarat. Direkt under sammanfattningen visar skuldfri-nedräkningen åren, månaderna och dagarna tills du beräknas inte vara skyldig något alls - beräknat ur din verkliga betalningstakt de senaste sex månaderna av loggade betalningar (eller ur dina minimibetalningar tills det finns historik), så en större betalning drar synligt datumet närmare.",
        location: "Fliken Skulder (översta kortet)",
        keywords: "totalt, summa, sammanfattning, framsteg, avbetalt, betalat av, ägare, partner, gemensam, ring, nedräkning, skuldfri, skuldfri-datum, återbetalningsdatum",
      },
      "debts-fab": {
        title: "Lägg till en skuld med +",
        body: "Tryck på + för att lägga till ett kreditkort, ett lån eller ett bolån. Du anger saldo, ränta och minimibetalning - betalningar du registrerar sänker saldot.",
        detail: "Varje skuld får ett namn, aktuellt saldo, effektiv ränta och minimibetalning per månad, plus en typ (Kredit / Privat, Bil eller Hus - typen styr återbetalningsordningen), en ägare, en valfri förfallodag för påminnelser och ett valfritt måldatum för återbetalningen som visar månadsbetalningen som krävs för att nå det. Kreditkort kan läggas till med saldo 0 - praktiskt när du behåller ett avbetalt kort bara för att bevaka det med aktivitetsbevakningen. Allt går att ändra senare via kortets knapp Redigera.",
        location: "Fliken Skulder → knappen +",
        keywords: "lägg till, ny skuld, lån, bolån, kreditkort, ränta, räntesats, effektiv ränta, minimibetalning, måldatum, förfallodag",
      },
      "debts-payments": {
        title: "Logga betalningar löpande",
        body: "Tryck på ett skuldkort för att registrera en betalning eller öppna dess betalningshistorik - varje betalning sänker saldot och räknas mot ditt framsteg. Ge en skuld en förfallodag så påminner BudgetArk dig i appen när den närmar sig, med ett ettrycksförslag att logga minimibetalningen den dag den förfaller.",
        detail: "Fäll ut ett skuldkort och använd Betala för att logga en betalning - överbetalningar kapas så att avrundning i visningen aldrig lämnar ett vilset öre, och ett nollat saldo utlöser ett avbetalningsfirande. Betalningshistoriken (med ta bort och ångra per betalning) ligger också bakom kortet. Ange en förfallodag när du lägger till eller redigerar en skuld så visas en påminnelsebanner ovanför listan när dagen närmar sig; på själva dagen erbjuder en fråga vid appstart att logga minimibetalningen med ett tryck. Avfärdar du en påminnelse tystas den bara den månaden. Loggade betalningar visas också i kategorin Skuldbetalningar på fliken Budget, så båda flikarna stämmer alltid överens.",
        location: "Fliken Skulder → tryck på ett skuldkort",
        keywords: "betalning, betala, logga, historik, förfallodag, påminnelse, banner, minimibetalning, ångra, avbetalning",
      },
      "debts-keepalive": {
        title: "Håll vilande kreditkort aktiva",
        body: "Banker kan stänga ett kreditkort som ligger oanvänt - och din kreditvärdighet tar smällen. Slå på aktivitetsbevakningen för vilket kort som helst så varnar BudgetArk dig innan dess inaktivitetsfönster löper ut.",
        detail: "Redigera en kreditkortsskuld och slå på Håll kortet aktivt. Ange hur lång inaktivitet utgivaren tillåter (3, 6, 12 eller 24 månader - det varierar, 6 är ett tryggt standardval) och hur långt i förväg du vill varnas (14, 30 eller 60 dagar). När fristen närmar sig namnger en banner kortet och dess använd-senast-datum på både Bryggan och fliken Skulder, och en diskret avisering puffar dig - den visar aldrig kortets namn eller något belopp på låsskärmen. Efter ett köp trycker du på Jag använde det på kortet för att nollställa klockan; eller koppla kortet till en bankkoppling så stämplas datumet för senaste användning automatiskt ur dina egna synkade transaktioner. Senare på bannern snoozar ett kort för innevarande månad. Stängt ett kort med flit? Slå bara av dess bevakning.",
        location: "Fliken Skulder → tryck på ett kort → Redigera (endast kreditkort)",
        keywords: "håll aktivt, aktivitetsbevakning, kreditkort, inaktivitet, stängt, avslutat, kreditvärdighet, oanvänt, vilande, avisering, jag använde det, bevakning, frist",
      },
      "debts-strategy": {
        title: "Välj en återbetalningsstrategi",
        body: "Välj Lavin (högst ränta först), Snöboll (minst saldo först) eller behåll din egen ordning. Din strategi styr återbetalningsprognoserna här och i verktygen på fliken Sjökort.",
        detail: "Lavin betalar matematiskt minst ränta genom att angripa den högsta räntan först; Snöboll köper motivation genom att beta av de minsta saldona först; Egen behåller den ordning du själv lägger. Den valda strategin avgör vilken skuld som är ditt fokus (dess kort startar utfällt), formar skuldfri-prognoserna och är det som verktyget Tänk om på fliken Sjökort räknar med när det visar hur omdirigerade utgifter skulle snabba på din återbetalning. Bolån hanteras separat så att ett hus inte begraver planen.",
        location: "Fliken Skulder (strategiraden under sammanfattningen)",
        keywords: "lavin, snöboll, strategi, ordning, ränta, fokus, prognos",
      },
      "debts-milestones": {
        title: "Milstolpar i Bygg din ark",
        body: "Tryck på milstolpekortet för att sätta mål för de 7 ekonomiska milstolparna - startbuffert, skuldfri, buffert, pension och vidare.",
        detail: "Bygg din ark är BudgetArks ekonomiska väg steg för steg: Köl (startbuffert), Skrov (dyra skulder), Däck (full buffert), Förråd (målsparande), Samla djuren (pension och utbildning), Ankare (bolån) och Segel (bygg förmögenhet). Tryck på fältet för att öppna planeraren, sätt dina egna målbelopp och följ framsteget per steg - appen läser dina verkliga saldon, besparingar och skulder för att fylla staplarna. Ditt aktuella steg anpassar också råden på andra ställen, som verktyget Planera ett inköp och dess besked om huruvida ett köp passar just nu.",
        location: "Fliken Skulder → fältet Bygg din ark",
        keywords: "milstolpar, ark, arken, köl, skrov, buffert, steg, plan, baby steps",
      },
    },
  },
  Budget: {
    intro: "Budget - vad som kommer in, vad som går ut",
    steps: {
      "budget-summary": {
        title: "Inkomster mot utgifter",
        body: "Översta kortet visar månadens inkomster, utgifter och netto. Använd pilarna < > ovanför för att titta på tidigare månader - ett helt års historik sparas.",
        detail: "Månadskortet summerar inkomster, utgifter och nettot mellan dem, med W-2- / 1099-markeringar på inkomstrader, en rad för 401(k)-insättningar när du följer dem, och en rad 1099-skattereserv som summerar vad du bör lägga undan för skatt den här månaden. Pilarna < > bläddrar genom tidigare månader - avslutade månader visar exakt vad som hände då och skriver aldrig om sig när dagens inställningar ändras. Frågan Månadsöversikt vid månadsslutet sammanfattar hur det gick.",
        location: "Fliken Budget (översta kortet)",
        keywords: "inkomst, utgift, netto, månad, historik, sammanfattning, månadsöversikt, pilar",
      },
      "budget-cashflow": {
        title: "Kassaflöde - vad som är kvar att spendera",
        body: "Berätta för BudgetArk i början av varje månad vad som finns på ditt lönekonto. Kassaflödeskortet räknar fram var månaden slutar - inkomster in, planerade räkningar och minimibetalningar ut - och visar ett belopp kvar att spendera som uppdateras live när du loggar poster.",
        detail: "Kassaflödeskortet förankrar din budget i verkligheten: ett riktigt tal, ditt lönekontosaldo, angivet en gång i månaden (en fråga dyker upp; hoppar du över den stannar en knapp Ange kvar på kortet). Därifrån räknar det fram månadens slut - inkomster in, utgifter ut, planerade räkningar och minimibetalningar inräknade - och visar Kvar att spendera, som rör sig live medan du loggar poster. När du anger en ny månads saldo stäms verkligheten också av mot förra månadens plan (”började 150 $ under plan”), så avvikelser syns direkt. Har du exakt ett lönekonto på din Brygga uppdateras även det när du sparar månadssaldot. Saldohistoriken synkas med din partner och följer med i dina säkerhetskopior.",
        location: "Fliken Budget → kassaflödeskortet",
        keywords: "kassaflöde, kvar att spendera, lönekonto, saldo, prognos, månadsstart, avstämning, kvar",
      },
      "budget-spending": {
        title: "Fördelning per kategori",
        body: "Ringdiagrammet delar upp utgifterna per kategori. Tryck på en kategori för att se posterna i den eller sätta en månadsgräns.",
        detail: "Varje utgift landar i en kategori, och ringen visar vart månaden gick. Tryck på en sektor eller rad för att fälla ut kategorin: varje post i den, med redigera och ta bort, plus en månadsgräns du kan sätta per kategori - gränser följer med månad till månad och vet i innevarande månad vilken dag det är: ett litet märke på varje stapel visar var en jämn fördelning skulle ligga idag, stapeln blir gul när du spenderar snabbare än så, och ett kort Utgiftstakt högst upp på fliken pekar ut varje kategori som ligger över eller är på väg att passera sin gräns. Kategorier grupperas i hinkarna Behov, Önskemål och Sparande (går att flytta under Profil → Kategorier), och du kan skapa egna kategorier för allt som de inbyggda inte täcker.",
        location: "Fliken Budget → utgiftsringen",
        keywords: "kategori, kategorier, ring, diagram, gräns, budgetgräns, takt, i fas, utgiftstakt, behov, önskemål, egen kategori",
      },
      "budget-fab": {
        title: "Lägg till en post med +",
        body: "Inkomst, utgift eller sparpost. Markera allt som upprepas som återkommande så fylls det i automatiskt varje månad. Inkomstposter kan märkas som W-2- eller 1099-lön, och vilken post som helst kan markeras 🔒 Privat så att den aldrig synkas till din partners enhet.",
        detail: "Poster är budgetens hjärta: typ (inkomst / utgift), kategori, belopp, datum (välj dagen det hände - standard är idag, med en Idag-knapp) och en valfri beskrivning. Återkommande poster fyller i sig själva varje månad tills du stoppar dem - perfekt för hyra, prenumerationer och lön. Inkomster kan märkas W-2 (ange nettobeloppet och registrera valfritt de 401(k)-dollar som dragits, så att pensionssparandet ändå räknas) eller 1099 / uppdragstagare (inget dras, så BudgetArk visar hur mycket du bör lägga undan för skatt enligt en procentsats du väljer). Utgifter kan bära upp till tre krypterade kvittofoton och en företagsmärkning. Reglaget 🔒 Privat håller en post helt borta från din ihopkopplade partners enhet - för presenter, överraskningar eller utgifter som helt enkelt är dina - medan den fortfarande räknas i din egen budget, dina säkerhetskopior och exporter (markera den som privat när du skapar den; en kopia som redan synkats stannar hos partnern). Flerradig snabbinmatning låter dig lägga in flera köp på en gång. Räkningar som varierar månad till månad (el, vatten, gas) fungerar bäst som en återkommande uppskattning plus den verkliga dragningen: tryck på Logga faktiskt belopp på räkningens rad, eller välj räkningen under Gäller räkningen när du lägger till utgiften eller godkänner den i granskningsinkorgen, så ersätter det faktiska beloppet den månaden uppskattningen överallt i stället för att läggas ovanpå. När du redigerar en räkning ser du snittet av de senaste faktiska beloppen, med uppdatering med ett tryck.",
        location: "Fliken Budget → knappen +",
        keywords: "lägg till post, inkomst, utgift, återkommande, prenumeration, abonnemang, w-2, w2, 1099, lön, 401k, pension, skatt, lägga undan, privat, present, dölj, hemlig, räkning, faktiskt, el, vatten, uppskattning, gäller räkningen, logga faktiskt belopp",
      },
      "budget-widget": {
        title: "Snabbregistrering från hemskärmen (Android)",
        body: "Lägg till BudgetArks widget från din launchers widgetväljare och logga en utgift med ett tryck - tryck på en kategori så öppnas formuläret Lägg till post med den redan vald.",
        detail: "Håll in på din Android-hemskärm, öppna widgetväljaren och lägg till Snabbregistrering. Widgeten är ett litet rutnät med vardagskategorier - Matvaror, Restaurang, Transport, Shopping, Nöje, Övrigt - och ett tryck på en av dem hoppar rakt in i formuläret Lägg till post med den kategorin förvald, så att ett köp är loggat på några sekunder. Widgeten visar ingenting om din ekonomi - inga saldon, inga summor - så den är säker på vilken hemskärm som helst. (iOS har inte widgeten än.)",
        location: "Android-hemskärm → håll in → Widgetar → BudgetArk",
        keywords: "widget, hemskärm, snabbregistrering, snabbt tillägg, kortkommando, android, launcher",
      },
      "budget-inbox": {
        title: "Granskningsinkorg för bankimporter",
        body: "Kopplat en bank i Profil? Nya transaktioner väntar bakom brickikonen högst upp på den här skärmen - inget kommer in i budgeten förrän du godkänner det. Bocka i Gör alltid så när du godkänner eller hoppar över för att lära BudgetArk en handlarregel, och ändra vilken sparad regel som helst senare via knappen Regler.",
        detail: "Granskningsinkorgen är grinden mellan din bank och din budget: varje importerad transaktion väntar där tills du godkänner, redigerar eller hoppar över den - inget läggs någonsin till i tysthet. Bocka i Gör alltid så när du godkänner så kommer handlarens framtida dragningar förkategoriserade, redo att godkännas i klump med ett tryck; bocka i det när du hoppar över så importeras handlaren (en kreditkortsbetalning, en överföring) aldrig igen. Knappen Regler i inkorgens huvud listar varje regel du sparat så att du kan växla en handlare mellan hoppa över och kategorisera, välja en annan kategori eller ta bort regeln - ändringar gäller framtida importer och allt som fortfarande väntar i inkorgen. Troliga överföringar och troliga dubbletter av handskrivna poster flaggas och läggs åt sidan så att de inte räknas dubbelt, och besluten sparas permanent - en ny synk eller en återställd säkerhetskopia frågar aldrig om.",
        location: "Fliken Budget → brickikonen (högst upp)",
        keywords: "granskningsinkorg, inkorg, bank, import, transaktioner, godkänn, hoppa över, handlare, regler, alltid, ignorera, överföring, dubblett, synk",
      },
      "budget-receipts": {
        title: "Kvitton och företagsutgifter",
        body: "Bifoga upp till tre kvittofoton till vilken post som helst - de krypteras och lämnar aldrig den här telefonen. Märk en utgift med ett företag (företag sätter du upp i Profil) så får den ett 💼-märke; en rapport inför deklarationen med CSV- och kvittoexport finns under Profil → Företagsutgifter.",
        detail: "Fota eller välj upp till tre kvittofoton i formulären för att lägga till och redigera poster - fotona förminskas, krypteras med samma nyckel som skyddar allt annat och lagras bara på den här telefonen (en ihopkopplad partner ser en platshållare, säkerhetskopior hoppar över dem och ingenting laddas någonsin upp). Skapa företag under Profil → Företagsutgifter och märk sedan vilken utgift som helst med ett; märkta poster räknas ändå i din vanliga budget - uppdelningen sker inför deklarationen, när företagsutgiftsrapporten ger summor per företag och kategori, en CSV redo för revisorn och en valfri zip med årets kvittofoton namngivna så att de matchar CSV-raderna. Exporter sker bara när du uttryckligen bekräftar dem.",
        location: "Fliken Budget → + / redigera en post · Profil → Företagsutgifter",
        keywords: "kvitto, foto, kamera, bilaga, företag, skatt, deklaration, rapport, csv, export, revisor, zip",
      },
    },
  },
  Bridge: {
    intro: "Bryggan - din nettoförmögenhet",
    steps: {
      "bridge-history": {
        title: "Din nettoförmögenhet",
        body: "Nettoförmögenhet = allt du äger minus allt du är skyldig. Den stora siffran samlar skulder, besparingar, pension, investeringar och följda konton. Diagrammet under ritar nettoförmögenheten över tid - ögonblicksbilder sparas automatiskt när saldon ändras.",
        detail: "Bryggan är din ekonomiska kommandobrygga och appens startflik. Rubriksiffran är tillgångar (konton, besparingar, värderade investeringar) minus skulder (de skulder du följer), och diagrammet ritar den över tid ur ögonblicksbilder som appen registrerar automatiskt så snart saldon ändras - ingen bokföring för hand. Ett kassaflödesdiagram under jämför de senaste månadernas inkomster och utgifter i korthet. Allt på den här skärmen beräknas på din telefon ur din egen data.",
        location: "Fliken Bryggan (övre diagrammet)",
        keywords: "nettoförmögenhet, tillgångar, skulder, diagram, historik, ögonblicksbild, kassaflöde",
      },
      "bridge-accounts": {
        title: "Hantera dina konton",
        body: "Lägg till spar-, pensions-, depå- eller vilket konto som helst du vill räkna in i nettoförmögenheten. Tryck på en rad för att uppdatera saldot när du vill - ändringarna flödar tillbaka in i Bryggan. Konton kopplade till en bankkoppling håller sina saldon aktuella automatiskt efter varje synk.",
        detail: "Kontokortet rymmer allt du äger: lönekonton, sparkonton, buffert, pensionskonton, depåer, HSA:er - grupperade per kategori med summor per kategori. Tryck på + Lägg till för att skapa ett, tryck på en rad för att uppdatera saldot eller redigera det. Konton matchade mot en bankkoppling (Profil → Bankkopplingar) uppdaterar sig själva efter varje synk, så deras saldon - och din nettoförmögenhet - hålls aktuella utan att du skriver något. Investeringskonton kan värderas via sina innehav i realtid i stället för ett inskrivet saldo.",
        location: "Fliken Bryggan → kontokortet",
        keywords: "konton, sparande, lönekonto, pension, hsa, depå, saldo, lägg till konto, kopplat",
      },
      "bridge-changes": {
        title: "Se konton stiga och falla",
        body: "Varje kontorad och kategorirubrik visar hur mycket den gått upp eller ner - använd omkopplaren 1d / 7d / 30d / 90d för att byta tidsfönster. Historiken bakom registreras privat på den här telefonen medan du använder appen, så siffrorna dyker upp från din andra dag.",
        detail: "Under varje kontorad och kategorirubrik visar en upp/ner-rad förändringen i det fönster du väljer - en dag, en vecka, en månad eller ett kvartal - grönt för upp, rött för ner, både i belopp och procent. Kontantkonton följer dina saldoändringar; depå- och pensionskonton rör sig med sina innehavs kurser. Den dagliga värdehistoriken bakom fångas privat på den här telefonen medan du använder appen - den synkas aldrig och lämnar aldrig enheten - så varje enhet bygger sina egna utgångsvärden från dagen efter att du först använder den här versionen.",
        location: "Fliken Bryggan → omkopplaren 1d / 7d / 30d / 90d",
        keywords: "stiga, falla, förändring, upp, ner, delta, fönster, tidsfönster, bevakning, vinst, förlust",
      },
      "bridge-plans": {
        title: "Inköpsplaner",
        body: "Målsparanden du startar med verktyget Planera ett inköp på fliken Sjökort följs här: en framstegsstapel per plan, månadstakten ett måldatum kräver och insättning med ett tryck. Sparade pengar räknas in i din nettoförmögenhet, och en fullt sparad plan säger till när den är klar att köpa.",
        detail: "Varje inköpsplan du startar på fliken Sjökort lever här som ett målsparande: en framstegsstapel mot priset, månadstakten som krävs när du satt ett behövs-senast-datum och insättning med ett tryck för att lägga till (eller rätta) sparade pengar. En fullt sparad plan flaggar sig själv som klar att köpa. Planer räknas in i din nettoförmögenhet som allt annat sparande, synkas med din ihopkopplade partner och följer med i dina säkerhetskopior. Planer i kategorin Utbildning matar dessutom Arkens utbildningsmilstolpe automatiskt.",
        location: "Fliken Bryggan → kortet Inköpsplaner",
        keywords: "inköp, planer, målsparande, spara ihop, mål, sätt in, klar att köpa",
      },
      "bridge-holdings": {
        title: "Följ aktier och ETF:er per mäklare (Innehav i realtid)",
        body: "Slå på Innehav i realtid för att följa aktier och ETF:er, ordnade per mäklare. Varje mäklare (som Fidelity) ligger i avsnittet Investeringar bland dina konton - tryck på den för att fälla ut dess innehav, med en summa per mäklare och en total över alla. Lägg till en position med ticker och antal, så räknas dess marknadsvärde in i din nettoförmögenhet. Kurserna uppdateras bara när du trycker på Uppdatera kurser, så lägg till alla dina tickers först och hämta kurserna en gång. Funktionen är av tills du slår på den här eller i Profil, och första gången ser du exakt vad som lämnar din enhet. Bara dina tickersymboler skickas någonsin ut för att slå upp kurser - aldrig antal, saldon eller vem du är.",
        detail: "Innehav i realtid är strikt frivilligt. När det är på fäller varje mäklarkonto i avsnittet Investeringar ut sina positioner - lägg till en med tickersymbol och antal, så rullar dess marknadsvärde (antal × senaste kurs) in i mäklarens summa och din nettoförmögenhet. Kurserna uppdateras bara när du trycker på Uppdatera kurser; stora portföljer hämtas i omgångar, och knappen säger till om några tickers fortfarande är på väg. Sekretesskontraktet är exakt: bara tickersymboler lämnar din telefon för att slå upp kurser - aldrig antal, saldon eller något som identifierar dig - och du ser ett klarspråkigt meddelande innan första förfrågan.",
        location: "Fliken Bryggan → investeringskonton (frivilligt)",
        keywords: "aktier, etf, innehav, ticker, andelar, antal, mäklare, fidelity, kurser, investera, depå, portfölj",
      },
    },
  },
  Utilities: {
    intro: "Sjökort - lektioner, kalkylatorer och prognoser",
    steps: {
      "charts-course": {
        title: "Kaptenskursen",
        body: "En gratis kurs i privatekonomi i 5 kapitel och 24 korta lektioner - budgetgrunder, bli av med skulder, sparande, investeringar och långsiktig förmögenhet. Ditt framsteg sparas, och du kan läsa lektionerna i vilken ordning du vill.",
        detail: "Fem kapitel, 24 korta lektioner, helt gratis och läsbara i vilken ordning du vill: Sätta segel (budgetgrunder), Laga skrovet (skulder), Fylla kabyssen (buffert, sparkonto med hög ränta, målsparande), Fånga vinden (ränta på ränta, indexfonder, 401(k)/IRA/Roth, vanliga misstag) och Kartlägga fjärran vatten (nettoförmögenhet, köpa eller hyra, försäkringar, arvsgrunder). Lektioner som föreslår att du öppnar ett konto namnger riktiga, etablerade aktörer och vad var och en är bra på - ingen betalar BudgetArk för att vara med. Ditt läsframsteg sparas så att du kan fortsätta där du slutade. Själva lektionerna är för närvarande på engelska.",
        location: "Fliken Sjökort (översta kortet)",
        keywords: "kurs, lektioner, lära, utbildning, investera, indexfonder, kapten, kapitel",
      },
      "utilities-tool": {
        title: "Ekonomiska kalkylatorer",
        body: "Tryck på ett verktygshuvud för att fälla ut det: ränta på ränta, en lånekalkylator med exporterbar betalningsplan, en brytpunktskoll för omläggning av lån, en buffertplanerare, en valutaomvandlare och en amerikansk nettolönekalkylator som visar vad en lön faktiskt lämnar på kontot varje löneutbetalning. De här verktygen skriver aldrig till din data.",
        detail: "Sex sandlådekalkylatorer, var och en bakom ett utfällbart huvud: ränta på ränta med en S&P 500-förinställning som realistisk långsiktig bas; en lånekalkylator som tar fram hela amorteringsplanen (exporterbar); ett omläggningsverktyg som hittar brytpunktsmånaden mellan uppläggningskostnader och den lägre räntan; en buffertplanerare dimensionerad efter dina verkliga månadsnödvändigheter; en valutaomvandlare (USD, EUR, GBP, CAD, JPY, SEK) som visar exakt hur färska dess kurser är och ändå svarar offline; och en nettolönekalkylator - ange en amerikansk lön, deklarationsstatus och delstat för att se federal skatt, delstatsskatt, Social Security och Medicare, din effektiva skattesats och marginalskatt, valfria 401(k)-/HSA-/premieavdrag och vad samma lön behåller i en annan delstat. Skatteverktyget räknar helt ur paketerade IRS- och delstatstabeller - ingenting du skriver lämnar telefonen. Det här är rena sandlådor - de läser inget privat och skriver inget till din data.",
        location: "Fliken Sjökort → verktygshuvuden",
        keywords: "kalkylator, ränta på ränta, lån, amortering, omläggning, refinansiering, buffert, verktyg, reglage, valuta, växelkurs, omvandla, fx, nettolön, netto, lön, skatt, löneutbetalning, delstat, avdrag",
      },
      "charts-what-if": {
        title: "Tänk om jag slutade lägga pengar på…",
        body: "Välj en av dina utgiftskategorier och se två framtider sida vid sida: hur mycket tidigare du skulle bli skuldfri (och räntan du skulle slippa), eller vad de pengarna skulle växa till efter 1, 5 och 10 år. Beräknat ur din egen budgethistorik, helt på den här telefonen.",
        detail: "Verktyget läser ditt verkliga snitt för varje utgiftskategori över de senaste sex registrerade månaderna och låter dig sedan ställa in hur mycket av det du skulle omdirigera. Skuldsidan kör om din faktiska återbetalningsplan (snöboll eller lavin, du väljer) med de extra pengarna och visar sparade månader plus total ränta över löptiden du slipper; sparsidan visar vad samma månadsbelopp växer till efter 1, 5 och 10 år med ett angivet antagande om 7 %. Allt beräknas ur dina egna poster, på din telefon - det är en spegel, inte en gissning.",
        location: "Fliken Sjökort → verktyget Tänk om",
        keywords: "tänk om, sluta spendera, omdirigera, prognos, tidigare, sparad ränta, tillväxt",
      },
      "charts-purchase": {
        title: "Planera ett inköp",
        body: "Sparar du till något? Namnge det, sätt priset och välj ett månadsbelopp - verktyget visar när det är klart, om takten passar ditt verkliga kassaflöde, och råd anpassade till ditt steg i Bygg din ark så att köpet aldrig spårar ur dina större mål. Startade planer lever i kortet Inköpsplaner på din Brygga, där de följs och räknas in i nettoförmögenheten.",
        detail: "Namnge saken, sätt dess pris och det du redan sparat, och välj sedan ett månadsbelopp på reglaget - verktyget visar månaden då allt är sparat, det månadsbelopp som krävs om du sätter ett behövs-senast-datum, och ett ärligt besked om huruvida den takten passar ditt verkliga kassaflöde (beräknat ur dina senaste sex månaders inkomster och utgifter). Råden anpassar sig till ditt steg i Bygg din ark: gör klart startbufferten först, vad sparbeloppet kostar din skuldåterbetalning, eller grönt ljus att spara ihop och betala kontant. Att starta en plan skapar ett följt målsparande på Bryggan.",
        location: "Fliken Sjökort → Planera ett inköp",
        keywords: "plan, inköp, spara ihop, målsparande, råd med, kassaflöde, måldatum",
      },
    },
  },
  Profile: {
    intro: "Profil - dina inställningar",
    steps: {
      "profile-appearance": {
        title: "Tema, layout och valuta",
        body: "Välj en temapalett, en designstil och en täthet (Kompakt, Bekväm, Luftig) - tätheten ändrar avstånd och textstorlekar i hela appen, och ambienta teman ger en levande bakgrund. Din visningsvaluta ställer du också in här.",
        detail: "Utseende styr hela looken: temapaletter (däribland ambienta teman som Deep Space, Deep Forest och Deep Sea med levande animerade bakgrunder, ljusa teman som Harbor Dawn och Rose, och Lighthouse - ett tema med maximal kontrast där varje färg är avstämd för läsbarhet), en designstil (enfärgade kort eller glas), en täthet som skalar avstånd och text i hela appen, samt textstorlek. Din visningsvaluta finns också här - byter du kan du räkna om dina befintliga belopp eller bara byta symbol, du väljer. Bakgrundseffekter kan stängas av när som helst om du föredrar lugn.",
        location: "Fliken Profil → Utseende",
        keywords: "tema, mörkt läge, ljust läge, utseende, färger, glas, täthet, textstorlek, valuta, ambient, bakgrund, hög kontrast, tillgänglighet, lighthouse",
      },
      "profile-connections": {
        title: "Bankkopplingar (valfritt)",
        body: "Koppla din bank, dina kort eller din depå via konton som DU äger - via SimpleFIN Bridge eller Teller - och låt transaktioner och saldon importera sig själva. En inbyggd installationsguide går igenom kostnad, registrering och sekretess för varje leverantör. Inloggningsuppgifterna förblir krypterade på den här enheten; BudgetArk har ingen server.",
        detail: "Banksynk sker med dina egna konton: du kopplar via SimpleFIN Bridge (en inklistrad token, täcker tusentals amerikanska banker, ca 1,50 $ i månaden betalat direkt till dem) eller Teller (gratisnivå via ditt eget utvecklarkonto) - BudgetArk driver ingen aggregator och står aldrig mellan dig och din bank. En inbyggd guide går igenom varje leverantörs kostnad, registrering och sekretess innan du börjar. Importerade transaktioner väntar i granskningsinkorgen på fliken Budget; matchade konton håller Bryggans saldon aktuella; ett kopplat kreditkort kan mata aktivitetsbevakningen. Inloggningsuppgifter krypteras bara på den här enheten - de synkas aldrig till en partner, följer aldrig med i säkerhetskopior och rör aldrig en server, för det finns ingen.",
        location: "Fliken Profil → Bankkopplingar",
        keywords: "bank, koppling, simplefin, teller, synk, import, koppla, inloggningsuppgifter, installationsguide",
      },
      "profile-sync-data": {
        title: "Partnersynk och säkerhetskopior",
        body: "Koppla ihop med din partners telefon och synka över ert wifi hemma - enhet till enhet, utan moln. Datakortet sköter krypterade säkerhetskopior, kalkylbladsexport/-import och Nollställ all data (som tar dig tillbaka till förstagångsinställningen).",
        detail: "Partnersynk kopplar ihop två telefoner med en kod och synkar sedan direkt över ert wifi hemma - telefon till telefon, krypterat, utan moln emellan. Båda partner ser gemensamma skulder, budgetar och konton; enhetsspecifika saker som bankinloggningar och kvittofoton stannar avsiktligt där de är. Datakortet täcker lösenordsskyddade krypterade säkerhetskopior (exportera en fil, återställ genom att slå ihop eller ersätta), kalkylbladsexport/-import (CSV och xlsx) för att jobba i Excel eller Sheets, och Nollställ all data, som rensar den här enheten och tar dig tillbaka till introduktionen vid första start.",
        location: "Fliken Profil → Partnersynk · Data",
        keywords: "partner, synk, koppla ihop, wifi, säkerhetskopia, backup, återställ, export, import, kalkylblad, excel, csv, nollställ",
      },
      "profile-extras": {
        title: "Utmärkelser, kategorier och mer",
        body: "Loggboken följer utmärkelser medan du använder appen. Du kan också lägga till egna budgetkategorier, hantera företag för utgiftsrapporter, slå på milda loggpåminnelser, aktivera sekretessläget för att blockera skärmdumpar, låsa appen bakom en PIN-kod och lämna en valfri dricks om BudgetArk har hjälpt dig.",
        detail: "Loggboken samlar utmärkelser när du når riktiga milstolpar. Under Kategorier lägger du till egna budgetkategorier och flyttar vilken kategori som helst mellan hinkarna Behov, Önskemål och Sparande. Företagsutgifter hanterar de företag du märker utgifter med och rymmer rapporten inför deklarationen. Loggpåminnelser är frivilliga puffar - en avstämning när du inte loggat utgifter på ett tag och en planeringspåminnelse vid ny månad - schemalagda helt på din telefon utan något känsligt på låsskärmen. Sekretessläget blockerar skärmdumpar och skärminspelning av din ekonomi. Applåset (Inställningar) frågar efter en PIN-kod med 4-8 siffror varje gång appen öppnas, så att någon som lånar din telefon inte kan bläddra i din ekonomi - PIN-koden stannar på den här enheten, säkerhetskopieras eller synkas aldrig, så välj en du kommer ihåg. Och dricksburken tar emot en liten valfri dricks som inte låser upp något, för allt är redan gratis.",
        location: "Fliken Profil → Loggbok · Kategorier · Inställningar",
        keywords: "utmärkelser, loggbok, egna kategorier, loggpåminnelser, påminnelser, aviseringar, sekretessläge, skärmdump, dricksburk, applås, pin, pin-kod, lås, kod, säkerhet",
      },
      "profile-help": {
        title: "Hjälp och introduktion",
        body: "Öppna Introduktion under Hjälp när du vill - det är hela den här guiden på ett sökbart ställe, plus en knapp Gör om introduktionen som kör hela förstagångsflödet igen. Din data behålls alltid.",
        detail: "Raden Introduktion under Hjälp öppnar hela den här guiden som en bläddringsbar, sökbar referens: bläddra per flik eller skriv ett sökord (”kvitto”, ”kreditkort”, ”säkerhetskopia”) för att hoppa rakt till hur något fungerar och var du hittar det. Knappen Gör om introduktionen inuti kör hela förstagångsflödet igen - tema, välkomst, namn och sedan de guidade tipsen flik för flik - utan att röra din data. Varje spotlight-tips under rundturen har dessutom ett reglage Läs mer med samma djup som du läser just nu.",
        location: "Fliken Profil → Hjälp → Introduktion",
        keywords: "hjälp, guide, sök, introduktion, onboarding, gör om, hur gör jag, handledning, genomgång, tips",
      },
    },
  },
};
