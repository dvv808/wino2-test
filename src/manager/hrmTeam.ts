import * as a from "../assets/index";
import { addDays, iso, parseIso, weekStart } from "../home/calendar/calendarData";

/**
 * Names, Abteilungen and roles: the real Makler Winter team (makler-winter.at → Team); the figures are dummy.
 * Dummy HR figures for the HRM Dashboard (Figma 19056:77709). Wino has no Zeitkonto, Monatsabschluss,
 * Mitarbeitergespräche or team calendar yet, so these stand in until the real lists exist. Live data
 * (Anträge, Lucy's Homeoffice) is added on top in the dashboard.
 */

export type Anstellung = {
  position: string;
  vorgesetzt: string;
  eintrittTag: string;
  eintrittMonat: string;
  eintrittJahr: string;
  ausmass: string;
  wochenstunden: string;
  standort: string;
  urlaub: string;
};

export type MaChannel = { value: string; note: string; extra?: string };

/** A Mitarbeiter's / Bewerber's Stammdaten, the same fields as a partner's (Wino - Concepts 21739:41943). */
export type MaStamm = {
  mandant: string;
  personentyp: string;
  hrm: string;
  titelVor: string;
  vorname: string;
  nachname: string;
  titelNach: string;
  rufname: string;
  geschlecht: string;
  geburt: string;
  nationalitaet: string;
  svNummer: string;
  notiz: string;
  addressTyp: string;
  strasse: string;
  nummer: string;
  zusatz: string;
  plz: string;
  ort: string;
  land: string;
  addressNotiz: string;
  contactNotiz: string;
  phones: MaChannel[];
  mails: MaChannel[];
  websites: MaChannel[];
  bank: { inhaber: string; iban: string; bic: string; institut: string; notiz?: string } | null;
  /** Uploaded documents (Typ, Gültig von / bis, Aussteller), from the Allgemeine Partnerdaten. */
  dokumente?: { label: string; name: string; type?: "pdf" | "jpg"; docTyp?: string; von?: string; bis?: string; aussteller?: string }[];
};

export type TeamMember = {
  name: string;
  abteilung: string;
  /** Open HR workflows (dummy). */
  workflows: number;
  role: string;
  photo: string;
  /** Urlaubstage: Anspruch per year and already used. */
  urlaubAnspruch: number;
  urlaubVerbraucht: number;
  /** Krankenstand in days: this year, this week, the week before. */
  krank: number;
  krankWoche: number;
  krankVorwoche: number;
  /** Dienstverhinderung in hours: this year, this week, the week before. */
  dv: number;
  dvWoche: number;
  dvVorwoche: number;
  /** Hours this year: Homeoffice and Sollzeit. */
  homeoffice: number;
  soll: number;
  /** Last month's Monatsabschluss done? */
  abschluss: boolean;
  /** Days with a faulty time entry this month. */
  fehler: number;
  /** Zeitkonto balance in minutes. */
  zeitkonto: number;
  /** Last Mitarbeitergespräch: days ago, kind and status. None = "nicht vorhanden". */
  gespraech?: { vorTagen: number; art: "Gespräch" | "Jahresgespräch" | "Probezeitgespräch"; status: "abgeschlossen" | "offen" };
  /** Created with "Mitarbeiter anlegen": Bewerber and Bewerber Potential are not (yet) employed. */
  typ?: MitarbeiterTyp;
  /** Created with "Mitarbeiter anlegen": everything entered there, shown in the employee tab. */
  angelegt?: Record<string, string>;
  /** Stammdaten section Anstellung, edited in the Mitarbeiter tab. */
  anstellung?: Anstellung;
  /** Stammdaten (Partner anlegen → Profil → Stammdaten Workflow). Seeded people get theirs from `stammOf`. */
  stamm?: MaStamm;
};

export type MitarbeiterTyp = "Mitarbeiter" | "Bewerber" | "Bewerber Potential";

type Row = [string, string, string, number, number, number, number, number, number, number, number, number, boolean, number, number, TeamMember["gespraech"]?];

const SOLL = 1640;
const ROWS: Row[] = [
  ["Silvia Fischbacher", "Leiterin Schaden & Leistung", a.empChristineHs, 30, 24, 3, 0, 1, 6, 0, 2, 310, true, 0, 540, { vorTagen: 1, art: "Gespräch", status: "abgeschlossen" }],
  ["Michael Pitzer", "Vertriebsleiter", a.empAlexander, 30, 9, 11, 2, 0, 12, 4, 0, 560, true, 2, -320, { vorTagen: 4, art: "Jahresgespräch", status: "abgeschlossen" }],
  ["Gertrud Badura", "Kundenberaterin", a.empChristine, 25, 21, 2, 0, 0, 3, 0, 0, 120, false, 0, 95, { vorTagen: 7, art: "Gespräch", status: "offen" }],
  ["Philip Winter", "Geschäftsführer", a.empPeter, 30, 12, 0, 0, 0, 0, 0, 0, 430, true, 0, 1260],
  ["Janine Gungl", "Beraterin Geschäftskunden", a.empJasmin, 25, 19, 14, 3, 2, 16, 0, 4, 80, false, 4, -610, { vorTagen: 26, art: "Probezeitgespräch", status: "offen" }],
  ["Julia Heigl", "Leitung HR-Management", a.reqAnna, 30, 26, 1, 0, 0, 2, 0, 0, 520, true, 0, 880, { vorTagen: 33, art: "Jahresgespräch", status: "abgeschlossen" }],
  ["Maria Straka", "Leiterin Finanzen & Controlling", a.reqSonja, 25, 8, 9, 0, 4, 9, 8, 0, 240, true, 1, -45],
  ["Manuel Scott", "Leiter KFZ-Versicherungen", a.reqMike, 25, 17, 4, 1, 0, 24, 0, 8, 190, false, 3, 130],
  ["Thomas Haidler", "Leiter IT-Management", a.reqAshton, 25, 5, 7, 0, 0, 8, 8, 0, 610, true, 0, 365],
  ["Sandra Lechner", "Marketing", a.reqDavis, 25, 23, 0, 0, 0, 4, 0, 0, 55, true, 0, 720, { vorTagen: 48, art: "Gespräch", status: "abgeschlossen" }],
  ["Margret Moser", "Fachabteilung Personenversicherungen", a.empJasmin, 25, 14, 6, 0, 1, 11, 0, 3, 495, true, 2, -180],
  ["Michael Slechta", "Sachverständiger Betriebliche Vorsorge", a.empPeter, 25, 10, 2, 0, 0, 5, 0, 0, 330, false, 5, -90, { vorTagen: 61, art: "Gespräch", status: "offen" }],
  ["Christian Huber", "Büroleiter - Prokurist", a.empAlexander, 25, 7, 3, 1, 0, 0, 0, 0, 150, true, 0, 45],
];

export type Abteilung = { name: string; lead: string[]; people: string[]; /** The Bewerber group of the tree: not an Abteilung you can pick. */ bewerber?: true };

/** The company tree of the Mitarbeiter side nav and its filter (Makler Winter → Abteilungen → Mitarbeiter). */
export const FIRMA = "Makler Winter";
/**
 * Bereiche (umbrellas, as on makler-winter.at): not an Abteilung you can pick, they only group them in the
 * side nav, the filter and the Organigramm.
 */
export const BEREICHE: { name: string; abteilungen: string[] }[] = [
  { name: "Management", abteilungen: ["Unternehmensführung", "Finanzmanagement", "HR-Management", "Office-Management", "IT-Management", "Marketing"] },
  { name: "Beratung & Service", abteilungen: ["Kundenberater", "Fachabteilung Betriebsversicherungen", "Fachabteilung Betriebliche Vorsorge", "Fachabteilung KFZ-Versicherungen", "Fachabteilung Personenversicherungen", "Schaden & Leistung"] },
];
export const bereichOf = (abteilung: string) => BEREICHE.find((b) => b.abteilungen.includes(abteilung))?.name ?? null;

export const ABTEILUNGEN: Abteilung[] = [
  // Makler Winter team (makler-winter.at → Kontakt → Team), in its two Bereiche (Management, Beratung & Service).
  // Lucy Dallon is the prototype user (Kalender, Homeoffice), not part of the HRM team.
  { name: "Unternehmensführung", lead: ["Leiter des Unternehmens: Philip Winter"], people: ["Philip Winter", "Wolfgang Stadlhofer", "Christian Huber"] },
  { name: "Finanzmanagement", lead: ["Abteilungsleitung: Maria Straka"], people: ["Maria Straka", "Edith Bindlechner", "Ines Raudaschl", "Alexander Köberl"] },
  { name: "HR-Management", lead: ["Abteilungsleitung: Julia Heigl"], people: ["Julia Heigl"] },
  { name: "Office-Management", lead: ["Abteilungsleitung: Birgit Mayerhofer"], people: ["Birgit Mayerhofer", "Gabriele Huber", "Georg Hauffe", "Lena Niederl", "Hanna Kolb"] },
  { name: "IT-Management", lead: ["Abteilungsleitung: Thomas Haidler"], people: ["Thomas Haidler", "Marcus Knauß", "Lara Schreiber"] },
  { name: "Marketing", lead: ["Abteilungsleitung: Sandra Lechner"], people: ["Sandra Lechner"] },
  { name: "Kundenberater", lead: ["Vorgesetzter der Abteilung: Michael Pitzer", "Abteilungsleitung: Sebastian Winter"], people: ["Michael Pitzer", "Sebastian Winter", "Anton Barthelme", "Helmut Michael Bartl", "Manfred Baumann", "Daniel Schütter", "Gerald Heigl", "Josip Vrhovac", "Janine Gungl", "Marco Edelsbrunner", "Michael Plamenig", "Alexander Vötsch", "Uwe Bliem", "Gertrud Badura", "Antonio Solaja", "Horst Kübler", "Christine Walcher", "Ramona Schwaab", "Thomas Langanger"] },
  { name: "Fachabteilung Betriebsversicherungen", lead: ["Abteilungsleitung: Renate Gerhardter", "Abteilungsleitung: Ramona Huber"], people: ["Renate Gerhardter", "Ramona Huber", "Philipp Knauß", "Hannes Sailer", "Adrian Wass", "Carina Lindner", "Hana Beganovic", "Marko Brtan", "Sarah Auer", "Lisbeth Bacher", "Bettina Aplinc", "Katharina Fliegel", "Fabian Wieser", "Pia Pesendorfer", "Marianne Gruber", "Olivia Zink", "Aleksander Stoch", "Elisabeth Stocker-Baier"] },
  { name: "Fachabteilung Betriebliche Vorsorge", lead: ["Abteilungsleitung: Michael Slechta"], people: ["Michael Slechta", "Christina Bernhard"] },
  { name: "Fachabteilung KFZ-Versicherungen", lead: ["Abteilungsleitung: Manuel Scott"], people: ["Manuel Scott", "Carina Winter", "Reinhard Fritz", "Theresa Perhab", "Lucia Salatovic", "Natalie Wegscheider", "Martina Bechter", "Simon Helpferer", "Therese Aigner", "Birgit Hofer", "Franz Jaksic", "David Filipovic", "Lukas Vrhovac"] },
  { name: "Fachabteilung Personenversicherungen", lead: ["Abteilungsleitung: Margret Moser"], people: ["Margret Moser", "Martina Habersatter", "Edith Puschnigg", "Nick Hofmann", "Leon Grgic", "Paul Steger"] },
  { name: "Schaden & Leistung", lead: ["Abteilungsleitung: Silvia Fischbacher"], people: ["Silvia Fischbacher", "Elfriede Winter", "Michael Steiner", "Carina Reif", "Sarah Pehab", "Jakob Steinberger", "Philipp Stocker", "Michael Weber", "Nelly Moser", "Larissa Scott", "Alexandra Eder"] },
  // Last in the tree, but a group of its own in the filter: everyone who is not (yet) employed.
  { name: "Bewerber", lead: ["Zuständig: HR-Management"], people: [], bewerber: true },
];

/**
 * As on makler-winter.at (Team page): academic titles (shown in the Stammdaten, not in the name), Firmen-Mail and
 * Durchwahl. Elisabeth Stocker-Baier (in Karenz) has no contact there.
 */
export const WEB: Record<string, { titelVor: string; titelNach: string; mail: string; phone: string }> = {"Philip Winter": {"titelVor": "", "titelNach": "", "mail": "philip.winter@makler-winter.at", "phone": "+43 3687 23753 155"}, "Wolfgang Stadlhofer": {"titelVor": "Mag.", "titelNach": "", "mail": "wolfgang.stadlhofer@makler-winter.at", "phone": "+43 3687 23753 212"}, "Christian Huber": {"titelVor": "", "titelNach": "", "mail": "christian.huber@makler-winter.at", "phone": "+43 3687 23753 114"}, "Maria Straka": {"titelVor": "", "titelNach": "", "mail": "maria.straka@makler-winter.at", "phone": "+43 3687 23753 242"}, "Edith Bindlechner": {"titelVor": "", "titelNach": "", "mail": "edith.bindlechner@makler-winter.at", "phone": "+43 3687 23753 115"}, "Ines Raudaschl": {"titelVor": "", "titelNach": "", "mail": "ines.raudaschl@makler-winter.at", "phone": "+43 3687 23753 146"}, "Alexander Köberl": {"titelVor": "Akad. VersMakler", "titelNach": "", "mail": "alexander.koeberl@makler-winter.at", "phone": "+43 3687 23753 116"}, "Julia Heigl": {"titelVor": "", "titelNach": "", "mail": "julia.heigl@makler-winter.at", "phone": "+43 3687 23753 148"}, "Birgit Mayerhofer": {"titelVor": "", "titelNach": "", "mail": "birgit.mayerhofer@makler-winter.at", "phone": "+43 3687 23753 129"}, "Gabriele Huber": {"titelVor": "", "titelNach": "", "mail": "gabriele.huber@makler-winter.at", "phone": "+43 3687 23753 110"}, "Georg Hauffe": {"titelVor": "", "titelNach": "", "mail": "georg.hauffe@makler-winter.at", "phone": "+43 3687 23753 158"}, "Lena Niederl": {"titelVor": "", "titelNach": "", "mail": "lena.niederl@makler-winter.at", "phone": "+43 3687 23753 153"}, "Hanna Kolb": {"titelVor": "", "titelNach": "", "mail": "hanna.kolb@makler-winter.at", "phone": "+43 3687 23753 190"}, "Thomas Haidler": {"titelVor": "Ing.", "titelNach": "", "mail": "thomas.haidler@makler-winter.at", "phone": "+43 3687 23753 124"}, "Marcus Knauß": {"titelVor": "", "titelNach": "", "mail": "marcus.knauss@makler-winter.at", "phone": "+43 3687 23753 117"}, "Lara Schreiber": {"titelVor": "", "titelNach": "", "mail": "lara.schreiber@makler-winter.at", "phone": "+43 3687 23753 177"}, "Sandra Lechner": {"titelVor": "", "titelNach": "", "mail": "sandra.lechner@makler-winter.at", "phone": "+43 3687 23753 171"}, "Michael Pitzer": {"titelVor": "Akad. VersMakler", "titelNach": "", "mail": "michael.pitzer@makler-winter.at", "phone": "+43 3687 23753 163"}, "Sebastian Winter": {"titelVor": "", "titelNach": "", "mail": "sebastian.winter@makler-winter.at", "phone": "+43 3687 23753 159"}, "Anton Barthelme": {"titelVor": "", "titelNach": "", "mail": "anton.barthelme@makler-winter.at", "phone": "+43 3687 23753 125"}, "Helmut Michael Bartl": {"titelVor": "Akad. Vkfm.", "titelNach": "", "mail": "helmut.bartl@makler-winter.at", "phone": "+43 3687 23753 162"}, "Manfred Baumann": {"titelVor": "", "titelNach": "", "mail": "manfred.baumann@makler-winter.at", "phone": "+43 3687 23753 111"}, "Daniel Schütter": {"titelVor": "", "titelNach": "", "mail": "daniel.schuetter@makler-winter.at", "phone": "+43 3687 23753 240"}, "Gerald Heigl": {"titelVor": "", "titelNach": "", "mail": "gerald.heigl@makler-winter.at", "phone": "+43 3687 23753 160"}, "Josip Vrhovac": {"titelVor": "", "titelNach": "", "mail": "josip.vrhovac@makler-winter.at", "phone": "+43 3687 23753 113"}, "Janine Gungl": {"titelVor": "Akad. VersMaklerin", "titelNach": "", "mail": "janine.gungl@makler-winter.at", "phone": "+43 3687 23753 517"}, "Marco Edelsbrunner": {"titelVor": "Akad. Vkfm.", "titelNach": "", "mail": "marco.edelsbrunner@makler-winter.at", "phone": "+43 3687 23753 521"}, "Michael Plamenig": {"titelVor": "", "titelNach": "", "mail": "michael.plamenig@makler-winter.at", "phone": "+43 3687 23753 131"}, "Alexander Vötsch": {"titelVor": "Akad. Vkfm.", "titelNach": "", "mail": "alexander.voetsch@makler-winter.at", "phone": "+43 3687 23753 511"}, "Uwe Bliem": {"titelVor": "", "titelNach": "", "mail": "uwe.bliem@makler-winter.at", "phone": "+43 3687 23753 139"}, "Gertrud Badura": {"titelVor": "", "titelNach": "", "mail": "gertrud.badura@makler-winter.at", "phone": "+43 3687 23753 150"}, "Antonio Solaja": {"titelVor": "", "titelNach": "", "mail": "antonio.solaja@makler-winter.at", "phone": "+43 3687 23753 176"}, "Horst Kübler": {"titelVor": "", "titelNach": "", "mail": "horst.kuebler@makler-winter.at", "phone": "+43 3687 23753 175"}, "Christine Walcher": {"titelVor": "", "titelNach": "", "mail": "christine.walcher@makler-winter.at", "phone": "+43 3687 23753 135"}, "Ramona Schwaab": {"titelVor": "Akad. Vkff.", "titelNach": "", "mail": "ramona.schwaab@makler-winter.at", "phone": "+43 3687 23753 245"}, "Thomas Langanger": {"titelVor": "", "titelNach": "", "mail": "thomas.langanger@makler-winter.at", "phone": "+43 3687 23753 153"}, "Richard Zechmann": {"titelVor": "Ing.", "titelNach": "", "mail": "richard.zechmann@makler-winter.at", "phone": "+43 3687 23753 149"}, "Thomas Reingruber": {"titelVor": "", "titelNach": "", "mail": "thomas.reingruber@makler-winter.at", "phone": "+43 3687 23753 169"}, "Renate Gerhardter": {"titelVor": "", "titelNach": "", "mail": "renate.gerhardter@makler-winter.at", "phone": "+43 3687 23753 244"}, "Ramona Huber": {"titelVor": "Akad. Vkff.", "titelNach": "", "mail": "ramona.huber@makler-winter.at", "phone": "+43 3687 23753 151"}, "Philipp Knauß": {"titelVor": "", "titelNach": "", "mail": "philipp.knauss@makler-winter.at", "phone": "+43 3687 23753 119"}, "Hannes Sailer": {"titelVor": "", "titelNach": "", "mail": "hannes.sailer@makler-winter.at", "phone": "+43 3687 23753 181"}, "Adrian Wass": {"titelVor": "", "titelNach": "", "mail": "adrian.wass@makler-winter.at", "phone": "+43 3687 23753 182"}, "Carina Lindner": {"titelVor": "", "titelNach": "", "mail": "carina.lindner@makler-winter.at", "phone": "+43 3687 23753 180"}, "Hana Beganovic": {"titelVor": "", "titelNach": "", "mail": "hana.beganovic@makler-winter.at", "phone": "+43 3687 23753 233"}, "Marko Brtan": {"titelVor": "", "titelNach": "", "mail": "marko.brtan@makler-winter.at", "phone": "+43 3687 23753 230"}, "Sarah Auer": {"titelVor": "", "titelNach": "", "mail": "sarah.auer@makler-winter.at", "phone": "+43 3687 23753 228"}, "Lisbeth Bacher": {"titelVor": "", "titelNach": "", "mail": "lisbeth.bacher@makler-winter.at", "phone": "+43 3687 23753 173"}, "Bettina Aplinc": {"titelVor": "", "titelNach": "", "mail": "bettina.aplinc@makler-winter.at", "phone": "+43 3687 23753 514"}, "Katharina Fliegel": {"titelVor": "", "titelNach": "", "mail": "katharina.fliegel@makler-winter.at", "phone": "+43 3687 23753 138"}, "Fabian Wieser": {"titelVor": "", "titelNach": "", "mail": "fabian.wieser@makler-winter.at", "phone": "+43 3687 23753 132"}, "Pia Pesendorfer": {"titelVor": "", "titelNach": "", "mail": "pia.pesendorfer@makler-winter.at", "phone": "+43 3687 23753 516"}, "Marianne Gruber": {"titelVor": "", "titelNach": "", "mail": "marianne.gruber@makler-winter.at", "phone": "+43 3687 23753 518"}, "Olivia Zink": {"titelVor": "Akad. Vkff.", "titelNach": "", "mail": "olivia.zink@makler-winter.at", "phone": "+43 3687 23753 513"}, "Aleksander Stoch": {"titelVor": "", "titelNach": "MSc", "mail": "aleksander.stoch@makler-winter.at", "phone": "+43 3687 23753 191"}, "Elisabeth Stocker-Baier": {"titelVor": "", "titelNach": "", "mail": "", "phone": ""}, "Michael Slechta": {"titelVor": "Akad. Vkfm.", "titelNach": "", "mail": "michael.slechta@makler-winter.at", "phone": "+43 3687 23753 211"}, "Christina Bernhard": {"titelVor": "Dr.", "titelNach": "", "mail": "christina.bernhard@makler-winter.at", "phone": "+43 3687 23753 157"}, "Manuel Scott": {"titelVor": "Akad. VersMakler", "titelNach": "", "mail": "manuel.scott@makler-winter.at", "phone": "+43 3687 23753 168"}, "Carina Winter": {"titelVor": "", "titelNach": "", "mail": "carina.winter@makler-winter.at", "phone": "+43 3687 23753 118"}, "Reinhard Fritz": {"titelVor": "", "titelNach": "", "mail": "reinhard.fritz@makler-winter.at", "phone": "+43 3687 23753 167"}, "Theresa Perhab": {"titelVor": "", "titelNach": "", "mail": "theresa.perhab@makler-winter.at", "phone": "+43 3687 23753 166"}, "Lucia Salatovic": {"titelVor": "", "titelNach": "", "mail": "lucia.salatovic@makler-winter.at", "phone": "+43 3687 23753 127"}, "Natalie Wegscheider": {"titelVor": "", "titelNach": "", "mail": "natalie.wegscheider@makler-winter.at", "phone": "+43 3687 23753 164"}, "Martina Bechter": {"titelVor": "", "titelNach": "", "mail": "martina.bechter@makler-winter.at", "phone": "+43 3687 23753 185"}, "Simon Helpferer": {"titelVor": "", "titelNach": "", "mail": "simon.helpferer@makler-winter.at", "phone": "+43 3687 23753 178"}, "Therese Aigner": {"titelVor": "", "titelNach": "", "mail": "therese.aigner@makler-winter.at", "phone": "+43 3687 23753 152"}, "Birgit Hofer": {"titelVor": "", "titelNach": "", "mail": "birgit.hofer@makler-winter.at", "phone": "+43 3687 23753 161"}, "Franz Jaksic": {"titelVor": "", "titelNach": "", "mail": "franz.jaksic@makler-winter.at", "phone": "+43 3687 23753 154"}, "David Filipovic": {"titelVor": "", "titelNach": "", "mail": "david.filipovic@makler-winter.at", "phone": "+43 3687 23753 156"}, "Lukas Vrhovac": {"titelVor": "", "titelNach": "", "mail": "lukas.vrhovac@makler-winter.at", "phone": "+43 3687 23753 165"}, "Margret Moser": {"titelVor": "", "titelNach": "", "mail": "margret.moser@makler-winter.at", "phone": "+43 3687 23753 170"}, "Martina Habersatter": {"titelVor": "", "titelNach": "", "mail": "martina.habersatter@makler-winter.at", "phone": "+43 3687 23753 241"}, "Edith Puschnigg": {"titelVor": "", "titelNach": "", "mail": "edith.puschnigg@makler-winter.at", "phone": "+43 3687 23753 174"}, "Nick Hofmann": {"titelVor": "", "titelNach": "", "mail": "nick.hofmann@makler-winter.at", "phone": "+43 3687 23753 134"}, "Leon Grgic": {"titelVor": "", "titelNach": "", "mail": "leon.grgic@makler-winter.at", "phone": "+43 3687 23753 187"}, "Paul Steger": {"titelVor": "", "titelNach": "", "mail": "paul.steger@makler-winter.at", "phone": "+43 3687 23753 136"}, "Silvia Fischbacher": {"titelVor": "Mag.", "titelNach": "", "mail": "silvia.fischbacher@makler-winter.at", "phone": "+43 3687 23753 222"}, "Elfriede Winter": {"titelVor": "", "titelNach": "", "mail": "elfriede.winter@makler-winter.at", "phone": "+43 3687 23753 512"}, "Michael Steiner": {"titelVor": "", "titelNach": "", "mail": "michael.steiner@makler-winter.at", "phone": "+43 3687 23753 223"}, "Carina Reif": {"titelVor": "Mag.", "titelNach": "", "mail": "carina.reif@makler-winter.at", "phone": "+43 3687 23753 126"}, "Sarah Pehab": {"titelVor": "", "titelNach": "", "mail": "sarah.pehab@makler-winter.at", "phone": "+43 3687 23753 137"}, "Jakob Steinberger": {"titelVor": "", "titelNach": "", "mail": "jakob.steinberger@makler-winter.at", "phone": "+43 3687 23753 519"}, "Philipp Stocker": {"titelVor": "Mag.", "titelNach": "", "mail": "philipp.stocker@makler-winter.at", "phone": "+43 3687 23753 183"}, "Michael Weber": {"titelVor": "", "titelNach": "", "mail": "michael.weber@makler-winter.at", "phone": "+43 3687 23753 515"}, "Nelly Moser": {"titelVor": "", "titelNach": "", "mail": "nelly.moser@makler-winter.at", "phone": "+43 3687 23753 186"}, "Larissa Scott": {"titelVor": "Akad. VersMaklerin", "titelNach": "", "mail": "larissa.scott@makler-winter.at", "phone": "+43 3687 23753 179"}, "Alexandra Eder": {"titelVor": "Mag.", "titelNach": "", "mail": "alexandra.eder@makler-winter.at", "phone": "+43 3687 23753 121"}};

/** Roles as on makler-winter.at (Team page), for everyone not in ROWS. */
const ROLLE: Record<string, string> = {
  "Elisabeth Stocker-Baier": "Fachabteilung Betriebsversicherungen – derzeit in Karenz",
  "Philip Winter": "Geschäftsführer",
  "Wolfgang Stadlhofer": "Geschäftsführer",
  "Christian Huber": "Büroleiter - Prokurist",
  "Maria Straka": "Leiterin Finanzen & Controlling",
  "Edith Bindlechner": "Finanzen & Controlling",
  "Ines Raudaschl": "Finanzen & Controlling",
  "Alexander Köberl": "Finanzen & Controlling",
  "Julia Heigl": "HR-Management",
  "Birgit Mayerhofer": "Leiterin Office-Management",
  "Gabriele Huber": "Office-Management",
  "Georg Hauffe": "Office-Management",
  "Lena Niederl": "Office-Management",
  "Hanna Kolb": "In Ausbildung",
  "Thomas Haidler": "Leiter IT-Management",
  "Marcus Knauß": "IT-Management",
  "Lara Schreiber": "IT-Management",
  "Sandra Lechner": "Marketing",
  "Michael Pitzer": "Vertriebsleiter",
  "Sebastian Winter": "Leiter Privatkunden",
  "Anton Barthelme": "Berater Geschäftskunden",
  "Helmut Michael Bartl": "Berater Geschäftskunden",
  "Manfred Baumann": "Berater Geschäftskunden",
  "Daniel Schütter": "Berater Geschäftskunden",
  "Gerald Heigl": "Berater Geschäftskunden",
  "Josip Vrhovac": "Berater Geschäftskunden",
  "Janine Gungl": "Beraterin Geschäftskunden",
  "Marco Edelsbrunner": "Berater Geschäftskunden",
  "Michael Plamenig": "Berater Geschäftskunden",
  "Alexander Vötsch": "Berater Geschäftskunden",
  "Uwe Bliem": "Kundenberater",
  "Gertrud Badura": "Kundenberaterin",
  "Antonio Solaja": "Kundenberater",
  "Horst Kübler": "Kundenberater",
  "Christine Walcher": "Kundenberaterin",
  "Ramona Schwaab": "Kundenberaterin",
  "Thomas Langanger": "Kundenberater",
  "Renate Gerhardter": "Leiterin Betriebsversicherungen",
  "Ramona Huber": "Leiterin Betriebsversicherungen",
  "Philipp Knauß": "Fachabteilung Betriebsversicherungen",
  "Hannes Sailer": "Fachabteilung Betriebsversicherungen",
  "Adrian Wass": "Fachabteilung Betriebsversicherungen",
  "Carina Lindner": "Fachabteilung Betriebsversicherungen",
  "Hana Beganovic": "Fachabteilung Betriebsversicherungen",
  "Marko Brtan": "Fachabteilung Betriebsversicherungen",
  "Sarah Auer": "Fachabteilung Betriebsversicherungen",
  "Lisbeth Bacher": "Fachabteilung Betriebsversicherungen",
  "Bettina Aplinc": "Fachabteilung Betriebsversicherungen",
  "Katharina Fliegel": "Fachabteilung Betriebsversicherungen",
  "Fabian Wieser": "Fachabteilung Betriebsversicherungen",
  "Pia Pesendorfer": "Fachabteilung Betriebsversicherungen",
  "Marianne Gruber": "Fachabteilung Betriebsversicherungen",
  "Olivia Zink": "Fachabteilung Betriebsversicherungen",
  "Aleksander Stoch": "Fachabteilung Betriebsversicherungen",
  "Michael Slechta": "Sachverständiger Betriebliche Vorsorge",
  "Christina Bernhard": "Fachabteilung Betriebliche Vorsorge",
  "Manuel Scott": "Leiter KFZ-Versicherungen",
  "Carina Winter": "Fachabteilung KFZ-Versicherungen",
  "Reinhard Fritz": "Fachabteilung KFZ-Versicherungen",
  "Theresa Perhab": "Fachabteilung KFZ-Versicherungen",
  "Lucia Salatovic": "Fachabteilung KFZ-Versicherungen",
  "Natalie Wegscheider": "Fachabteilung KFZ-Versicherungen",
  "Martina Bechter": "Fachabteilung KFZ-Versicherungen",
  "Simon Helpferer": "Fachabteilung KFZ-Versicherungen",
  "Therese Aigner": "Fachabteilung KFZ-Versicherungen",
  "Birgit Hofer": "Fachabteilung KFZ-Versicherungen",
  "Franz Jaksic": "Fachabteilung KFZ-Versicherungen",
  "David Filipovic": "Fachabteilung KFZ-Versicherungen",
  "Lukas Vrhovac": "Fachabteilung KFZ-Versicherungen",
  "Margret Moser": "Fachabteilung Personenversicherungen",
  "Martina Habersatter": "Fachabteilung Personenversicherungen",
  "Edith Puschnigg": "Fachabteilung Personenversicherungen",
  "Nick Hofmann": "Fachabteilung Personenversicherungen",
  "Leon Grgic": "Fachabteilung Personenversicherungen",
  "Paul Steger": "In Ausbildung",
  "Silvia Fischbacher": "Leiterin Schaden & Leistung",
  "Elfriede Winter": "Schaden & Leistung",
  "Michael Steiner": "Schaden & Leistung",
  "Carina Reif": "Schaden & Leistung",
  "Sarah Pehab": "Schaden & Leistung",
  "Jakob Steinberger": "Schaden & Leistung",
  "Philipp Stocker": "Schaden & Leistung",
  "Michael Weber": "Schaden & Leistung",
  "Nelly Moser": "Schaden & Leistung",
  "Larissa Scott": "Schaden & Leistung",
  "Alexandra Eder": "Schaden & Leistung"
};

/** The Abteilungen you can assign someone to (everything but the Bewerber group). */
export const ABTEILUNG_NAMEN = ABTEILUNGEN.filter((d) => !d.bewerber).map((d) => d.name);

const WORKFLOW_COUNT: Record<string, number> = { "Gertrud Badura": 2, "Philip Winter": 3, "Janine Gungl": 2, "Manuel Scott": 1 };

export const TEAM: TeamMember[] = ROWS.map(
  ([name, role, photo, urlaubAnspruch, urlaubVerbraucht, krank, krankWoche, krankVorwoche, dv, dvWoche, dvVorwoche, homeoffice, abschluss, fehler, zeitkonto, gespraech]) => ({
    name, role, photo, urlaubAnspruch, urlaubVerbraucht, krank, krankWoche, krankVorwoche, dv, dvWoche, dvVorwoche, homeoffice, soll: SOLL, abschluss, fehler, zeitkonto, gespraech,
    abteilung: ABTEILUNGEN.find((x) => x.people.includes(name))?.name ?? "",
    workflows: WORKFLOW_COUNT[name] ?? 0,
  }),
);


(function fillTeam() {
  const random = seeded(4242);
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
  const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const used = new Set(TEAM.map((m) => m.name));
  for (const dept of ABTEILUNGEN) {
    for (const name of dept.people) {
      if (used.has(name)) continue;
      used.add(name);
      const anspruch = random() < 0.3 ? 30 : 25;
      const krankWoche = random() < 0.12 ? between(1, 3) : 0;
      const dvWoche = random() < 0.15 ? between(2, 8) : 0;
      const gespraechArt = pick(["Gespräch", "Jahresgespräch", "Probezeitgespräch"] as const);
      TEAM.push({
        name,
        role: ROLLE[name] ?? "Mitarbeiter/in",
        photo: "",
        abteilung: dept.name,
        workflows: random() < 0.2 ? between(1, 3) : 0,
        urlaubAnspruch: anspruch,
        urlaubVerbraucht: between(3, anspruch - 1),
        krank: between(0, 14),
        krankWoche,
        krankVorwoche: random() < 0.12 ? between(1, 3) : 0,
        dv: between(0, 20),
        dvWoche,
        dvVorwoche: random() < 0.15 ? between(2, 8) : 0,
        homeoffice: between(40, 560),
        soll: SOLL,
        abschluss: random() < 0.8,
        fehler: random() < 0.25 ? between(1, 5) : 0,
        zeitkonto: between(-480, 1200),
        gespraech: random() < 0.75 ? { vorTagen: between(2, 300), art: gespraechArt, status: random() < 0.75 ? "abgeschlossen" : "offen" } : undefined,
      });
    }
  }
})();

/** Employees only (no Bewerber / Bewerber Potential): what the HRM figures count. */
export const isEmployee = (m: TeamMember) => !m.typ || m.typ === "Mitarbeiter";

export const member = (name: string) => TEAM.find((m) => m.name === name);

/** URL id of an employee ("tamara-auer"), for the employee tab. */
export const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const memberBySlug = (slug: string) => TEAM.find((m) => slugOf(m.name) === slug);

/** Resturlaub above this many days counts as "hoher Resturlaub". */
export const HOHER_RESTURLAUB = 12;
/** Homeoffice share of the Sollzeit that is "knapp/über 30%". */
export const HOMEOFFICE_GRENZE = 0.28;

export const TERMINARTEN = ["Projekte", "Weiterbildung", "Interne Besprechungen", "Termin - ohne Beratung", "Termine", "Termine - mit Beratung"] as const;
export type Terminart = (typeof TERMINARTEN)[number];
export type TeamTermin = { day: string; art: Terminart; extern: boolean; reise: boolean; wer: string };

/** Small seeded generator, so the team calendar is the same on every load. */
export function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const WEIGHTS: [Terminart, number][] = [
  ["Projekte", 33],
  ["Weiterbildung", 4],
  ["Interne Besprechungen", 24],
  ["Termin - ohne Beratung", 5],
  ["Termine", 27],
  ["Termine - mit Beratung", 12],
];

/** The team's Termine from 1 January to the end of this week (weekdays only). */
export function teamTermine(today: string): TeamTermin[] {
  const year = parseIso(today).getFullYear();
  const end = addDays(weekStart(today), 6);
  const random = seeded(year * 7919);
  const total = WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
  const list: TeamTermin[] = [];
  const staff = TEAM.filter(isEmployee);
  for (let day = `${year}-01-01`; day <= end; day = addDays(day, 1)) {
    const weekday = parseIso(day).getDay();
    if (weekday === 0 || weekday === 6) continue;
    // About five Termine per person and week, whatever the team size.
    const count = Math.round((3 + random() * 7) * (staff.length / 14));
    for (let i = 0; i < count; i++) {
      let pick = random() * total;
      const art = (WEIGHTS.find(([, w]) => (pick -= w) < 0) ?? WEIGHTS[0])[0];
      const extern = art !== "Interne Besprechungen" && art !== "Projekte" && random() < 0.55;
      list.push({ day, art, extern, reise: extern && random() < 0.35, wer: staff[Math.floor(random() * staff.length)].name });
    }
  }
  return list;
}

export const todayIso = () => iso(new Date());

/** A department by the slug of its name, e.g. "beratung-service". */
export const abteilungBySlug = (slug: string) => ABTEILUNGEN.find((dept) => slugOf(dept.name) === slug);

/**
 * "Mitarbeiter anlegen": adds a person to the team. A Mitarbeiter joins their Abteilung (and so the side nav);
 * Bewerber and Bewerber Potential only get their own tab for now.
 */
export function registerMember(entry: { name: string; role: string; abteilung: string; typ: MitarbeiterTyp; urlaubAnspruch: number; angelegt: Record<string, string> }) {
  const existing = TEAM.find((m) => m.name === entry.name);
  if (existing) return existing;
  const created: TeamMember = {
    name: entry.name,
    role: entry.role,
    photo: "",
    abteilung: entry.typ === "Mitarbeiter" ? entry.abteilung : "",
    workflows: 0,
    urlaubAnspruch: entry.urlaubAnspruch,
    urlaubVerbraucht: 0,
    krank: 0,
    krankWoche: 0,
    krankVorwoche: 0,
    dv: 0,
    dvWoche: 0,
    dvVorwoche: 0,
    homeoffice: 0,
    soll: SOLL,
    abschluss: true,
    fehler: 0,
    zeitkonto: 0,
    typ: entry.typ,
    angelegt: entry.angelegt,
  };
  TEAM.push(created);
  if (entry.typ === "Mitarbeiter") ABTEILUNGEN.find((d) => d.name === entry.abteilung)?.people.push(entry.name);
  else ABTEILUNGEN.find((d) => d.bewerber)?.people.push(entry.name);
  return created;
}



/** Vorname and Nachname of a team member (from "Mitarbeiter anlegen" when entered there). */
export function nameParts(person: TeamMember) {
  if (person.stamm) return { vorname: person.stamm.vorname, nachname: person.stamm.nachname };
  if (person.angelegt?.Vorname || person.angelegt?.Nachname) return { vorname: person.angelegt.Vorname ?? "", nachname: person.angelegt.Nachname ?? "" };
  // Everyone is written "Vorname Nachname" (as on makler-winter.at); the last word is the Nachname.
  const words = person.name.split(" ");
  return { vorname: words.slice(0, -1).join(" "), nachname: words.at(-1) ?? "" };
}

/** Three Bewerber from the start (Benjamin Atkinson is the Bewerber of the Figma screens). */
for (const [vorname, nachname, typ, notiz] of [
  ["Benjamin", "Atkinson", "Bewerber", "War vorher bei der Allianz tätig."],
  ["Lena", "Hofbauer", "Bewerber", "Bewerbung als Innendienst, Gespräch am 25.11.2026."],
  ["Maximilian", "Steiner", "Bewerber Potential", "Initiativbewerbung, für 2027 vorgemerkt."],
] as const) {
  registerMember({ name: `${vorname} ${nachname}`, role: typ, abteilung: "", typ, urlaubAnspruch: 25, angelegt: { Vorname: vorname, Nachname: nachname, Notiz: notiz } });
}
