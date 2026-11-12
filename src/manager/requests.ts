import * as a from "../assets/index";
import { ADVISOR, MANAGER, SUPERVISOR } from "../approvalTabs";
import { FILE_PARTNERS, type PartnerId } from "../person/partners";
import {
  STAMMDATEN_AREAS,
  stammdatenDraftItems,
  type Section,
  type StammdatenAreaId,
} from "../person/stammdaten";
import { formatDate } from "../lib/honorar/format";
import { partnerOf } from "../lib/honorar/queries";
import { ROLE_USER } from "../mocks/honorar/seed";
import type { HonorarState } from "../types/honorar";
import { hhmm, parseIso } from "../home/calendar/calendarData";
import type { HomeofficeAntrag } from "../home/calendar/homeoffice";
import type { Approval, ApprovalStep, PostedComment, RequestStamp } from "../workflow";
import { JULIA_STAMMDATEN_DIFF, LUNIXO_WICO_DIFF, type StammdatenDiff } from "./stammdatenDiff";
import { stampOf as pruefStamp, type Pruefung } from "../person/pruefung";

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
  /** Stammdaten Entwurf — opens this area instead of a Freigabe step. */
  stammdatenArea?: StammdatenAreaId;
  stammdatenCardId?: string;
  /** Sub-row copy when the row is not a Freigabe step. */
  stepLabel?: string;
  stepPosition?: string;
  /** Maklervereinbarung is the default; Stammdaten rows live on their own tab. */
  kind?: "makler" | "stammdaten" | "rechnung" | "homeoffice";
  /** Homeoffice: the request (one time block) the Bestandsmanager decides. */
  homeofficeId?: string;
  /** Prüfmodus: the Stammdaten-Prüfung (Änderungswünsche from the client meeting) to work off. */
  pruefungId?: string;
  /** Rechnungskorrektur: the invoice whose Antrag the Bestandsmanager decides. */
  feeId?: string;
  /** Who authored the change — an employee, or WICO as an outside source. */
  source?: "person" | "wico";
  /** Partner file opened by „Zum Workflow“. */
  partnerId?: PartnerId;
  /** Winmakler vs Wino 2 comparison shown on the Freigabe and in Stammdaten. */
  diff?: StammdatenDiff;
};

export const WICO_SOURCE = { name: "WICO", role: "Externe Quelle", photo: a.gisa };

export function isStammdatenRequest(row: RequestRow) {
  return row.kind === "stammdaten";
}

export function isRechnungRequest(row: RequestRow) {
  return row.kind === "rechnung";
}

export function isHomeofficeRequest(row: RequestRow) {
  return row.kind === "homeoffice";
}

export function isWicoRequest(row: RequestRow) {
  return row.source === "wico";
}

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

const JULIA_FILE: RequestRow["partner"] = {
  name: FILE_PARTNERS.julia.name,
  meta: FILE_PARTNERS.julia.born,
  kind: "person",
};

function stammdatenStep(area: StammdatenAreaId) {
  const index = STAMMDATEN_AREAS.findIndex((entry) => entry.id === area);
  const total = STAMMDATEN_AREAS.length;
  const label = STAMMDATEN_AREAS[index]?.label.replace(/\n/g, " ") ?? area;
  return {
    stepLabel: label,
    stepPosition: `Schritt: ${index < 0 ? 1 : index + 1}/${total}`,
  };
}

/**
 * Stammdaten change requests for the Bestandsmanager. Lucy Dullon edited a
 * person file; WICO pushed Firmenbuch data for Lunixo.
 */
export const STAMMDATEN_REQUESTS: RequestRow[] = [
  {
    id: "julia-stammdaten-kontakte",
    group: "julia-stammdaten",
    partner: JULIA_FILE,
    partnerId: "julia",
    types: ["Kunde"],
    art: "Stammdaten",
    schritt: "Kontakte",
    requester: SUPERVISOR,
    reviewer: MANAGER,
    date: "22.10.2027",
    time: "13:33",
    status: "offen",
    commentCount: 1,
    note: "Zentraler Kontakt und Postadresse wurden angepasst.",
    kind: "stammdaten",
    source: "person",
    stammdatenArea: "kontakte",
    stammdatenCardId: "kontakt-julia",
    ...stammdatenStep("kontakte"),
    diff: JULIA_STAMMDATEN_DIFF,
  },
  {
    id: "julia-stammdaten-adressen",
    group: "julia-stammdaten",
    partner: JULIA_FILE,
    partnerId: "julia",
    types: ["Kunde"],
    art: "Stammdaten",
    schritt: "Adressen",
    requester: SUPERVISOR,
    reviewer: MANAGER,
    date: "06.09.2027",
    time: "09:12",
    status: "offen",
    commentCount: 1,
    note: "Postadresse weicht von Winmakler ab.",
    kind: "stammdaten",
    source: "person",
    stammdatenArea: "adressen",
    stammdatenCardId: "adresse-haupt",
    ...stammdatenStep("adressen"),
    diff: JULIA_STAMMDATEN_DIFF,
  },
  {
    id: "lunixo-stammdaten-wico",
    group: "lunixo-stammdaten",
    partner: LUNIXO,
    partnerId: "lunixo",
    types: ["Interessent"],
    art: "Stammdaten",
    schritt: "Wirtschaftsdaten",
    requester: WICO_SOURCE,
    reviewer: MANAGER,
    date: "15.10.2027",
    time: "08:04",
    status: "offen",
    commentCount: 1,
    note: "WICO hat die Firmenbuchdaten aktualisiert.",
    kind: "stammdaten",
    source: "wico",
    stammdatenArea: "wirtschaftsdaten",
    stammdatenCardId: "wirtschaft-firmenbuch",
    ...stammdatenStep("wirtschaftsdaten"),
    diff: LUNIXO_WICO_DIFF,
  },
];

export function stammdatenDiffFor(partnerId: PartnerId, area: StammdatenAreaId) {
  return STAMMDATEN_REQUESTS.find(
    (row) => row.partnerId === partnerId && row.stammdatenArea === area && row.diff,
  )?.diff;
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

/** One sub-row per Stammdaten card that is still in Entwurf. */
export function liveStammdatenDraftRows({
  sections,
  partner,
  types = ["Interessent"],
}: {
  sections: Section[];
  partner: RequestRow["partner"];
  types?: PartnerType[];
}): RequestRow[] {
  const total = STAMMDATEN_AREAS.length;
  return stammdatenDraftItems(sections).map((item) => {
    const index = STAMMDATEN_AREAS.findIndex((area) => area.id === item.area);
    return {
      id: `stammdaten-${item.cardId}`,
      group: "stammdaten-draft",
      partner,
      types,
      art: "Stammdaten Workflow",
      schritt: item.label,
      requester: ADVISOR,
      date: "–",
      time: "–",
      status: "offen" as const,
      pending: true,
      stammdatenArea: item.area,
      stammdatenCardId: item.cardId,
      stepLabel: item.label,
      stepPosition: `Schritt: ${index < 0 ? 1 : index + 1}/${total}`,
    };
  });
}

/**
 * One Freigabe per invoice workflow whose Antrag has been sent. The Bestandsmanager decides it here;
 * the advisor and Honorarverwalter only follow the result in the invoice workflow.
 */
export function liveRechnungRows(state: HonorarState): RequestRow[] {
  const rows: RequestRow[] = [];
  for (const fee of state.fees) {
    const correction = fee.correction;
    if (!correction || !correction.requestedAt) continue;
    const partner = partnerOf(state, fee.partnerId);
    const [date, time = ""] = formatDate(correction.requestedAt).split(" ");
    const status: RequestStatus =
      correction.status === "beantragt" ? "offen" : correction.status === "abgelehnt" ? "abgelehnt" : "abgeschlossen";
    rows.push({
      id: `rechnung-${fee.id}`,
      group: `rechnung-${fee.id}`,
      partner: { name: partner?.name ?? "Partner", kind: partner?.type === "company" ? "company" : "person", winter: partner?.type === "company" },
      types: ["Kunde"],
      art: `Rechnung: ${correction.workflow}`,
      schritt: "Antrag freigeben",
      stepLabel: "Antrag freigeben",
      stepPosition: "Schritt: 2/3",
      requester: { name: correction.requestedBy ?? ROLE_USER.advisor, role: "Kundenberater", photo: a.reqMike },
      reviewer: { name: ROLE_USER.head, role: "Bestandsmanager", photo: a.reqAnna },
      date,
      time,
      status,
      decided: correction.decidedAt ? `${formatDate(correction.decidedAt).split(" ")[0]}, ${ROLE_USER.head.split(" ").map((part) => part[0]).join("")}` : undefined,
      comment: correction.decisionComment,
      note: correction.reason,
      commentCount: (correction.reason ? 1 : 0) + (correction.decisionComment ? 1 : 0),
      kind: "rechnung",
      feeId: fee.id,
    });
  }
  return rows;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const WEEKDAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const dmy = (day: string) => {
  const d = parseIso(day);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
};
const stamp = (isoTime: string) => {
  const d = new Date(isoTime);
  return { date: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`, time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}` };
};

/**
 * Stammdaten-Prüfungen sent from the Prüfmodus: one row per request, on the Stammdaten tab. Open until every
 * Änderungswunsch is übernommen or abgelehnt and the Bestandsmanager closes it.
 */
export function livePruefungRows(list: Pruefung[]): RequestRow[] {
  return list
    .filter((entry) => entry.status !== "entwurf")
    .map((entry) => {
      const sent = pruefStamp(entry.sent);
      const closed = entry.closed ? pruefStamp(entry.closed) : undefined;
      const open = entry.changes.filter((change) => change.status === "offen").length;
      const file = FILE_PARTNERS[entry.partnerId];
      return {
        id: `pruefung-${entry.id}`,
        group: `pruefung-${entry.id}`,
        partner: {
          name: entry.partnerName,
          meta: file?.born,
          kind: file?.fileKind === "company" ? "company" : "person",
          winter: true,
        },
        partnerId: entry.partnerId,
        types: [file?.kind === "kunde" ? "Kunde" : "Interessent"],
        art: "Stammdaten-Prüfung",
        schritt: "Beim Kunden geprüft",
        stepLabel: entry.changes.length
          ? `${entry.changes.length} ${entry.changes.length === 1 ? "Änderungswunsch" : "Änderungswünsche"}${open && entry.status === "offen" ? ` · ${open} offen` : ""}`
          : "Alles korrekt",
        stepPosition: `${entry.files.length} ${entry.files.length === 1 ? "Anhang" : "Anhänge"}`,
        requester: ADVISOR,
        reviewer: MANAGER,
        date: sent.date,
        time: sent.time,
        status: entry.status === "abgeschlossen" ? "abgeschlossen" : "offen",
        decided: closed ? `${closed.date}, ${entry.closedBy ?? ""}`.trim() : undefined,
        note: entry.note || undefined,
        commentCount: entry.note ? 1 : 0,
        kind: "stammdaten",
        source: "person",
        pruefungId: entry.id,
      } satisfies RequestRow;
    });
}

export const HOMEOFFICE_REQUESTER = { name: "Lucy Dallon", role: "Innendienst", photo: a.empLucy };

/**
 * Homeoffice-Anträge from Kalender → Zeiterfassung (one row per time block, grouped per day). Deciding one here
 * updates the request, so the calendar and Kalender Aktivitäten → Beantragungen show the result.
 */
export function liveHomeofficeRows(antraege: HomeofficeAntrag[]): RequestRow[] {
  return [...antraege]
    .sort((x, y) => y.day.localeCompare(x.day) || x.start - y.start)
    .map((x) => {
      const sent = stamp(x.beantragt);
      const decidedAt = x.entschieden ? stamp(x.entschieden) : undefined;
      const initials = (x.entschiedenVon ?? ROLE_USER.head)
        .split(" ")
        .map((part) => part[0])
        .join("");
      return {
        id: `homeoffice-${x.id}`,
        group: `homeoffice-${x.day}`,
        partner: { name: "Lucy Dallon", meta: `${WEEKDAY[parseIso(x.day).getDay()]}, ${dmy(x.day)}`, kind: "person", photo: a.empLucy },
        types: ["Mitarbeiter"],
        art: "Homeoffice",
        schritt: "Homeoffice freigeben",
        stepLabel: `Homeoffice ${hhmm(x.start)} - ${hhmm(x.end)}`,
        stepPosition: dmy(x.day),
        requester: HOMEOFFICE_REQUESTER,
        reviewer: { name: ROLE_USER.head, role: "Bestandsmanager", photo: a.reqAnna },
        date: sent.date,
        time: sent.time,
        status: x.status === "offen" ? "offen" : x.status === "zurueckgesetzt" ? "abgelehnt" : "abgeschlossen",
        decided: decidedAt ? `${decidedAt.date}, ${initials}` : undefined,
        comment: x.entscheidNotiz,
        note: x.kommentar,
        commentCount: (x.kommentar ? 1 : 0) + (x.entscheidNotiz ? 1 : 0),
        kind: "homeoffice",
        homeofficeId: x.id,
      } satisfies RequestRow;
    });
}
