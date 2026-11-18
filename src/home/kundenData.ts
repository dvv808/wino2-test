import { FILE_PARTNERS, partnerKind, partnerKindText, type PartnerId } from "../person/partners";
import { buildKundePartner, type PartnerTyp } from "../person/createDraft";

/**
 * Customers of Home → Bestand → Kunden (Figma 8534:82498, logic 22880:486482): the real partner files plus demo
 * customers. Every demo customer is a real Wino file (id neu-<seq>), registered when the app starts, so each row
 * opens, links survive a reload and the Wino search finds them.
 */

export type Kunde = {
  key: string;
  id?: PartnerId;
  /** Demo rows: the number their Wino file gets on first open (id neu-<seq>). */
  seq?: number;
  name: string;
  sub: string;
  company: boolean;
  tags: string[];
  street: string;
  city: string;
  konzern: string;
  familie: string;
  berater: string;
  kundenNr: string;
  /** Red line over the name and a pink cell (Figma). */
  unpaid?: boolean;
  locked?: boolean;
};

/** Kundenberater: the Kürzel (first two letters of Nachname and Vorname) and the photo. */
export const BERATER = ["Lucy Dallon", "Jasmin Gratzinger", "Tamara Auer", "Alexander Doppler", "Adams Anna"];
export const kuerzel = (name: string) => {
  const [first, ...rest] = name.split(" ");
  const last = rest.join(" ") || first;
  return name === "Adams Anna" ? "ADAN" : `${last.slice(0, 2)}${first.slice(0, 2)}`.toUpperCase();
};

const DEMO: [string, string, boolean, string[], string, string, string, string, boolean?, boolean?][] = [
  ["Ava Grace Thompson", "05.03.1992 (vulgo Stoanacha)", false, ["Kunde"], "Bergstraße 22", "A 1234 Innsbruck", "Wilip GesmbH", "Familie +3", true],
  ["Bella Marie Johnson", "22.11.1985", false, ["Mitarbeiter", "Kunde"], "Wiesenweg 45", "A 5678 Graz", "", ""],
  ["Caleb Alexander Smith", "17.06.1990", false, ["Kunde"], "Feldgasse 10", "A 9101 Linz", "", ""],
  ["Charlotte Elizabeth Taylor", "30.01.1983", false, ["Kontaktperson", "Interessent bis 12.02.2026"], "Talstraße 88", "A 2345 Salzburg", "", "Familie +1"],
  ["Brown & Brown AG", "FN 412233a", true, ["★ Kunde"], "Hauptstraße 5", "A 6789 Klagenfurt", "Brown & Brown AG", "", true],
  ["Fiona Grace AG", "FN 233871k", true, ["Kunde bis 25.03.2026"], "Sonnenweg 33", "A 3456 Villach", "", "", false, true],
  ["Gavin Michael Wilson", "28.08.1981 (vulgo Hommalechna)", false, ["Kunde bis 13.05.2026", "Kontaktperson bis 13.05.2026"], "Blumenstraße 12", "A 7890 St. Pölten", "Lunixo AG", ""],
  ["Gartner & Gartner AG", "FN 118204p", true, ["★ Kunde"], "Eichenweg 77", "A 4567 Bregenz", "Garwin AG", ""],
  ["Gerd Samuel Martinez", "11.10.1987", false, ["Interessent"], "Birkenallee 99", "A 8901 Eisenstadt", "", ""],
  ["Harald Claire Anderson", "19.02.1994", false, ["Kunde", "Kontaktperson"], "Kiefernstraße 44", "A 1235 Amstetten", "", ""],
  ["Hutchington GesmbH", "FN 300112z", true, ["Kunde"], "Lindenweg 66", "A 6780 Tulln", "Hutchington Holding", ""],
  ["Hurl Andreas", "19.02.1994", false, ["Kunde", "Kontaktperson"], "Kiefernstraße 44", "A 1235 Amstetten", "", ""],
  ["Isabella Rose Brunner", "04.07.1979", false, ["Kunde"], "Seestraße 3", "A 5310 Mondsee", "", "Familie +2"],
  ["Jakob Leitner", "13.12.1968", false, ["Kunde"], "Ennsweg 18", "A 8970 Schladming", "", ""],
  ["Kaiser Bau GmbH", "FN 509981m", true, ["Interessent"], "Industriestraße 2", "A 4020 Linz", "", "", true],
  ["Laura Huber", "21.04.1996", false, ["Einfache Person"], "Mozartgasse 7", "A 5020 Salzburg", "", ""],
  ["Maximilian Egger", "02.09.1975", false, ["Kunde"], "Hauptplatz 11", "A 8940 Liezen", "", "Familie +4"],
  ["Nordlicht Logistik AG", "FN 77120f", true, ["★ Kunde"], "Hafenstraße 40", "A 1020 Wien", "Nordlicht Holding", ""],
  ["Olivia Pichler", "30.05.1989", false, ["Kunde", "Kontaktperson"], "Ringstraße 2", "A 3100 St. Pölten", "Nordlicht Logistik AG", ""],
  ["Paul Wimmer", "08.03.1958", false, ["Kunde bis 31.12.2026"], "Bahnhofstraße 9", "A 6020 Innsbruck", "", "Familie +1"],
  ["Quantum Software GmbH", "FN 451200x", true, ["Interessent"], "Technikerstraße 21", "A 6020 Innsbruck", "", ""],
  ["Rosa Steiner", "16.11.1971", false, ["Kunde"], "Am Anger 4", "A 8605 Kapfenberg", "", ""],
  ["Sebastian Fuchs", "23.06.1984", false, ["Mitarbeiter", "Kunde"], "Coburgstraße 52", "A 8970 Schladming", "", "Familie +2"],
  ["Theresa Mayr", "09.01.1999", false, ["Interessent"], "Linzer Gasse 21", "A 5020 Salzburg", "", ""],
  ["Wilip GesmbH", "FN 210987b", true, ["★ Kunde"], "Gewerbepark 1", "A 6130 Schwaz", "Wilip GesmbH", ""],
];

const TODAY = new Date();
/** "Kunde bis 13.05.2026": true once that date has passed. */
export function expired(tag: string) {
  const m = tag.match(/bis (\d{2})\.(\d{2})\.(\d{4})/);
  return !!m && new Date(+m[3], +m[2] - 1, +m[1]) < TODAY;
}
/** Winter Kunde (Figma 22880:486482): an active Kunde tag → dark icon with the Winter badge. */
export const isKunde = (r: Kunde) => r.tags.some((t) => /(^|★ )Kunde/.test(t) && !expired(t));
/** Inaktiv: every tag of the row has run out → grey row. */
export const isInactive = (r: Kunde) => r.tags.every(expired);
export function typOf(r: Kunde): PartnerTyp {
  if (isKunde(r)) return "Kunde";
  if (r.tags.some((t) => t.startsWith("Einfache"))) return "Einfache Person";
  return "Interessent";
}
export const ascii = (text: string) => text.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");


export function kundenRows(ashleyConverted: boolean): Kunde[] {
  const real: Kunde[] = Object.values(FILE_PARTNERS).map((p, i) => {
    const company = p.fileKind === "company";
    const kind = partnerKind(p, ashleyConverted);
    const lunixo = p.id.startsWith("lunixo");
    const atkinson = ["julia", "karl", "johanna", "ash", "marcus", "sophie", "udo", "thomas-atkinson", "ashley"].includes(p.id);
    return {
      key: p.id,
      id: p.id,
      name: p.name,
      sub: company ? (p.fn ? `FN ${p.fn}` : "") : p.born ?? "",
      company,
      tags: [partnerKindText(kind)],
      street: p.address?.[0] ?? "",
      city: (p.address?.[1] ?? "").replace("A-", "A "),
      konzern: lunixo ? "Lunixo Holding AG" : p.id === "julia" ? "Lunixo AG" : "",
      familie: atkinson ? "Familie Atkinson" : "",
      berater: BERATER[i % BERATER.length],
      kundenNr: `K${p.fileId}`,
    };
  });
  const demo: Kunde[] = DEMO.map(([name, sub, company, tags, street, city, konzern, familie, unpaid, locked], i) => ({
    key: `demo-${i}`,
    seq: 80000 + i,
    id: `neu-${80000 + i}` as PartnerId,
    name,
    sub,
    company,
    tags,
    street,
    city,
    konzern,
    familie,
    berater: BERATER[(i * 3) % BERATER.length],
    kundenNr: `K${1100 + i * 37}`,
    unpaid,
    locked,
  }));
  return [...real, ...demo].sort((x, y) => x.name.localeCompare(y.name, "de"));
}


const GF = ["Mag. Stefan Gruber", "Dr. Andrea Leitner", "Ing. Markus Hofer", "Mag. Sabine Wallner", "Thomas Eder", "Dipl.-Ing. Petra Koller"];

/** A company's Geschäftsführung: the Vertretungsbefugte Person for its Maklervereinbarung. */
function companyContact(r: Kunde) {
  const name = GF[(r.seq ?? 0) % GF.length];
  const plain = name.replace(/^(Mag\.|Dr\.|Ing\.|Dipl\.-Ing\.)\s*/, "");
  return {
    name,
    role: "Geschäftsführung",
    phone: `+43 664 ${String(2000000 + (((r.seq ?? 0) * 3571) % 7999999))}`,
    mail: `${ascii(plain)}@${ascii(r.name).split(".")[0]}.at`,
  };
}

/** The data a demo customer's Wino file is built from. */
function fileInput(r: Kunde): Parameters<typeof buildKundePartner>[0] {
  const [born, vulgo] = r.sub.startsWith("FN") ? [undefined, undefined] : (r.sub.match(/^([\d.]+)(?:\s*\(vulgo ([^)]+)\))?/)?.slice(1) ?? []);
  const local = ascii(r.name);
  return {
    name: r.name,
    company: r.company,
    born,
    vulgo,
    street: r.street,
    city: r.city,
    typ: typOf(r),
    phone: `664 ${String(1000000 + (((r.seq ?? 0) * 7919) % 8999999))}`,
    mail: r.company ? `office@${local.split(".")[0]}.at` : `${local}@mail.at`,
    notiz: r.unpaid ? "Abonnement nicht bezahlt." : undefined,
    fn: r.company ? r.sub.replace(/^FN\s*/, "") : undefined,
    contact: r.company ? companyContact(r) : undefined,
  };
}

/** Every demo customer as a built Wino file (file, Stammdaten sections, versions). */
export function demoKundenFiles() {
  return kundenRows(false)
    .filter((r) => r.seq !== undefined)
    .map((r) => buildKundePartner(fileInput(r), r.seq!));
}
