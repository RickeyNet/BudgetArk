/**
 * BudgetArk - Norske tekster: pakket data (spotlights)
 * File: src/i18n/locales/nb/dataSpotlights.ts
 *
 * Norwegian (Bokmål) counterpart of en/dataSpotlights.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary. Theme names
 * (Deep Sea, Slate, Lighthouse, ...) and product names stay untranslated.
 * Each `guide.where` breadcrumb names the rows and tools exactly as the
 * Norwegian screens label them (nav.ts tab names, profile/charts rows).
 */

import type { Localized } from "../types";
import type { dataSpotlights as en } from "../en/dataSpotlights";

export const dataSpotlights: Localized<typeof en> = {
  "feature-guide": {
    title: "Hver funksjon, ett trykk unna",
    blurb:
      "Den nye funksjonsguiden lister opp alt BudgetArk kan gjøre, gruppert per fane, med hvor du finner hver funksjon og hvordan du bruker den i noen få steg. Søk etter et ord, les stegene og hopp rett inn.",
    cta: "Åpne funksjonsguiden",
    guide: {
      where: "Profil-fanen → Hjelp → Funksjonsguide",
      step1: "Åpne Profil-fanen og bla til Hjelp-kortet.",
      step2: "Trykk på Funksjonsguide, og bla så per fane eller skriv et ord som «kvittering» eller «lønning».",
      step3: "Trykk på en funksjon for å se hvor den ligger og stegene for å bruke den. Knappen under stegene tar deg rett dit.",
    },
  },
  languages: {
    title: "BudgetArk snakker språket ditt",
    blurb:
      "Hver fane, hvert panel og hver påminnelse finnes nå på tysk, russisk, ukrainsk, svensk og norsk. Språket følger telefonen din automatisk, eller du velger selv under Profil, rett ved siden av Valuta.",
    cta: "Velg et språk",
    guide: {
      where: "Profil-fanen → Innstillinger → Språk",
      step1: "Åpne Profil-fanen og finn Språk, rett ved siden av Valuta.",
      step2: "La det stå på Automatisk for å følge telefonen, eller velg et språk selv.",
      step3: "Hver fane bytter umiddelbart. Loggpåminnelser og widgeten på hjemskjermen følger etter.",
    },
  },
  "bill-fulfillment": {
    title: "Regninger som avstemmer seg selv",
    blurb:
      "Sett opp en regning én gang med ditt beste estimat. Når den faktiske strøm- eller vannregningen kommer - fra banken eller tastet inn - fører du den mot regningen, og det faktiske beløpet erstatter estimatet for den måneden, overalt. Ingen dobbelttelling, ingen redigering av planen.",
    cta: "Logg det faktiske beløpet på en regning",
    guide: {
      where: "Budsjett-fanen → + Legg til post → Gjelder regningen",
      step1: "Legg til en gjentakende utgift én gang, med ditt beste estimat som beløp.",
      step2: "Når det faktiske trekket kommer, legg det til som en utgift og velg regningen under Gjelder regningen. I gjennomgangsinnboksen får importerte trekk den samme listen.",
      step3: "Det faktiske beløpet erstatter estimatet for den måneden overalt - i budsjettet, kalenderen og kontantstrøm-kortet.",
    },
  },
  "bank-card-balances": {
    title: "Kredittkort som holder styr på seg selv",
    blurb:
      "Knytt et kort på Gjeld-fanen til bankkontoen bak det, så oppdateres saldoen etter hver synk - samme tilknytning stempler kortets siste bruk for aktivitetsovervåkingen. Ett valg per kort, og gjeldsoversikten går stort sett av seg selv.",
    cta: "Knytt til et kort",
    guide: {
      where: "Gjeld-fanen → trykk på et kort → Rediger → Tilkoblet bankkonto",
      step1: "Koble først til banken din under Profil → Banktilkoblinger.",
      step2: "Åpne kortet på Gjeld-fanen, trykk på Rediger og velg bankkontoen som er dette kortet under Tilkoblet bankkonto.",
      step3: "Etter hver synk lander kortets saldo her av seg selv; med aktivitetsovervåkingen på stempler kjøpene også siste bruk.",
    },
  },
  "cash-flow-budget": {
    title: "Vit hva som er igjen å bruke",
    blurb:
      "Fortell BudgetArk hva som står på brukskontoen ved månedens start, så beregner Budsjett-fanen hvor måneden ender - inntekter inn, regninger og minstebetalinger ut - med et ekte igjen-å-bruke-tall i stedet for en gjetning.",
    guide: {
      where: "Budsjett-fanen → Kontantstrøm-kortet øverst",
      step1: "Ved månedens start svarer du på spørsmålet om inngående saldo med det som står på brukskontoen (eller trykker på Kontantstrøm-kortet for å legge det inn senere).",
      step2: "Kortet beregner hvor måneden ender: inntekter inn, regninger og minstebetalinger ut.",
      step3: "Les tallet for igjen å bruke før et kjøp - det tar allerede høyde for det som fortsatt skal betales.",
    },
  },
  "private-entries": {
    title: "Noe forbruk er bare ditt",
    blurb:
      "Merk en budsjettpost som privat, så synkes den aldri til partnerens enhet - perfekt for gaver og overraskelser. Den telles fortsatt i ditt eget budsjett og følger med i sikkerhetskopiene dine; bare delingen endres.",
    cta: "Legg til en privat post",
    guide: {
      where: "Budsjett-fanen → + Legg til post → 🔒 Privat",
      step1: "Legg til eller rediger en post og slå på bryteren 🔒 Privat.",
      step2: "Posten blir i ditt eget budsjett og dine sikkerhetskopier, men sendes aldri til partnerens enhet under synk.",
      step3: "Slår du den av senere, synkes posten ved neste runde; en kopi som allerede er synket, trekkes ikke tilbake.",
    },
  },
  "card-keep-alive": {
    title: "La ikke et stille kort bli stengt",
    blurb:
      "Kortutstedere kan stenge et kredittkort som ligger ubrukt - og kredittscoren din tar støyten. Slå på aktivitetsovervåkingen for et hvilket som helst kort, så varsler BudgetArk deg før inaktivitetsvinduet løper ut, rett på Broen.",
    cta: "Sett opp kortovervåking",
    guide: {
      where: "Gjeld-fanen → trykk på et kort → Rediger → Aktivitetsovervåking",
      step1: "Åpne et kredittkort på Gjeld-fanen og trykk på Rediger.",
      step2: "Slå på aktivitetsovervåkingen og sett tillatt inaktivitet - det varierer mellom utstedere, 6 til 12 måneder er vanlig.",
      step3: "Logg et kjøp på kortet (eller la en tilkoblet bankkonto stemple det) for å nullstille klokken. Et banner på Broen varsler før vinduet løper ut.",
    },
  },
  "income-types": {
    title: "W-2 eller 1099? Merk lønnsslippene dine",
    blurb:
      "Merk inntekt som W-2-lønn eller 1099-oppdragsinntekt. W-2-poster kan følge 401(k)-trekket fra hver utbetaling, og 1099-poster viser nøyaktig hvor mye du bør sette av til skatt - summert per måned i Budsjettet ditt.",
    cta: "Logg en lønnsutbetaling",
    guide: {
      where: "Budsjett-fanen → + Legg til post → Inntekt → inntektstype",
      step1: "Legg til en inntektspost og velg W-2-lønn eller 1099 / oppdragstaker.",
      step2: "For W-2 skriver du inn 401(k)-trekket fra utbetalingen; for 1099 setter du andelen som skal settes av til skatt (25-30 % er et vanlig utgangspunkt).",
      step3: "Budsjett-fanen summerer trekket og det avsatte hver måned, og 1099-inntekt mates inn i Kvartalsskatt-verktøyet på Sjøkart.",
    },
  },
  "bank-connections": {
    title: "Banken din på autopilot",
    blurb:
      "Koble til banken din og la transaksjonene importere seg selv - ingenting kommer inn i budsjettet før du godkjenner det i gjennomgangsinnboksen. Innloggingsopplysningene dine forblir kryptert på denne enheten; BudgetArk har ingen server og står aldri mellom deg og banken din.",
    cta: "Sett opp en tilkobling",
    guide: {
      where: "Profil-fanen → Banktilkoblinger",
      step1: "Åpne Profil → Banktilkoblinger og legg til en tilkobling. Oppsettsguiden leder deg gjennom SimpleFIN eller Teller - din egen konto hos dem.",
      step2: "Velg hvilke kontoer som skal importeres og hvor saldoene deres lander på Broen.",
      step3: "Nye transaksjoner venter i gjennomgangsinnboksen på Budsjett-fanen til du godkjenner, kategoriserer eller hopper over dem. Ingenting kommer inn i budsjettet av seg selv.",
    },
  },
  "business-expenses": {
    title: "Bedriftsutgifter, sortert",
    blurb:
      "Merk en hvilken som helst utgift med et selskap eller en sidegeskjeft, og hent så ut en rapport til skattemeldingen med summer per bedrift og en CSV til regnskapsføreren din. Merkede poster telles fortsatt i det vanlige budsjettet ditt - skillet skjer i rapporten.",
    cta: "Opprett en bedrift",
    guide: {
      where: "Profil-fanen → Bedrifter",
      step1: "Opprett en bedrift under Profil → Bedrifter.",
      step2: "Når du legger til en utgift på Budsjett-fanen, merker du den med den bedriften. Den teller fortsatt i det personlige budsjettet ditt.",
      step3: "Tilbake under Profil → Bedrifter åpner du rapporten for summer per bedrift og år, pluss en CSV til regnskapsføreren din.",
    },
  },
  "people-assignment": {
    title: "Hvem brukte det?",
    blurb:
      "Legg til personene i husholdningen din og tilordne dem en hvilken som helst utgift - når du legger til poster eller godkjenner importerte banktransaksjoner. Hver post viser hvem den tilhører, så delt forbruk endelig får navn.",
    cta: "Legg til personene dine",
    guide: {
      where: "Profil-fanen → Personer",
      step1: "Legg til personene i husholdningen din under Profil → Personer.",
      step2: "Når du legger til en utgift, eller godkjenner en i gjennomgangsinnboksen, velger du hvem den var for - én person, eller alle den ble delt av.",
      step3: "Hver post viser navnene sine; delt forbruk fordeles likt i rapportene per person.",
    },
  },
  "receipt-photos": {
    title: "Legg ved kvitteringen",
    blurb:
      "Knips opptil tre kvitteringsbilder på en hvilken som helst post, rett fra skjemaene Legg til og Rediger. Bildene krypteres før de lagres og forlater aldri telefonen din med mindre du eksporterer dem selv.",
    cta: "Legg til en post",
    guide: {
      where: "Budsjett-fanen → + Legg til post → Kvitteringsbilder",
      step1: "Legg til eller rediger en utgift og bla til Kvitteringsbilder.",
      step2: "Ta et bilde eller velg ett fra biblioteket ditt - opptil tre per post.",
      step3: "Bildene krypteres på denne telefonen og holdes utenfor partnersynk og sikkerhetskopier. Å eksportere dem er en egen, uttrykkelig handling.",
    },
  },
  "tracking-reminders": {
    title: "Vennlige loggpåminnelser",
    blurb:
      "Velg å få en avstemming når du ikke har logget forbruk på en stund, eller en påminnelse ved ny måned om å sette målene dine. Alt planlegges på telefonen din - ingenting om økonomien din vises noen gang på låseskjermen.",
    cta: "Sett opp påminnelser",
    guide: {
      where: "Profil-fanen → Innstillinger → Loggpåminnelser",
      step1: "Åpne Profil → Loggpåminnelser og slå på puffene du vil ha: en avstemming etter en stille periode, eller en påminnelse ved ny måned.",
      step2: "Tillat varsler når telefonen spør.",
      step3: "Påminnelsene planlegges bare på denne telefonen og nevner aldri beløp eller kontoer.",
    },
  },
  "account-change-tracker": {
    title: "Se kontoene dine stige og falle",
    blurb:
      "Hver konto og kategori på Broen viser nå hvor mye den har gått opp eller ned i perioden du velger - en dag, en uke, en måned eller et kvartal. Følges privat på denne telefonen ut fra dine egne saldoer og kurser; ingenting forlater enheten.",
    cta: "Se Broen din",
    guide: {
      where: "Broen → Endring-brikkene over kontoene dine",
      step1: "Åpne Broen og velg en periode med Endring-brikkene: en dag, en uke, en måned eller et kvartal.",
      step2: "Hver konto og kategori viser hvor mye den har gått opp eller ned i den perioden.",
      step3: "Historikken bygges av et daglig øyeblikksbilde tatt på denne telefonen, så de første dagene viser mindre enn en hel periode.",
    },
  },
  "what-if-spending": {
    title: "Hva om du sluttet å bruke penger på…?",
    blurb:
      "Velg en forbrukskategori og se hva det kan gi å styre pengene et annet sted: hvor mye raskere du blir gjeldfri, renten du slipper, eller hva de vokser til over 1, 5 og 10 år. Du finner det under Verktøy på Sjøkart-fanen.",
    cta: "Kjør et Hva om",
    guide: {
      where: "Sjøkart-fanen → Verktøy → Hva om jeg sluttet å bruke penger på…",
      step1: "Åpne Sjøkart-fanen, bla til Verktøy og trykk på Hva om jeg sluttet å bruke penger på….",
      step2: "Velg en kategori; BudgetArk bruker det faktiske månedsgjennomsnittet ditt for den.",
      step3: "Sammenlign utfallene: gjeldfri raskere og rente du slipper, eller hva pengene vokser til over 1, 5 og 10 år.",
    },
  },
  "purchase-planner": {
    title: "Planlegg et kjøp, behold målene dine",
    blurb:
      "Gi det du sparer til et navn, så bygger BudgetArk målsparingen rundt det: et månedsbeløp som passer den faktiske kontantstrømmen din, måneden det er klart, og råd tilpasset steget ditt i Bygg arken din - så kjøpet aldri sporer av planen.",
    cta: "Planlegg et kjøp",
    guide: {
      where: "Sjøkart-fanen → Verktøy → Planlegg et kjøp",
      step1: "Åpne Sjøkart → Verktøy → Planlegg et kjøp og gi det du sparer til et navn, en pris og når du vil ha det.",
      step2: "BudgetArk foreslår et månedsbeløp som passer kontantstrømmen din og forteller deg måneden det er klart.",
      step3: "Lagrede planer vises på Kjøpsplaner-kortet på Broen, der du logger det du har satt av.",
    },
  },
  "take-home-pay": {
    title: "Det som faktisk lander på kontoen",
    blurb:
      "Skriv inn lønn, skattestatus og delstat og se den faktiske nettolønnen din per utbetaling - føderal skatt, delstatsskatt, Social Security og Medicare, alt fra innebygde skattetabeller som aldri ringer hjem. Trykk på en annen delstat for å se hva samme lønn gir der.",
    cta: "Beregn nettolønnen din",
    guide: {
      where: "Sjøkart-fanen → Verktøy → Nettolønn",
      step1: "Åpne Sjøkart → Verktøy → Nettolønn og skriv inn lønn, skattestatus og delstat.",
      step2: "Les nettolønnen per utbetaling med føderal skatt, delstatsskatt, Social Security og Medicare splittet opp.",
      step3: "Trykk på en annen delstat for å sammenligne hva samme lønn gir der. Kun amerikanske skattetabeller, pakket med appen - ingenting sendes noe sted.",
    },
  },
  "app-lock": {
    title: "Lås appen bak en PIN-kode",
    blurb:
      "Slå på applåsen, så ber BudgetArk om en PIN-kode med 4-8 sifre hver gang appen åpnes, slik at ingen som låner telefonen din kan bla i økonomien din. PIN-koden blir på denne enheten - synkes, eksporteres eller sikkerhetskopieres aldri.",
    cta: "Sett opp applås",
    guide: {
      where: "Profil-fanen → Innstillinger → Applås",
      step1: "Åpne Profil → Applås og slå den på.",
      step2: "Velg en PIN-kode med 4-8 sifre og bekreft den.",
      step3: "BudgetArk ber om PIN-koden hver gang appen åpnes. Den blir på denne enheten - synkes, eksporteres eller sikkerhetskopieres aldri - så ta vare på den et trygt sted.",
    },
  },
  "theme-fleet": {
    title: "Sju nye temaer til arken din",
    blurb:
      "Deep Sea, Slate, Classic, Lighthouse, Chart Room, Harbor Dawn og Ledger har sluttet seg til flåten - fra dyphavsblått med selvlysende glød til et høykontrasttema kontrollert for lesbarhet, et sjøkart, en ferskenfarget soloppgang og klassisk grønt regnskapspapir. Prøv alle under Utseende.",
    cta: "Bla gjennom temaer",
    guide: {
      where: "Profil-fanen → Utseende → Tema",
      step1: "Åpne Profil → Utseende og trykk på Tema.",
      step2: "Velg et tema; hele appen skifter mens du trykker.",
      step3: "Designstil og Bakgrunnseffekter på samme kort justerer glasskortene og den bevegelige bakgrunnen.",
    },
  },
  "subscription-detective": {
    title: "Abonnementsdetektiven",
    blurb:
      "Et nytt verktøy på Sjøkart-fanen finner bankimporterte trekk som gjentar seg som et abonnement - månedlig eller årlig - uten noen registrert regning, summerer hva de koster per år, og gjør hvert av dem til en gjentakende regning med ett trykk.",
    cta: "Kjør detektiven",
    guide: {
      where: "Sjøkart-fanen → Verktøy → Abonnementsdetektiven",
      step1: "Koble til en bank eller importer en kontoutskrift først - detektiven leser importerte trekk.",
      step2: "Åpne Sjøkart → Verktøy → Abonnementsdetektiven for å se trekk som gjentar seg månedlig eller årlig uten noen registrert regning, og hva de koster per år.",
      step3: "Trykk på ett av dem for å gjøre det til en gjentakende regning; fremtidige trekk føres automatisk mot den.",
    },
  },
  "owed-to-you": {
    title: "Til gode",
    blurb:
      "Lånt ut penger til noen? Sett navnet på utgiften når du logger den (eller i gjennomgangsinnboksen), følg så med på hva de fortsatt skylder og logg hver betaling de gjør under Profil → Personer → Til gode.",
    cta: "Åpne Til gode",
    guide: {
      where: "Profil-fanen → Personer → Til gode",
      step1: "Når du logger en utgift du venter å få tilbake, fyller du inn Utlånt til noen? med navnet på personen.",
      step2: "Åpne Profil → Personer → Til gode for å se hva hver person fortsatt skylder.",
      step3: "Logg hver tilbakebetaling der; saldoen krymper til alt er gjort opp.",
    },
  },
  "net-worth-goal": {
    title: "Hvor nettoformuen din er på vei",
    blurb:
      "Broen fører nå nettoformuelinjen din videre ut fra budsjettets månedlige overskudd og gjelden din på minstebetaling. Sett et mål - et beløp innen en måned - og se om du er i rute eller ikke, hva det ville kreve per måned, og når dagens tempo kommer dit.",
    cta: "Se prognosen",
    guide: {
      where: "Broen → kortet Hvor dette er på vei",
      step1: "Åpne Broen og finn prognosekortet for nettoformuen under kontoene dine.",
      step2: "Trykk på Sett et mål for nettoformuen og skriv inn et beløp og en måned.",
      step3: "Kortet sier om du er i rute eller ikke, hva det ville kreve per måned, og når dagens tempo kommer dit.",
    },
  },
  "paycheck-cycle": {
    title: "Til lønning",
    blurb:
      "Budsjetter per lønnsperiode, ikke kalendermåned: fortell BudgetArk når du får lønn, så viser Budsjett-fanen hva som forfaller før neste utbetaling og hva som er igjen å bruke til da.",
    cta: "Sett opp lønnsperioder",
    guide: {
      where: "Budsjett-fanen → Til lønning-kortet",
      step1: "På Budsjett-fanen trykker du på Sett opp lønnsperioder på Til lønning-kortet.",
      step2: "Skriv inn når du får lønn og hvor ofte.",
      step3: "Kortet viser hva som forfaller før neste utbetaling og, med en inngående saldo registrert, hva som er igjen å bruke til lønning.",
    },
  },
  "quarterly-taxes": {
    title: "Kvartalsskatt",
    blurb:
      "Logg 1099-inntekt, så viser det nye Sjøkart-verktøyet hvert IRS-kvartal: hva du tjente, hva du satte av, den beregnede betalingen og forfallsdatoen - med Merk som betalt per kvartal.",
    cta: "Se kvartalene mine",
    guide: {
      where: "Sjøkart-fanen → Verktøy → Kvartalsskatt",
      step1: "Logg inntekt som 1099 / oppdragstaker med en andel satt av til skatt.",
      step2: "Åpne Sjøkart → Verktøy → Kvartalsskatt for å se hvert IRS-kvartal: tjent, satt av, den beregnede betalingen og forfallsdatoen.",
      step3: "Trykk på Merk som betalt når du har sendt betalingen for et kvartal.",
    },
  },
  "purchase-plan-priorities": {
    title: "Kjøpsplaner, i rekkefølge",
    blurb:
      "Kjøpsplaner-kortet summerer nå alt - spart, igjen å spare og når alt er finansiert - og lar deg rangere planene minst først, snarest nødvendig først eller i din egen rekkefølge. Sett ett månedsbeløp, så flyter det nedover listen som en gjeldssnøball, der hver plan ruller over i den neste.",
    cta: "Se planene dine",
    guide: {
      where: "Broen → Kjøpsplaner-kortet → Rekkefølge",
      step1: "Lagre to eller flere planer med Planlegg et kjøp på Sjøkart-fanen.",
      step2: "På Kjøpsplaner-kortet på Broen velger du en Rekkefølge: minste først, trengs snarest eller din egen.",
      step3: "Sett ett månedsbeløp; det finansierer den første planen og ruller så over i den neste, som en gjeldssnøball.",
    },
  },
  "bank-statement-import": {
    title: "Importer en kontoutskrift",
    blurb:
      "Last ned en CSV fra bankens nettsted, så leser BudgetArk den: bekreft én gang hvilke kolonner som er dato, beskrivelse og beløp, så lander hver transaksjon i gjennomgangsinnboksen for godkjenning. For månedene før du koblet til en bank - eller en bank du aldri kommer til å koble til.",
    cta: "Importer en kontoutskrift",
    guide: {
      where: "Profil-fanen → Data → Importer → Kontoutskrift",
      step1: "Last ned en transaksjons-CSV fra bankens nettsted.",
      step2: "Åpne Profil → Data → Importer → Kontoutskrift og velg filen; bekreft hvilke kolonner som inneholder dato, beskrivelse og beløp.",
      step3: "Hver rad lander i gjennomgangsinnboksen på Budsjett-fanen for godkjenning, kategorisering eller hopp over. Oppsettet huskes per bank, og en ny import dobler aldri noe.",
    },
  },
  "tip-jar": {
    title: "Tipsboks",
    blurb:
      "Valgfrie engangstips, håndtert helt av appbutikken. Låser ikke opp noe - hver funksjon er allerede gratis.",
    guide: {
      where: "Profil-fanen → Tipsboks",
      step1: "Åpne Profil → Tipsboks.",
      step2: "Velg et beløp; appbutikken håndterer betalingen. Det låser ikke opp noe - hver funksjon er allerede gratis.",
    },
  },
};
