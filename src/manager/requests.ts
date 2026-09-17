import * as a from "../assets/index";
import type { ApprovalStep } from "../workflow";

export type RequestStatus = "offen" | "abgelehnt" | "abgeschlossen";
export type PartnerType = "Mitarbeiter" | "Interessent" | "Kunde";

/**
 * One Freigabe. A Maklervereinbarung asks for two of them — the documents and
 * then the signed document — and rows sharing a `group` are drawn as sub-rows
 * of a single partner.
 */
export type RequestRow = {
  id: string;
  group: string;
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
  /** How many comments the Freigabe carries, shown as a count in the table. */
  commentCount?: number;
  /**
   * The advisor has not asked for this Freigabe yet. The sub-row still shows,
   * so the workflow's remaining step stays visible, but it holds no data.
   */
  pending?: boolean;
  /** Set on rows that belong to the live workflow, which makes them actionable. */
  step?: ApprovalStep;
};

export const SCHRITT: Record<ApprovalStep, string> = {
  docs: "Dokumente freigeben",
  sign: "Unterzeichntes Dok. freigeben",
};

/** What the sub-row calls the Freigabe, and where it sits in the workflow. */
export const STEP_LABEL: Record<ApprovalStep, string> = {
  docs: "Dokumentenfreigabe",
  sign: "Unterzeichnetes Dokument",
};

export const STEP_POSITION: Record<ApprovalStep, string> = {
  docs: "Schritt: 5/6",
  sign: "Schritt: 6/6",
};

/** Demo rows carry no step of their own, so it is read back off the Schritt. */
export function stepOf(row: RequestRow): ApprovalStep {
  return row.step ?? (row.schritt === SCHRITT.sign ? "sign" : "docs");
}

const ASHLEY: RequestRow["partner"] = {
  name: "Ashley Atkinson",
  meta: "28.08.1981",
  kind: "person",
};

const LUNIXO: RequestRow["partner"] = { name: "Lunixo AG", kind: "company", winter: true };

const MARTINA: RequestRow["partner"] = {
  name: "Martina Donkey",
  meta: "22.01.1993",
  kind: "person",
};

const ASHTON = { name: "Cooper Ashton", role: "KFZ Innendienst", photo: a.reqAshton };
const DAVIS = { name: "Davis Julia", role: "KFZ Innendienst", photo: a.reqDavis };

/** Requests from other advisors, so the Bestandsmanager's inbox is not empty. */
export const DEMO_REQUESTS: RequestRow[] = [
  {
    id: "ashley-docs",
    group: "ashley",
    partner: ASHLEY,
    types: ["Interessent"],
    art: "Maklervereinbarung",
    schritt: SCHRITT.docs,
    requester: { name: "Adams Anna", role: "Geschäftsleitung", photo: a.reqAnna },
    date: "12.03.2027",
    time: "13:33",
    status: "offen",
    commentCount: 2,
  },
  {
    id: "ashley-sign",
    group: "ashley",
    partner: ASHLEY,
    types: ["Interessent"],
    art: "Maklervereinbarung",
    schritt: SCHRITT.sign,
    requester: { name: "Adams Anna", role: "Geschäftsleitung", photo: a.reqAnna },
    date: "–",
    time: "–",
    status: "offen",
    pending: true,
  },
  {
    id: "lunixo-docs",
    group: "lunixo",
    partner: LUNIXO,
    types: ["Interessent"],
    art: "Maklervereinbarung",
    schritt: SCHRITT.docs,
    requester: ASHTON,
    date: "12.03.2027",
    time: "11:12",
    status: "abgeschlossen",
    decided: "13.03.2027, CHAN",
    commentCount: 2,
    comment: "Passt so, freigegeben.",
  },
  {
    id: "lunixo-sign",
    group: "lunixo",
    partner: LUNIXO,
    types: ["Interessent"],
    art: "Maklervereinbarung",
    schritt: SCHRITT.sign,
    requester: ASHTON,
    date: "12.03.2027",
    time: "13:33",
    status: "abgelehnt",
    decided: "13.03.2027, CHAN",
    commentCount: 4,
    comment:
      "Es gibt noch Fehler in der Telefonnummer und Postadresse. Postadresse hat keine korrekte PLZ und bei der Nummer fehlt die letzte Zahl.",
  },
  {
    id: "martina-docs",
    group: "martina",
    partner: MARTINA,
    types: ["Kunde"],
    art: "Maklervereinbarung",
    schritt: SCHRITT.docs,
    requester: DAVIS,
    date: "12.03.2027",
    time: "11:12",
    status: "abgeschlossen",
    decided: "13.03.2027, CHAN",
    commentCount: 2,
    comment: "Dokumente sind korrekt.",
  },
  {
    id: "martina-sign",
    group: "martina",
    partner: MARTINA,
    types: ["Kunde"],
    art: "Maklervereinbarung",
    schritt: SCHRITT.sign,
    requester: DAVIS,
    date: "12.03.2027",
    time: "13:33",
    status: "abgeschlossen",
    decided: "13.03.2027, CHAN",
    commentCount: 4,
    comment: "Alles Perfekt.",
  },
];
