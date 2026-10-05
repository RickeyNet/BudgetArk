/**
 * BudgetArk - Norske tekster: pakkede data (coachmarks)
 * File: src/i18n/locales/nb/dataCoachmarks.ts
 *
 * Norwegian (Bokmål) counterpart of en/dataCoachmarks.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary. `keywords`
 * are lowercase, comma-separated search synonyms: Norwegian terms plus the
 * product words a Norwegian user would still type in English (csv, excel,
 * simplefin, etf). Theme and product names stay untranslated.
 */

import type { Localized } from "../types";
import type { dataCoachmarks as en } from "../en/dataCoachmarks";

export const dataCoachmarks: Localized<typeof en> = {
  DebtTracker: {
    intro: "Gjeld - nedbetalingsplanen din",
    steps: {
      "debts-summary": {
        title: "Gjelden din i korte trekk",
        body: "Total saldo, totalt betalt og samlet fremgang vises her. Ringen til høyre viser hvor mange prosent du har betalt ned på tvers av all gjeld, og nedtellingen under beregner datoen du er gjeldfri ut fra det faktiske betalingstempoet ditt.",
        detail: "Oppsummeringskortet summerer hver gjeldspost du følger: det du fortsatt skylder, det du allerede har betalt ned, og fremgangsringen som viser andelen som er nedbetalt. Under det begrenser filteret Mine / Partnerens / Felles listen til én eier - summene følger filteret, så et par kan sjekke hver sin side med ett trykk. Nedbetalte gjeldsposter blir stående i listen med saldo 0 (med historikken intakt), så fremgangen din aldri mister det du allerede har oppnådd. Rett under oppsummeringen viser gjeldfri-nedtellingen årene, månedene og dagene til du etter beregningen ikke skylder noe - regnet ut fra det faktiske betalingstempoet ditt de siste seks månedene med loggede betalinger (eller minstebetalingene dine til det finnes historikk), så en større betaling trekker datoen synlig nærmere.",
        location: "Gjeld-fanen (øverste kort)",
        keywords: "totalt, sum, oppsummering, fremgang, nedbetalt, betalt ned, eier, partner, felles, ring, nedtelling, gjeldfri, gjeldfri dato, nedbetalingsdato",
      },
      "debts-fab": {
        title: "Legg til gjeld med +",
        body: "Trykk på +-knappen for å legge til et kredittkort, et lån eller et boliglån. Du angir saldo, effektiv rente og minstebetaling - betalinger du registrerer reduserer saldoen.",
        detail: "Hver gjeldspost får et navn, gjeldende saldo, effektiv rente og minstebetaling per måned, pluss en type (Kreditt / Privat, Bil eller Hus - typen styrer nedbetalingsrekkefølgen), en eier, en valgfri forfallsdag for påminnelser og en valgfri måldato for nedbetalingen som viser månedsbetalingen som trengs for å nå den. Kredittkort kan legges til med saldo 0 - nyttig når du beholder et nedbetalt kort bare for å følge det med aktivitetsovervåkingen. Alt kan endres senere via kortets Rediger-knapp.",
        location: "Gjeld-fanen → +-knappen",
        keywords: "legg til, ny gjeld, lån, boliglån, kredittkort, rente, rentesats, effektiv rente, minstebetaling, måldato, forfallsdag",
      },
      "debts-payments": {
        title: "Logg betalinger underveis",
        body: "Trykk på et gjeldskort for å registrere en betaling eller åpne betalingshistorikken - hver betaling senker saldoen og teller mot fremgangen din. Gi en gjeldspost en forfallsdag, så minner BudgetArk deg på det i appen når den nærmer seg, med et ett-trykks forslag om å logge minstebetalingen den dagen den forfaller.",
        detail: "Utvid et gjeldskort og bruk Betal for å logge en betaling - overbetalinger kappes slik at avrunding i visningen aldri etterlater et løst øre, og en nullstilt saldo utløser en nedbetalingsfeiring. Betalingshistorikken (med slett og angre per betaling) ligger også bak kortet. Angi en forfallsdag når du legger til eller redigerer en gjeldspost, så vises et påminnelsesbanner over listen når dagen nærmer seg; på selve dagen tilbyr et spørsmål ved appstart å logge minstebetalingen med ett trykk. Avviser du en påminnelse, dempes den bare for den måneden. Loggede betalinger vises også i kategorien Gjeldsbetalinger på Budsjett-fanen, så begge fanene stemmer alltid overens.",
        location: "Gjeld-fanen → trykk på et gjeldskort",
        keywords: "betaling, betal, logg, historikk, forfallsdato, forfallsdag, påminnelse, banner, minstebetaling, angre, nedbetaling",
      },
      "debts-keepalive": {
        title: "Hold ubrukte kredittkort aktive",
        body: "Banker kan stenge et kredittkort som ligger ubrukt - og kredittscoren din tar støyten. Slå på aktivitetsovervåking for et kort, så varsler BudgetArk deg før inaktivitetsvinduet går ut.",
        detail: "Rediger en kredittkortgjeld og slå på Hold kortet aktivt. Angi hvor lang inaktivitet utstederen tillater (3, 6, 12 eller 24 måneder - det varierer, 6 er et trygt standardvalg) og hvor lang tid i forveien du vil varsles (14, 30 eller 60 dager). Når fristen nærmer seg, navngir et banner kortet og bruk-innen-datoen på både Broen og Gjeld-fanen, og et diskret varsel gir deg et lite puff - det viser aldri kortets navn eller noe beløp på låseskjermen. Etter et kjøp trykker du på «Jeg brukte det» på kortet for å nullstille klokken; eller knytt kortet til en banktilkobling, så stemples sist-brukt-datoen automatisk fra dine egne synkede transaksjoner. «Senere» på banneret utsetter et kort for inneværende måned. Stengt et kort med vilje? Bare slå av overvåkingen.",
        location: "Gjeld-fanen → trykk på et kort → Rediger (bare kredittkort)",
        keywords: "hold aktivt, aktivitetsovervåking, kredittkort, inaktivitet, stengt, avsluttet, kredittscore, ubrukt, inaktivt, varsel, jeg brukte det, overvåking, frist",
      },
      "debts-strategy": {
        title: "Velg en nedbetalingsstrategi",
        body: "Velg Snøskred (høyest rente først), Snøball (lavest saldo først), eller behold din egen rekkefølge. Strategien styrer nedbetalingsprognosene her og i verktøyene på Sjøkart-fanen.",
        detail: "Snøskred betaler matematisk minst rente ved å angripe den høyeste renten først; Snøball kjøper motivasjon ved å kvitte seg med de minste saldoene først; Egen beholder den rekkefølgen du selv setter opp. Den valgte strategien avgjør hvilken gjeldspost som er «fokuset» ditt (kortet starter utvidet), former gjeldfri-prognosene og er det verktøyet Hva om på Sjøkart-fanen bruker når det viser hvordan omdirigert forbruk ville fått fart på nedbetalingen. Boliglån håndteres separat, så et hus ikke begraver planen.",
        location: "Gjeld-fanen (strategiraden under oppsummeringen)",
        keywords: "snøskred, snøball, strategi, rekkefølge, rente, fokus, prognose",
      },
      "debts-milestones": {
        title: "Milepæler i Bygg arken din",
        body: "Trykk på milepælkortet for å sette mål for de 7 økonomiske milepælene - startbuffer, gjeldfri, buffer, pensjon og videre.",
        detail: "Bygg arken din er BudgetArks økonomiske vei steg for steg: Kjøl (startbuffer), Skrog (dyr gjeld), Dekk (full buffer), Forsyninger (målsparing), Samle dyrene (pensjon og utdanning), Anker (boliglån) og Seil (bygg formue). Trykk på feltet for å åpne planleggeren, sett dine egne målbeløp og følg fremgangen per steg - appen leser de faktiske saldoene, sparepengene og gjeldspostene dine for å fylle stolpene. Det gjeldende steget ditt tilpasser også rådene andre steder, som veiledningen i verktøyet Planlegg et kjøp om hvorvidt et kjøp passer akkurat nå.",
        location: "Gjeld-fanen → feltet Bygg arken din",
        keywords: "milepæler, ark, arken, kjøl, skrog, buffer, steg, plan, baby steps",
      },
    },
  },
  Budget: {
    intro: "Budsjett - det som kommer inn, det som går ut",
    steps: {
      "budget-summary": {
        title: "Inntekt mot utgift",
        body: "Det øverste kortet viser månedens inntekter, utgifter og netto. Bruk pilene < > over det for å se på tidligere måneder - et helt års historikk beholdes.",
        detail: "Månedskortet summerer inntekter, utgifter og nettoen mellom dem, med W-2- / 1099-merker på inntektsrader, en linje for 401(k)-innskudd når du følger dem, og en linje «1099 skatteavsetning» som summerer det du bør sette av til skatt denne måneden. Pilene < > blar gjennom tidligere måneder - avsluttede måneder viser nøyaktig det som skjedde da og skriver aldri om seg selv når dagens innstillinger endres. Spørsmålet Månedsoversikt ved månedsslutt oppsummerer hvordan det gikk.",
        location: "Budsjett-fanen (øverste kort)",
        keywords: "inntekt, utgift, netto, måned, historikk, oppsummering, månedsoversikt, piler",
      },
      "budget-cashflow": {
        title: "Kontantstrøm - hva du har igjen å bruke",
        body: "Fortell BudgetArk i starten av hver måned hva som står på brukskontoen din. Kontantstrømkortet beregner hvor måneden ender - inntekter inn, planlagte regninger og minstebetalinger ut - og viser et beløp igjen å bruke som oppdateres live når du logger poster.",
        detail: "Kontantstrømkortet forankrer budsjettet i virkeligheten: ett reelt tall, saldoen på brukskontoen, angitt én gang i måneden (et spørsmål dukker opp; hopper du over det, blir en Angi-knapp stående på kortet). Derfra beregner det månedens slutt - inntekter inn, forbruk ut, planlagte regninger og minstebetalinger inkludert - og viser Igjen å bruke, som beveger seg live mens du logger poster. Når du angir en ny måneds saldo, avstemmes virkeligheten også mot forrige måneds plan («startet 150 $ under plan»), så avvik vises umiddelbart. Har du nøyaktig én brukskonto på Broen, oppdateres også den når du lagrer månedssaldoen. Saldohistorikken synkes med partneren din og følger med i sikkerhetskopiene.",
        location: "Budsjett-fanen → Kontantstrøm-kortet",
        keywords: "kontantstrøm, igjen å bruke, brukskonto, saldo, prognose, månedsstart, avstemming, igjen",
      },
      "budget-spending": {
        title: "Fordeling per kategori",
        body: "Smultringdiagrammet deler opp forbruket per kategori. Trykk på en kategori for å se postene i den eller sette en månedsgrense.",
        detail: "Hver utgift lander i en kategori, og smultringen viser hvor måneden gikk. Trykk på en sektor eller rad for å utvide kategorien: hver post i den, med rediger og slett, pluss en månedsgrense du kan sette per kategori - grenser følger med fra måned til måned og vet i inneværende måned hvilken dag det er: et lite merke på hver stolpe viser hvor en jevn fordeling ville ligget i dag, stolpen blir gul når du bruker raskere enn det, og et Forbrukstempo-kort øverst på fanen peker ut hver kategori som ligger over eller er på vei forbi grensen sin. Kategorier grupperes i bøttene Behov, Ønsker og Sparing (kan flyttes under Profil → Kategorier), og du kan lage egne kategorier for alt de innebygde ikke dekker.",
        location: "Budsjett-fanen → forbrukssmultringen",
        keywords: "kategori, kategorier, smultring, diagram, grense, budsjettgrense, tempo, i rute, forbrukstempo, behov, ønsker, egen kategori",
      },
      "budget-fab": {
        title: "Legg til en post med +",
        body: "Inntekt, utgift eller sparepost. Merk alt som gjentar seg som gjentakende, så fylles det inn automatisk hver måned. Inntektsposter kan merkes som W-2- eller 1099-lønn, og enhver post kan merkes 🔒 Privat så den aldri synkes til partnerens enhet.",
        detail: "Poster er hjertet i budsjettet: type (inntekt / utgift), kategori, beløp, dato (velg dagen det skjedde - standard er i dag, med en I dag-snarvei) og en valgfri beskrivelse. Gjentakende poster fyller seg selv inn hver måned til du stopper dem - perfekt for husleie, abonnementer og lønn. Inntekt kan merkes W-2 (angi nettobeløpet, og registrer valgfritt 401(k)-dollarene som ble trukket, så pensjonssparingen likevel får kreditt) eller 1099 / frilans (ingenting trekkes, så BudgetArk viser hvor mye du bør sette av til skatt etter en prosent du velger). Utgifter kan ha opptil tre krypterte kvitteringsbilder og en bedriftsmerking. Bryteren 🔒 Privat holder en post helt unna den sammenkoblede partnerens enhet - for gaver, overraskelser eller forbruk som bare er ditt - mens den fortsatt telles i ditt eget budsjett, dine sikkerhetskopier og eksporter (merk den som privat når du oppretter den; en kopi som allerede er synket, blir hos partneren). Flerlinjet hurtiginnlegging lar deg legge inn flere kjøp på én gang. Regninger som varierer fra måned til måned (strøm, vann, gass) fungerer best som et gjentakende estimat pluss det faktiske trekket: trykk på «Logg faktisk beløp» på regningens rad, eller velg regningen under «Gjelder regningen» når du legger til utgiften eller godkjenner den i gjennomgangsinnboksen, så erstatter det faktiske beløpet estimatet overalt den måneden i stedet for å legges på toppen. Når du redigerer en regning, ser du snittet av de siste faktiske beløpene, med oppdatering med ett trykk.",
        location: "Budsjett-fanen → +-knappen",
        keywords: "legg til post, inntekt, utgift, gjentakende, abonnement, w-2, w2, 1099, lønn, 401k, pensjon, skatt, sette av, privat, gave, skjul, hemmelig, regning, faktisk, strøm, vann, estimat, gjelder regningen, logg faktisk beløp",
      },
      "budget-widget": {
        title: "Hurtigregistrering fra startskjermen (Android)",
        body: "Legg til BudgetArks widget fra widgetvelgeren i launcheren din og logg en utgift med ett trykk - trykk på en kategori, så åpnes skjemaet Legg til post med den allerede valgt.",
        detail: "Hold inne på Android-startskjermen, åpne widgetvelgeren og legg til Hurtigregistrering. Widgeten er et lite rutenett med hverdagskategorier - Dagligvarer, Restaurant, Transport, Shopping, Underholdning, Annet - og ett trykk på en av dem går rett inn i skjemaet Legg til post med den kategorien forhåndsvalgt, så det tar sekunder å logge et kjøp. Widgeten viser ingenting om økonomien din - ingen saldoer, ingen summer - så den er trygg på enhver startskjerm. (iOS har ikke widgeten enda.)",
        location: "Android-startskjerm → hold inne → Widgeter → BudgetArk",
        keywords: "widget, startskjerm, hjemskjerm, hurtigregistrering, hurtig, snarvei, android, launcher",
      },
      "budget-inbox": {
        title: "Gjennomgangsinnboks for bankimport",
        body: "Koblet til en bank i Profil? Nye transaksjoner venter bak skuffikonet øverst på denne skjermen - ingenting kommer inn i budsjettet før du godkjenner det. Huk av «Gjør alltid dette» når du godkjenner eller hopper over for å lære BudgetArk en forhandlerregel, og endre enhver lagret regel senere via Regler-knappen.",
        detail: "Gjennomgangsinnboksen er porten mellom banken og budsjettet ditt: hver importerte transaksjon venter der til du godkjenner, redigerer eller hopper over den - ingenting legges noen gang til i stillhet. Huk av «Gjør alltid dette» når du godkjenner, så kommer forhandlerens fremtidige trekk ferdig kategorisert, klare for samlet godkjenning med ett trykk; huk av når du hopper over, så importeres forhandleren (en kredittkortbetaling, en overføring) aldri igjen. Regler-knappen i innboksens topp lister hver regel du har lagret, så du kan bytte en forhandler mellom hopp over og kategoriser, velge en annen kategori eller slette regelen - endringer gjelder fremtidig import og alt som fortsatt venter i innboksen. Sannsynlige overføringer og sannsynlige duplikater av manuelt innlagte poster flagges og legges til side så de ikke telles dobbelt, og avgjørelser huskes permanent - en ny synk eller en gjenopprettet sikkerhetskopi spør aldri om igjen.",
        location: "Budsjett-fanen → skuffikonet (øverst på skjermen)",
        keywords: "gjennomgangsinnboks, innboks, bank, import, transaksjoner, godkjenn, hopp over, forhandler, regler, alltid, ignorer, overføring, duplikat, synk",
      },
      "budget-receipts": {
        title: "Kvitteringer og bedriftsutgifter",
        body: "Legg ved opptil tre kvitteringsbilder på enhver post - de krypteres og forlater aldri denne telefonen. Merk en utgift med en bedrift (bedrifter setter du opp i Profil), så får den et 💼-merke; en rapport til skattemeldingen med CSV- og kvitteringseksport finnes under Profil → Bedriftsutgifter.",
        detail: "Ta eller velg opptil tre kvitteringsbilder i skjemaene for å legge til og redigere poster - bildene forminskes, krypteres med samme nøkkel som beskytter alt annet og lagres bare på denne telefonen (en sammenkoblet partner ser en plassholder, sikkerhetskopier hopper over dem, og ingenting lastes noen gang opp). Opprett bedrifter under Profil → Bedriftsutgifter og merk deretter enhver utgift med én; merkede poster telles fortsatt i det vanlige budsjettet - skillet skjer ved skattetid, når bedriftsutgiftsrapporten gir summer per bedrift etter kategori, en CSV klar for regnskapsføreren og en valgfri zip med årets kvitteringsbilder navngitt så de matcher CSV-radene. Eksport skjer bare når du uttrykkelig bekrefter den.",
        location: "Budsjett-fanen → + / rediger en post · Profil → Bedriftsutgifter",
        keywords: "kvittering, bilde, foto, kamera, vedlegg, bedrift, skatt, skattemelding, rapport, csv, eksport, regnskapsfører, zip",
      },
    },
  },
  Bridge: {
    intro: "Broen - nettoformuen din",
    steps: {
      "bridge-history": {
        title: "Nettoformuen din",
        body: "Nettoformue = alt du eier minus alt du skylder. Det store tallet samler gjeld, sparing, pensjon, investeringer og fulgte kontoer. Diagrammet under tegner nettoformuen over tid - øyeblikksbilder lagres automatisk når saldoer endres.",
        detail: "Broen er din økonomiske kommandobro og appens startfane. Hovedtallet er eiendeler (kontoer, sparing, prisede investeringer) minus forpliktelser (gjelden du følger), og diagrammet tegner det over tid fra øyeblikksbilder appen registrerer automatisk hver gang saldoer endres - ingen manuell bokføring. Et kontantstrømdiagram under sammenligner de siste månedenes inntekter og forbruk i korte trekk. Alt på denne skjermen beregnes på telefonen din fra dine egne data.",
        location: "Broen-fanen (øverste diagram)",
        keywords: "nettoformue, eiendeler, forpliktelser, gjeld, diagram, historikk, øyeblikksbilde, kontantstrøm",
      },
      "bridge-accounts": {
        title: "Administrer kontoene dine",
        body: "Legg til sparing, pensjon, aksjekonto eller enhver konto du vil regne med i nettoformuen. Trykk på en rad for å oppdatere saldoen når som helst - endringene flyter tilbake til Broen. Kontoer knyttet til en banktilkobling holder saldoene sine oppdatert automatisk etter hver synk.",
        detail: "Kontokortet rommer alt du eier: brukskontoer, sparekontoer, buffer, pensjonskontoer, aksjekontoer, HSA-er - gruppert etter kategori med summer per kategori. Trykk på + Legg til for å opprette en, trykk på en rad for å oppdatere saldoen eller redigere den. Kontoer knyttet til en banktilkobling (Profil → Banktilkoblinger) oppdaterer seg selv etter hver synk, så saldoene - og nettoformuen din - holdes oppdatert uten at du skriver noe. Investeringskontoer kan verdsettes ut fra beholdningen i sanntid i stedet for en innskrevet saldo.",
        location: "Broen-fanen → Kontoer-kortet",
        keywords: "kontoer, sparing, brukskonto, pensjon, hsa, aksjekonto, megler, saldo, legg til konto, tilknyttet",
      },
      "bridge-changes": {
        title: "Se kontoer stige og falle",
        body: "Hver kontorad og kategorioverskrift viser hvor mye den har gått opp eller ned - bruk velgeren 1d / 7d / 30d / 90d for å endre tidsvinduet. Historikken bak registreres privat på denne telefonen mens du bruker appen, så tallene dukker opp fra og med dag to.",
        detail: "Under hver kontorad og kategorioverskrift viser en opp/ned-linje endringen i vinduet du velger - en dag, en uke, en måned eller et kvartal - grønt for opp, rødt for ned, både i beløp og prosent. Kontantkontoer følger saldoendringene dine; aksje- og pensjonskontoer beveger seg med kursene på beholdningen. Den daglige verdihistorikken bak fanges opp privat på denne telefonen mens du bruker appen - den synkes aldri og forlater aldri enheten - så hver enhet bygger sine egne utgangspunkter fra dagen etter at du først bruker denne versjonen.",
        location: "Broen-fanen → velgeren 1d / 7d / 30d / 90d",
        keywords: "stige, falle, endring, opp, ned, delta, vindu, tidsvindu, sporing, gevinst, tap",
      },
      "bridge-plans": {
        title: "Kjøpsplaner",
        body: "Målsparing du starter med verktøyet Planlegg et kjøp på Sjøkart-fanen følges her: en fremdriftsstolpe per plan, månedstempoet en måldato krever, og innskudd med ett trykk. Sparte penger telles med i nettoformuen, og en fullfinansiert plan sier fra når den er klar til kjøp.",
        detail: "Hver kjøpsplan du starter på Sjøkart-fanen lever her som målsparing: en fremdriftsstolpe mot prisen, månedstempoet som kreves når du har satt en trengs-innen-dato, og innskudd med ett trykk for å legge til (eller korrigere) sparte penger. En fullfinansiert plan flagger seg selv som klar til kjøp. Planer telles med i nettoformuen som all annen sparing, synkes med den sammenkoblede partneren din og følger med i sikkerhetskopiene. Planer i kategorien Utdanning mater dessuten Arkens utdanningsmilepæl automatisk.",
        location: "Broen-fanen → Kjøpsplaner-kortet",
        keywords: "kjøp, planer, målsparing, spare opp, mål, sett inn, klar til kjøp",
      },
      "bridge-holdings": {
        title: "Følg aksjer og ETF-er per megler (Beholdning i sanntid)",
        body: "Slå på Beholdning i sanntid for å følge aksjer og ETF-er, ordnet per megler. Hver megler (som Fidelity) ligger i seksjonen Investeringer blant kontoene dine - trykk på den for å utvide beholdningen, med en sum for den megleren og en samlet sum for alle. Legg til en posisjon med ticker og antall aksjer, så telles markedsverdien med i nettoformuen. Kursene oppdateres bare når du trykker på Oppdater kurser, så legg til alle tickerne først og hent kursene én gang. Funksjonen er av til du slår den på her eller i Profil, og første gang ser du nøyaktig hva som forlater enheten din. Bare tickersymbolene dine sendes noen gang ut for å slå opp kurser - aldri antall aksjer, saldoer eller hvem du er.",
        detail: "Beholdning i sanntid er strengt valgfritt. Når det er på, utvides hver meglerkonto i seksjonen Investeringer og viser posisjonene sine - legg til én med tickersymbol og antall aksjer, så ruller markedsverdien (antall × siste kurs) inn i meglerens sum og nettoformuen din. Kursene oppdateres bare når du trykker på Oppdater kurser; store porteføljer hentes i bolker, og knappen sier fra om noen tickere fortsatt er på vei. Personvernkontrakten er presis: bare tickersymboler forlater telefonen for å slå opp kurser - aldri antall aksjer, saldoer eller noe som identifiserer deg - og du ser en forklaring i klartekst før den første forespørselen.",
        location: "Broen-fanen → investeringskontoer (valgfritt)",
        keywords: "aksjer, etf, beholdning, ticker, andeler, antall, megler, fidelity, kurser, investering, aksjekonto, portefølje",
      },
    },
  },
  Utilities: {
    intro: "Sjøkart - leksjoner, kalkulatorer og prognoser",
    steps: {
      "charts-course": {
        title: "Kapteinskurset",
        body: "Et gratis kurs i personlig økonomi i 5 kapitler og 24 korte leksjoner - budsjettgrunnlag, bli kvitt gjeld, sparing, investering og langsiktig formue. Fremgangen din følges, og du kan lese leksjonene i den rekkefølgen du vil.",
        detail: "Fem kapitler, 24 korte leksjoner, helt gratis og lesbare i den rekkefølgen du vil: Sette seil (budsjettgrunnlag), Tette skroget (gjeld), Fylle byssa (buffer, høyrentekonto, målsparing), Fange vinden (rentes rente, indeksfond, 401(k)/IRA/Roth, vanlige feil) og Kartlegge fjerne farvann (nettoformue, kjøpe eller leie, forsikring, arvegrunnlag). Leksjoner som foreslår å åpne en konto, nevner ekte, etablerte aktører og hva hver av dem er god til - ingen betaler BudgetArk for å være med. Lesefremgangen din følges, så du kan fortsette der du slapp. Selve leksjonene er foreløpig på engelsk.",
        location: "Sjøkart-fanen (øverste kort)",
        keywords: "kurs, leksjoner, lære, utdanning, investering, indeksfond, kaptein, kapitler",
      },
      "utilities-tool": {
        title: "Økonomiske kalkulatorer",
        body: "Trykk på en verktøyoverskrift for å utvide den: rentes rente, en lånekalkulator med eksporterbar betalingsplan, en nullpunktssjekk for refinansiering, en bufferplanlegger, en valutakalkulator og en amerikansk nettolønnskalkulator som viser hva en lønn faktisk gir på kontoen hver lønning. Disse verktøyene skriver aldri til dataene dine.",
        detail: "Seks sandkassekalkulatorer, hver bak en utvidbar overskrift: rentes rente med en S&P 500-forhåndsinnstilling som realistisk langsiktig grunnlag; en lånekalkulator som lager hele nedbetalingsplanen (eksporterbar); et refinansieringsverktøy som finner nullpunktsmåneden mellom etableringskostnader og den lavere renten; en bufferplanlegger dimensjonert etter de faktiske månedlige nødvendighetene dine; en valutakalkulator (USD, EUR, GBP, CAD, JPY, SEK) som viser nøyaktig hvor ferske kursene er og likevel svarer offline; og en nettolønnskalkulator - angi en amerikansk lønn, skattestatus og delstat for å se føderal skatt, delstatsskatt, Social Security og Medicare, effektiv skattesats og marginalskatt, valgfrie 401(k)-/HSA-/premiefradrag, og hva samme lønn gir i en annen delstat. Skatteverktøyet regner helt ut fra innebygde IRS- og delstatstabeller - ingenting du skriver forlater telefonen. Dette er rene sandkasser - de leser ingenting privat og skriver ingenting til dataene dine.",
        location: "Sjøkart-fanen → verktøyoverskrifter",
        keywords: "kalkulator, rentes rente, lån, nedbetalingsplan, amortisering, refinansiering, buffer, verktøy, glidebryter, valuta, valutakurs, konverter, fx, nettolønn, netto, lønn, skatt, lønning, delstat, skattetrekk",
      },
      "charts-what-if": {
        title: "Hva om jeg sluttet å bruke penger på…",
        body: "Velg en av forbrukskategoriene dine og se to fremtider side om side: hvor mye tidligere du ville blitt gjeldfri (og renten du ville spart), eller hva de pengene ville vokst til etter 1, 5 og 10 år. Beregnet fra din egen budsjetthistorikk, helt på denne telefonen.",
        detail: "Verktøyet leser det faktiske snittet ditt for hver forbrukskategori over de siste seks registrerte månedene, og lar deg så stille inn hvor mye av det du ville omdirigert. Gjeldssiden kjører den faktiske nedbetalingsplanen din på nytt (snøball eller snøskred, du velger) med de ekstra pengene og viser måneder spart pluss samlet rente over løpetiden du slipper; sparesiden viser hva samme månedsbeløp vokser til etter 1, 5 og 10 år med en oppgitt antakelse på 7 %. Alt beregnes fra dine egne poster, på telefonen din - det er et speil, ikke en gjetning.",
        location: "Sjøkart-fanen → Hva om-verktøyet",
        keywords: "hva om, slutte å bruke, omdirigere, prognose, tidligere, spart rente, vekst",
      },
      "charts-purchase": {
        title: "Planlegg et kjøp",
        body: "Sparer du til noe? Gi det et navn, sett prisen og velg et månedlig beløp å sette av - verktøyet viser når det er klart, om tempoet passer den faktiske kontantstrømmen din, og råd tilpasset steget ditt i Bygg arken din så kjøpet aldri sporer av de større målene dine. Startede planer lever i Kjøpsplaner-kortet på Broen, der de følges og telles med i nettoformuen.",
        detail: "Gi tingen et navn, sett prisen og det du allerede har spart, og velg så et månedlig beløp på glidebryteren - verktøyet viser måneden alt er spart opp, det månedlige beløpet som kreves hvis du setter en trengs-innen-dato, og en ærlig dom over om det tempoet passer den faktiske kontantstrømmen din (beregnet fra de siste seks månedenes inntekter og forbruk). Rådene tilpasser seg steget ditt i Bygg arken din: fullfør startbufferen først, hva avsetningen koster gjeldsnedbetalingen din, eller grønt lys for å spare opp og betale kontant. Å starte en plan oppretter en fulgt målsparing på Broen.",
        location: "Sjøkart-fanen → Planlegg et kjøp",
        keywords: "plan, kjøp, spare opp, målsparing, råd til, kontantstrøm, måldato",
      },
    },
  },
  Profile: {
    intro: "Profil - innstillingene dine",
    steps: {
      "profile-appearance": {
        title: "Tema, layout og valuta",
        body: "Velg en temapalett, en designstil og en tetthet (Kompakt, Komfortabel, Luftig) - tettheten endrer avstander og skriftstørrelser i hele appen, og ambiente temaer gir en levende bakgrunn. Visningsvalutaen din stiller du også inn her.",
        detail: "Utseende styrer hele uttrykket: temapaletter (inkludert ambiente temaer som Deep Space, Deep Forest og Deep Sea med levende animerte bakgrunner, lyse temaer som Harbor Dawn og Rose, og Lighthouse - et tema med maksimal kontrast der hver farge er stemt for lesbarhet), en designstil (ensfargede kort eller glass), en tetthet som skalerer avstander og tekst i hele appen, samt tekststørrelse. Visningsvalutaen din ligger også her - bytter du, kan du regne om eksisterende beløp eller bare bytte symbol, du velger. Bakgrunnseffekter kan slås av når som helst hvis du foretrekker ro.",
        location: "Profil-fanen → Utseende",
        keywords: "tema, mørk modus, lys modus, utseende, farger, glass, tetthet, tekststørrelse, valuta, ambient, bakgrunn, høy kontrast, tilgjengelighet, lighthouse",
      },
      "profile-connections": {
        title: "Banktilkoblinger (valgfritt)",
        body: "Koble til banken, kortene eller aksjekontoen din med kontoer DU eier - via SimpleFIN Bridge eller Teller - og la transaksjoner og saldoer importere seg selv. En innebygd oppsettsguide tar deg gjennom kostnad, registrering og personvern for hver leverandør. Innloggingsopplysningene forblir kryptert på denne enheten; BudgetArk har ingen server.",
        detail: "Banksynk skjer med dine egne kontoer: du kobler til via SimpleFIN Bridge (ett innlimt token, dekker tusenvis av amerikanske banker, ca. 1,50 $ i måneden betalt direkte til dem) eller Teller (gratisnivå via din egen utviklerkonto) - BudgetArk driver ingen aggregator og står aldri mellom deg og banken din. En innebygd guide går gjennom hver leverandørs kostnad, registrering og personvern før du starter. Importerte transaksjoner venter i gjennomgangsinnboksen på Budsjett-fanen; tilknyttede kontoer holder saldoene på Broen oppdatert; et tilknyttet kredittkort kan mate aktivitetsovervåkingen. Innloggingsopplysninger krypteres bare på denne enheten - de synkes aldri til en partner, følger aldri med i sikkerhetskopier og berører aldri en server, for det finnes ingen.",
        location: "Profil-fanen → Banktilkoblinger",
        keywords: "bank, tilkobling, simplefin, teller, synk, import, koble til, innloggingsopplysninger, oppsettsguide",
      },
      "profile-sync-data": {
        title: "Partnersynk og sikkerhetskopier",
        body: "Koble sammen med partnerens telefon og synk over hjemme-wifi - enhet til enhet, uten sky. Data-kortet håndterer krypterte sikkerhetskopier, regnearkeksport/-import og Nullstill alle data (som tar deg tilbake til førstegangsoppsettet).",
        detail: "Partnersynk kobler sammen to telefoner med en kode og synker deretter direkte over hjemme-wifi - telefon til telefon, kryptert, uten sky i midten. Begge partnere ser felles gjeld, budsjetter og kontoer; enhetsspesifikke ting som bankinnlogginger og kvitteringsbilder blir bevisst der de er. Data-kortet dekker passordbeskyttede krypterte sikkerhetskopier (eksporter en fil, gjenopprett ved å slå sammen eller erstatte), regnearkeksport/-import (CSV og xlsx) for å jobbe i Excel eller Sheets, og Nullstill alle data, som tømmer denne enheten og tar deg tilbake til introduksjonen ved første start.",
        location: "Profil-fanen → Partnersynk · Data",
        keywords: "partner, synk, koble sammen, wifi, sikkerhetskopi, backup, gjenopprett, eksport, import, regneark, excel, csv, nullstill",
      },
      "profile-extras": {
        title: "Prestasjoner, kategorier og mer",
        body: "Loggboken følger prestasjoner mens du bruker appen. Du kan også legge til egne budsjettkategorier, administrere bedrifter for utgiftsrapporter, slå på milde loggpåminnelser, aktivere personvernmodus for å blokkere skjermbilder, låse appen bak en PIN-kode og gi et valgfritt tips hvis BudgetArk har hjulpet deg.",
        detail: "Loggboken samler prestasjoner når du når ekte milepæler. Under Kategorier legger du til egne budsjettkategorier og flytter enhver kategori mellom bøttene Behov, Ønsker og Sparing. Bedriftsutgifter administrerer bedriftene du merker utgifter med og huser rapporten til skattemeldingen. Loggpåminnelser er valgfrie puff - en avstemming når du ikke har logget forbruk på en stund og en planleggingspåminnelse ved ny måned - planlagt helt på telefonen din uten noe sensitivt på låseskjermen. Personvernmodus blokkerer skjermbilder og skjermopptak av økonomien din. Applås (Innstillinger) spør etter en PIN-kode på 4-8 sifre hver gang appen åpnes, så noen som låner telefonen din ikke kan bla i økonomien din - PIN-koden blir på denne enheten, sikkerhetskopieres eller synkes aldri, så velg en du husker. Og tipsboksen tar imot et lite valgfritt tips som ikke låser opp noe, for alt er allerede gratis.",
        location: "Profil-fanen → Loggbok · Kategorier · Innstillinger",
        keywords: "prestasjoner, loggbok, egne kategorier, loggpåminnelser, påminnelser, varsler, personvernmodus, skjermbilde, tipsboks, applås, pin, pin-kode, lås, kode, sikkerhet",
      },
      "profile-help": {
        title: "Hjelp og introduksjon",
        body: "Åpne Introduksjon under Hjelp når du vil - det er hele denne guiden på ett søkbart sted, pluss en knapp Gjør introduksjonen om igjen som kjører hele førstegangsflyten på nytt. Dataene dine beholdes alltid.",
        detail: "Raden Introduksjon under Hjelp åpner hele denne guiden som en blabar, søkbar referanse: bla per fane, eller skriv et søkeord («kvittering», «kredittkort», «sikkerhetskopi») for å hoppe rett til hvordan noe fungerer og hvor du finner det. Knappen Gjør introduksjonen om igjen inni kjører hele førstegangsflyten på nytt - tema, velkomst, navn og så de guidede tipsene fane for fane - uten å røre dataene dine. Hvert spotlight-tips under omvisningen har dessuten en Les mer-bryter med samme dybde som det du leser nå.",
        location: "Profil-fanen → Hjelp → Introduksjon",
        keywords: "hjelp, guide, søk, introduksjon, onboarding, gjør om, hvordan, veiledning, gjennomgang, tips",
      },
    },
  },
};
