/**
 * BudgetArk - Norske tekster: pakket data (spotlights)
 * File: src/i18n/locales/nb/dataSpotlights.ts
 *
 * Norwegian (Bokmål) counterpart of en/dataSpotlights.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary. Theme names
 * (Deep Sea, Slate, Lighthouse, ...) and product names stay untranslated.
 */

import type { Localized } from "../types";
import type { dataSpotlights as en } from "../en/dataSpotlights";

export const dataSpotlights: Localized<typeof en> = {
  languages: {
    title: "BudgetArk snakker språket ditt",
    blurb:
      "Hver fane, hvert panel og hver påminnelse finnes nå på tysk, russisk, ukrainsk, svensk og norsk. Språket følger telefonen din automatisk, eller du velger selv under Profil, rett ved siden av Valuta.",
    cta: "Velg et språk",
  },
  "bill-fulfillment": {
    title: "Regninger som avstemmer seg selv",
    blurb:
      "Sett opp en regning én gang med ditt beste estimat. Når den faktiske strøm- eller vannregningen kommer - fra banken eller tastet inn - fører du den mot regningen, og det faktiske beløpet erstatter estimatet for den måneden, overalt. Ingen dobbelttelling, ingen redigering av planen.",
    cta: "Logg det faktiske beløpet på en regning",
  },
  "bank-card-balances": {
    title: "Kredittkort som holder styr på seg selv",
    blurb:
      "Knytt et kort på Gjeld-fanen til bankkontoen bak det, så oppdateres saldoen etter hver synk - samme tilknytning stempler kortets siste bruk for aktivitetsovervåkingen. Ett valg per kort, og gjeldsoversikten går stort sett av seg selv.",
    cta: "Knytt til et kort",
  },
  "cash-flow-budget": {
    title: "Vit hva som er igjen å bruke",
    blurb:
      "Fortell BudgetArk hva som står på brukskontoen ved månedens start, så beregner Budsjett-fanen hvor måneden ender - inntekter inn, regninger og minstebetalinger ut - med et ekte igjen-å-bruke-tall i stedet for en gjetning.",
  },
  "private-entries": {
    title: "Noe forbruk er bare ditt",
    blurb:
      "Merk en budsjettpost som privat, så synkes den aldri til partnerens enhet - perfekt for gaver og overraskelser. Den telles fortsatt i ditt eget budsjett og følger med i sikkerhetskopiene dine; bare delingen endres.",
    cta: "Legg til en privat post",
  },
  "card-keep-alive": {
    title: "La ikke et stille kort bli stengt",
    blurb:
      "Kortutstedere kan stenge et kredittkort som ligger ubrukt - og kredittscoren din tar støyten. Slå på aktivitetsovervåkingen for et hvilket som helst kort, så varsler BudgetArk deg før inaktivitetsvinduet løper ut, rett på Broen.",
    cta: "Sett opp kortovervåking",
  },
  "income-types": {
    title: "W-2 eller 1099? Merk lønnsslippene dine",
    blurb:
      "Merk inntekt som W-2-lønn eller 1099-oppdragsinntekt. W-2-poster kan følge 401(k)-trekket fra hver utbetaling, og 1099-poster viser nøyaktig hvor mye du bør sette av til skatt - summert per måned i Budsjettet ditt.",
    cta: "Logg en lønnsutbetaling",
  },
  "bank-connections": {
    title: "Banken din på autopilot",
    blurb:
      "Koble til banken din og la transaksjonene importere seg selv - ingenting kommer inn i budsjettet før du godkjenner det i gjennomgangsinnboksen. Innloggingsopplysningene dine forblir kryptert på denne enheten; BudgetArk har ingen server og står aldri mellom deg og banken din.",
    cta: "Sett opp en tilkobling",
  },
  "business-expenses": {
    title: "Bedriftsutgifter, sortert",
    blurb:
      "Merk en hvilken som helst utgift med et selskap eller en sidegeskjeft, og hent så ut en rapport til skattemeldingen med summer per bedrift og en CSV til regnskapsføreren din. Merkede poster telles fortsatt i det vanlige budsjettet ditt - skillet skjer i rapporten.",
    cta: "Opprett en bedrift",
  },
  "people-assignment": {
    title: "Hvem brukte det?",
    blurb:
      "Legg til personene i husholdningen din og tilordne dem en hvilken som helst utgift - når du legger til poster eller godkjenner importerte banktransaksjoner. Hver post viser hvem den tilhører, så delt forbruk endelig får navn.",
    cta: "Legg til personene dine",
  },
  "receipt-photos": {
    title: "Legg ved kvitteringen",
    blurb:
      "Knips opptil tre kvitteringsbilder på en hvilken som helst post, rett fra skjemaene Legg til og Rediger. Bildene krypteres før de lagres og forlater aldri telefonen din med mindre du eksporterer dem selv.",
    cta: "Legg til en post",
  },
  "tracking-reminders": {
    title: "Vennlige loggpåminnelser",
    blurb:
      "Velg å få en avstemming når du ikke har logget forbruk på en stund, eller en påminnelse ved ny måned om å sette målene dine. Alt planlegges på telefonen din - ingenting om økonomien din vises noen gang på låseskjermen.",
    cta: "Sett opp påminnelser",
  },
  "account-change-tracker": {
    title: "Se kontoene dine stige og falle",
    blurb:
      "Hver konto og kategori på Broen viser nå hvor mye den har gått opp eller ned i perioden du velger - en dag, en uke, en måned eller et kvartal. Følges privat på denne telefonen ut fra dine egne saldoer og kurser; ingenting forlater enheten.",
    cta: "Se Broen din",
  },
  "what-if-spending": {
    title: "Hva om du sluttet å bruke penger på…?",
    blurb:
      "Velg en forbrukskategori og se hva det kan gi å styre pengene et annet sted: hvor mye raskere du blir gjeldfri, renten du slipper, eller hva de vokser til over 1, 5 og 10 år. Du finner det under Verktøy på Sjøkart-fanen.",
    cta: "Kjør et Hva om",
  },
  "purchase-planner": {
    title: "Planlegg et kjøp, behold målene dine",
    blurb:
      "Gi det du sparer til et navn, så bygger BudgetArk målsparingen rundt det: et månedsbeløp som passer den faktiske kontantstrømmen din, måneden det er klart, og råd tilpasset steget ditt i Bygg arken din - så kjøpet aldri sporer av planen.",
    cta: "Planlegg et kjøp",
  },
  "take-home-pay": {
    title: "Det som faktisk lander på kontoen",
    blurb:
      "Skriv inn lønn, skattestatus og delstat og se den faktiske nettolønnen din per utbetaling - føderal skatt, delstatsskatt, Social Security og Medicare, alt fra innebygde skattetabeller som aldri ringer hjem. Trykk på en annen delstat for å se hva samme lønn gir der.",
    cta: "Beregn nettolønnen din",
  },
  "app-lock": {
    title: "Lås appen bak en PIN-kode",
    blurb:
      "Slå på applåsen, så ber BudgetArk om en PIN-kode med 4-8 sifre hver gang appen åpnes, slik at ingen som låner telefonen din kan bla i økonomien din. PIN-koden blir på denne enheten - synkes, eksporteres eller sikkerhetskopieres aldri.",
    cta: "Sett opp applås",
  },
  "theme-fleet": {
    title: "Sju nye temaer til arken din",
    blurb:
      "Deep Sea, Slate, Classic, Lighthouse, Chart Room, Harbor Dawn og Ledger har sluttet seg til flåten - fra dyphavsblått med selvlysende glød til et høykontrasttema kontrollert for lesbarhet, et sjøkart, en ferskenfarget soloppgang og klassisk grønt regnskapspapir. Prøv alle under Utseende.",
    cta: "Bla gjennom temaer",
  },
  "subscription-detective": {
    title: "Abonnementsdetektiven",
    blurb:
      "Et nytt verktøy på Sjøkart-fanen finner bankimporterte trekk som gjentar seg som et abonnement - månedlig eller årlig - uten noen registrert regning, summerer hva de koster per år, og gjør hvert av dem til en gjentakende regning med ett trykk.",
    cta: "Kjør detektiven",
  },
  "owed-to-you": {
    title: "Til gode",
    blurb:
      "Lånt ut penger til noen? Sett navnet på utgiften når du logger den (eller i gjennomgangsinnboksen), følg så med på hva de fortsatt skylder og logg hver betaling de gjør under Profil → Personer → Til gode.",
    cta: "Åpne Til gode",
  },
  "net-worth-goal": {
    title: "Hvor nettoformuen din er på vei",
    blurb:
      "Broen fører nå nettoformuelinjen din videre ut fra budsjettets månedlige overskudd og gjelden din på minstebetaling. Sett et mål - et beløp innen en måned - og se om du er i rute eller ikke, hva det ville kreve per måned, og når dagens tempo kommer dit.",
    cta: "Se prognosen",
  },
  "paycheck-cycle": {
    title: "Til lønning",
    blurb:
      "Budsjetter per lønnsperiode, ikke kalendermåned: fortell BudgetArk når du får lønn, så viser Budsjett-fanen hva som forfaller før neste utbetaling og hva som er igjen å bruke til da.",
    cta: "Sett opp lønnsperioder",
  },
  "quarterly-taxes": {
    title: "Kvartalsskatt",
    blurb:
      "Logg 1099-inntekt, så viser det nye Sjøkart-verktøyet hvert IRS-kvartal: hva du tjente, hva du satte av, den beregnede betalingen og forfallsdatoen - med Merk som betalt per kvartal.",
    cta: "Se kvartalene mine",
  },
  "purchase-plan-priorities": {
    title: "Kjøpsplaner, i rekkefølge",
    blurb:
      "Kjøpsplaner-kortet summerer nå alt - spart, igjen å spare og når alt er finansiert - og lar deg rangere planene minst først, snarest nødvendig først eller i din egen rekkefølge. Sett ett månedsbeløp, så flyter det nedover listen som en gjeldssnøball, der hver plan ruller over i den neste.",
    cta: "Se planene dine",
  },
  "bank-statement-import": {
    title: "Importer en kontoutskrift",
    blurb:
      "Last ned en CSV fra bankens nettsted, så leser BudgetArk den: bekreft én gang hvilke kolonner som er dato, beskrivelse og beløp, så lander hver transaksjon i gjennomgangsinnboksen for godkjenning. For månedene før du koblet til en bank - eller en bank du aldri kommer til å koble til.",
    cta: "Importer en kontoutskrift",
  },
  "tip-jar": {
    title: "Tipsboks",
    blurb:
      "Valgfrie engangstips, håndtert helt av appbutikken. Låser ikke opp noe - hver funksjon er allerede gratis.",
  },
};
