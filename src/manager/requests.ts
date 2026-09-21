import * as a from "../assets/index";
import { ADVISOR, MANAGER } from "../approvalTabs";
import type { Approval, ApprovalStep, PostedComment, RequestStamp } from "../workflow";

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
  /** Who the advisor sent the Freigabe to — shown on the advisor's status list. */
  reviewer?: { name: string; role: string; photo: string };
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

const THOMAS: RequestRow["partner"] = {
  name: "Thomas Berger",
  meta: "03.04.1979",
  kind: "person",
};

const SOMMER: RequestRow["partner"] = { name: "Sommer GmbH", kind: "company", winter: true };

/**
 * Requests this advisor already sent. They show on the advisor's Workflows page
 * and in the Bestandsmanager inbox, unlike DEMO_REQUESTS which belong to others.
 */
export const ADVISOR_REQUESTS: RequestRow[] = [
  {
    id: "thomas-docs",
    group: "thomas",
    partner: THOMAS,
    types: ["Interessent"],
    art: "Maklervereinbarung",
    schritt: SCHRITT.docs,
    requester: ADVISOR,
    reviewer: MANAGER,
    date: "18.03.2027",
    time: "09:41",
    status: "offen",
    commentCount: 1,
    note: "Bitte um Prüfung der Dokumente.",
  },
  {
    id: "thomas-sign",
    group: "thomas",
    partner: THOMAS,
    types: ["Interessent"],
    art: "Maklervereinbarung",
    schritt: SCHRITT.sign,
    requester: ADVISOR,
    reviewer: MANAGER,
    date: "–",
    time: "–",
    status: "offen",
    pending: true,
  },
  {
    id: "sommer-docs",
    group: "sommer",
    partner: SOMMER,
    types: ["Interessent"],
    art: "Maklervereinbarung",
    schritt: SCHRITT.docs,
    requester: ADVISOR,
    reviewer: MANAGER,
    date: "14.03.2027",
    time: "10:05",
    status: "abgeschlossen",
    decided: "15.03.2027, CHAN",
    commentCount: 2,
    comment: "Dokumente sind korrekt.",
  },
  {
    id: "sommer-sign",
    group: "sommer",
    partner: SOMMER,
    types: ["Interessent"],
    art: "Maklervereinbarung",
    schritt: SCHRITT.sign,
    requester: ADVISOR,
    reviewer: MANAGER,
    date: "15.03.2027",
    time: "16:22",
    status: "abgeschlossen",
    decided: "16.03.2027, CHAN",
    commentCount: 1,
    comment: "Freigegeben.",
  },
];

export function reviewerOf(row: RequestRow) {
  return row.reviewer ?? MANAGER;
}

/** Splits the flat request list into one entry per Maklervereinbarung. */
export function groupRequestRows(rows: RequestRow[]) {
  const groups: RequestRow[][] = [];
  const byKey = new Map<string, RequestRow[]>();

  for (const row of rows) {
    const existing = byKey.get(row.group);
    if (existing) {
      existing.push(row);
      continue;
    }

    const group = [row];
    groups.push(group);
    byKey.set(row.group, group);
  }

  return groups;
}

/** A workflow counts as one entry in the stat cards, not one per Freigabe. */
export function statusOfGroup(rows: RequestRow[]): RequestStatus {
  if (rows.some((row) => row.status === "abgelehnt")) return "abgelehnt";
  if (rows.every((row) => !row.pending && row.status === "abgeschlossen")) return "abgeschlossen";
  return "offen";
}

/** Both Freigaben of the live Maklervereinbarung, including steps not sent yet. */
export function liveMaklerRows({
  approvalOf,
  docSigner,
  requestedAt,
  requestNote,
  decisionNote,
  comments,
}: {
  approvalOf: (step: ApprovalStep) => Approval;
  docSigner: string;
  requestedAt: Partial<Record<ApprovalStep, RequestStamp>>;
  requestNote: Partial<Record<ApprovalStep, string>>;
  decisionNote: Partial<Record<ApprovalStep, string>>;
  comments: Partial<Record<ApprovalStep, PostedComment[]>>;
}): RequestRow[] {
  return (["docs", "sign"] as ApprovalStep[]).map((step) => {
    const approval = approvalOf(step);
    const sent = requestedAt[step];
    return {
      id: `live-${step}`,
      group: "live",
      partner: { name: docSigner, meta: "12.09.1988", kind: "person" },
      types: ["Interessent"],
      art: "Maklervereinbarung",
      schritt: SCHRITT[step],
      requester: ADVISOR,
      reviewer: MANAGER,
      date: sent ? sent.date : "–",
      time: sent ? sent.time : "–",
      status:
        approval === "granted" ? "abgeschlossen" : approval === "rejected" ? "abgelehnt" : "offen",
      decided: approval === "idle" ? undefined : sent && `${sent.date}, CHAN`,
      comment: decisionNote[step] || undefined,
      note: requestNote[step] || undefined,
      commentCount:
        (requestNote[step] ? 1 : 0) +
        (decisionNote[step] ? 1 : 0) +
        (comments[step]?.length ?? 0),
      pending: approval === "idle",
      step,
    };
  });
}
