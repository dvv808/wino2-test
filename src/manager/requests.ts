import * as a from "../assets/index";
import type { ApprovalStep } from "../workflow";

export type RequestStatus = "offen" | "abgelehnt" | "abgeschlossen";
export type PartnerType = "Mitarbeiter" | "Interessent" | "Kunde";

export type RequestRow = {
  id: string;
  partner: {
    name: string;
    meta?: string;
    alias?: string;
    kind: "person" | "company";
    photo?: string;
    /** Small Winter badge shown on partners held in our own portfolio. */
    winter?: boolean;
  };
  types: PartnerType[];
  art: string;
  schritt: string;
  requester: { name: string; role: string; photo: string };
  date: string;
  time: string;
  status: RequestStatus;
  decided?: string;
  /** The Bestandsmanager's note, written when the request was decided. */
  comment?: string;
  /** The advisor's note, written when the request was sent. */
  note?: string;
  /** Set on rows that belong to the live workflow, which makes them actionable. */
  step?: ApprovalStep;
};

export const SCHRITT: Record<ApprovalStep, string> = {
  docs: "Dokumente freigeben",
  sign: "Unterzeichntes Dok. freigeben",
};

/** Requests from other advisors, so the Bestandsmanager's inbox is not empty. */
export const DEMO_REQUESTS: RequestRow[] = [
  {
    id: "bella",
    partner: {
      name: "Bella Marie Johnson",
      meta: "22.11.1985",
      kind: "person",
      photo: a.partnerBella,
    },
    types: ["Mitarbeiter", "Interessent"],
    art: "Maklervereinb. Kunde",
    schritt: "Dokumente freigeben",
    requester: { name: "Adams Anna", role: "Geschäftsleitung", photo: a.reqAnna },
    date: "12.03.2027",
    time: "13:33",
    status: "offen",
  },
  {
    id: "fiona",
    partner: { name: "Fiona Grace AG", kind: "company", winter: true },
    types: ["Interessent"],
    art: "Maklervereinb. Kunde",
    schritt: "Dokumente freigeben",
    requester: { name: "Adams Sonja", role: "KFZ Innendienst", photo: a.reqSonja },
    date: "13.03.2027",
    time: "09:12",
    status: "offen",
  },
  {
    id: "ashley",
    partner: {
      name: "Ashley Atikinson",
      meta: "28.08.1981",
      alias: "(vulgo Hommalechna)",
      kind: "person",
    },
    types: ["Interessent"],
    art: "Maklervereinb. Kunde",
    schritt: "Unterzeichntes Dok. freigeben",
    requester: { name: "Bennett Mike", role: "KFZ Innendienst", photo: a.reqMike },
    date: "13.03.2027",
    time: "17:22",
    status: "offen",
  },
  {
    id: "lunixo",
    partner: { name: "Lunixo AG", kind: "company", winter: true },
    types: ["Interessent"],
    art: "Maklervereinb. Kunde",
    schritt: "Dokumente freigeben",
    requester: { name: "Cooper Ashton", role: "KFZ Innendienst", photo: a.reqAshton },
    date: "14.03.2027",
    time: "10:53",
    status: "abgelehnt",
    decided: "13.03.2027, CHAN",
    comment:
      "Es gibt noch Fehler in der Telefonnummer und Postadresse. Postadresse hat keine korrekte PLZ und bei der Nummer fehlt die letzte Zahl.",
  },
  {
    id: "martina",
    partner: { name: "Martina Donkey", meta: "22.01.1993", kind: "person" },
    types: ["Interessent"],
    art: "Maklervereinb. Kunde",
    schritt: "Unterzeichntes Dok. freigeben",
    requester: { name: "Davis Julia", role: "KFZ Innendienst", photo: a.reqDavis },
    date: "11.03.2027",
    time: "12:03",
    status: "abgeschlossen",
    decided: "13.03.2027, CHAN",
    comment: "Alles Perfekt.",
  },
];
