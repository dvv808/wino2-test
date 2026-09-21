import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { hashToRoute, routeToHash, type PersonArea, type PersonModule } from "./routing";
import { FILE_PARTNERS, type PartnerId } from "./person/partners";
import {
  MULTI_CARD_AREAS,
  STAMMDATEN_AREAS,
  areaTitle,
  cardPayload,
  cloneAshleySections,
  cloneSections,
  publishedSnapshot,
  sectionData,
  emptyAddressCard,
  emptyBankCard,
  emptyContactCard,
  emptyWirtschaftCard,
  partnerForm,
  sectionIdForArea,
  type Card,
  type Section,
  type StammdatenAreaId,
} from "./person/stammdaten";
import {
  INITIAL_VERSIONS,
  ASHLEY_VERSIONS,
  EDITOR_ADVISOR,
  currentVersion,
  historyFromStammdatenSave,
  isMarriageCertificate,
  latestLegalNumber,
  namesDiffer,
  overlayPersonVersion,
  personNameFromVersion,
  type PersonVersion,
} from "./person/versions";


export type Model = "privat" | "partner" | "custom";
export type OpenMenu = "partner" | "bank" | "textblock" | "docSigner" | "signer" | null;
export type StepId = "tasks" | "comms" | "fee" | "terms" | "scope" | "docs" | "sign";
export type Approval = "idle" | "requested" | "granted" | "rejected";
export type SignMode = "upload" | "digital";
/**
 * The workflow and the Bestandsmanager are two separate workspaces. From the
 * Bestandsmanager's list, a single request opens as its own page: "freigabe".
 */
export type View = "workflow" | "manager" | "freigabe" | "person" | "stammdaten";
export type WorkflowPane = "workflow" | "notizen" | "email" | "dateien" | "verlauf";
/** Only these two steps need a Freigabe from the Bestandsmanager. */
export type ApprovalStep = Extract<StepId, "docs" | "sign">;
export type RequestStamp = { date: string; time: string };

/**
 * A comment typed into the Kommentare thread. Held here rather than in the tab
 * so the advisor and the Bestandsmanager read the same thread.
 */
export type PostedComment = {
  person: { name: string; photo: string };
  text: string;
  at: RequestStamp;
};

function stamp(): RequestStamp {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

export type Partner = {
  id: string;
  name: string;
  tariff: string;
  ok: boolean;
};

export type Bank = {
  id: string;
  name: string;
  bank: string;
  iban: string;
  hint?: string;
};

export const PARTNERS: Partner[] = [
  { id: "herbert", name: "Herbert Hofer", tariff: "Privat", ok: true },
  { id: "lunixo", name: "Lunixo AG", tariff: "Business Individuell", ok: false },
];

export const BANKS: Bank[] = [
  {
    id: "julia",
    name: "Julia Atkinson",
    bank: "Neon Bank",
    iban: "AT 2303 20002 0000 0002 0012",
  },
  {
    id: "lunixo-neon",
    name: "Lunixo AG",
    bank: "Neon Bank",
    iban: "AT 2303 20002 0000 0002 0012",
    hint: "Kein SEPA",
  },
  {
    id: "lunixo-astelo",
    name: "Lunixo AG,",
    bank: "Astelo Bank,",
    iban: "AT 5523 20002 0000 0002 0012",
  },
  {
    id: "john",
    name: "John Reed",
    bank: "Neon Bank",
    iban: "AT 2303 20002 0000 0002 0012",
  },
];

export const DOCUMENTS = [
  "Maklervereinbarung",
  "SEPA",
  "Vollmacht: Versicherungs.",
  "Vollmacht: Verhandl. m. Ver.",
];

export const TEXT_BLOCKS = [
  "Alleinvermittlungsauftrag",
  "Beratung ausschließlich über den Makler",
  "Kündigungsverzicht 12 Monate",
];

export const STEPS: { id: StepId; label: string; n?: string }[] = [
  { id: "tasks", label: "Offene Aufgaben" },
  { id: "comms", label: "Kommunikations-\ndaten", n: "1" },
  { id: "fee", label: "Honorar", n: "2" },
  { id: "terms", label: "Individuelle\nVereinbarungen", n: "3" },
  { id: "scope", label: "Leistungsumfang", n: "4" },
  { id: "docs", label: "Dokumentenfreigabe", n: "5" },
  { id: "sign", label: "Signaturen", n: "6" },
];

const STEP_IDS = STEPS.map((step) => step.id);

export const APPROVAL_STEPS: ApprovalStep[] = ["docs", "sign"];

export const APPROVAL_LABELS: Record<ApprovalStep, string> = {
  docs: "Dokumentenfreigabe",
  sign: "Signaturfreigabe",
};

type PartnerFile = {
  sections: Section[];
  versions: PersonVersion[];
  viewingVersionId: string;
  stammdatenBaseline: Section[] | null;
  stammdatenPublished: Section[] | null;
};

function initialPartnerFiles(): Record<PartnerId, PartnerFile> {
  return {
    julia: {
      sections: cloneSections(),
      versions: INITIAL_VERSIONS,
      viewingVersionId: INITIAL_VERSIONS[INITIAL_VERSIONS.length - 1]?.id ?? INITIAL_VERSIONS[0].id,
      stammdatenBaseline: null,
      stammdatenPublished: null,
    },
    ashley: {
      sections: cloneAshleySections(),
      versions: ASHLEY_VERSIONS,
      viewingVersionId: ASHLEY_VERSIONS[0].id,
      stammdatenBaseline: null,
      stammdatenPublished: null,
    },
  };
}

function useWorkflowState() {
  const [initialRoute] = useState(() => hashToRoute(window.location.hash));
  const [activeStep, setActiveStep] = useState<StepId>(initialRoute.activeStep ?? "tasks");
  const [done, setDone] = useState<Partial<Record<StepId, boolean>>>({});

  const [model, setModel] = useState<Model>("privat");
  const [billing, setBilling] = useState<"next" | "custom">("custom");
  const [payment, setPayment] = useState<"debit" | "invoice">("debit");
  const [delivery, setDelivery] = useState<"email" | "post">("email");
  const [amount] = useState("EUR 120,00");
  const [day, setDay] = useState("01");
  const [month, setMonth] = useState("08");
  const [year, setYear] = useState("2026");
  const [dueDay, setDueDay] = useState("01");
  const [dueMonth, setDueMonth] = useState("01");
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [bankId, setBankId] = useState("julia");
  const [paymentTerm, setPaymentTerm] = useState("14");
  const [invoiceNote, setInvoiceNote] = useState("");
  const [customNote, setCustomNote] = useState(
    "Wurde Aufgrund der privaten Lebensverhältnisse genehmigt, dass kein Honorar fällig ist.",
  );

  const [textBlock, setTextBlock] = useState<string | null>(null);
  const [termsText, setTermsText] = useState("");

  const [activeDoc, setActiveDoc] = useState(0);
  const [docsApproval, setDocsApproval] = useState<Approval>("idle");
  const [docSigner, setDocSigner] = useState("Julia Atkinson");

  const [signMode, setSignMode] = useState<SignMode>("upload");
  const [signFile, setSignFile] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [signDay, setSignDay] = useState("24");
  const [signMonth, setSignMonth] = useState("11");
  const [signYear, setSignYear] = useState("2027");
  const [signApproval, setSignApproval] = useState<Approval>("idle");
  const [previewTab, setPreviewTab] = useState<"original" | "signed">("signed");

  const [pdfOpen, setPdfOpen] = useState(false);

  const [view, setView] = useState<View>(initialRoute.view);
  const [personModule, setPersonModule] = useState<PersonModule>(
    () => initialRoute.personModule ?? "profil",
  );
  const [personArea, setPersonArea] = useState<PersonArea>(
    () =>
      initialRoute.personArea ??
      (initialRoute.partnerId === "ashley" ? "maklermandat" : "stammdaten"),
  );
  const [filePartnerId, setFilePartnerId] = useState<PartnerId>(() => initialRoute.partnerId ?? "julia");
  const [ashleyConverted, setAshleyConverted] = useState(false);
  const [partnerFiles, setPartnerFiles] = useState<Record<PartnerId, PartnerFile>>(initialPartnerFiles);
  const file = partnerFiles[filePartnerId];
  const { sections, versions, viewingVersionId, stammdatenBaseline, stammdatenPublished } = file;
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const [stammdatenArea, setStammdatenArea] = useState<StammdatenAreaId>(
    initialRoute.stammdatenArea ?? "personendaten",
  );
  const [stammdatenCardId, setStammdatenCardId] = useState<string | null>(
    initialRoute.stammdatenCardId ?? null,
  );
  const [leavePrompt, setLeavePrompt] = useState(false);
  const [leaveDest, setLeaveDest] = useState<"person" | "workflow" | "stay">("person");
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [versionSaveError, setVersionSaveError] = useState<string | null>(null);
  /** Who granted a step: yourself via the shortcut, or the Bestandsmanager. */
  const [grantedBy, setGrantedBy] = useState<Partial<Record<ApprovalStep, "self" | "manager">>>({});
  /** When each request was sent, shown in the Bestandsmanager's list. */
  const [requestedAt, setRequestedAt] = useState<Partial<Record<ApprovalStep, RequestStamp>>>({});
  /** The advisor's note to the Bestandsmanager, captured when requesting. */
  const [requestNote, setRequestNote] = useState<Partial<Record<ApprovalStep, string>>>({});
  /** The Bestandsmanager's note back to the advisor, captured when deciding. */
  const [decisionNote, setDecisionNote] = useState<Partial<Record<ApprovalStep, string>>>({});
  /** When each request was decided, shown alongside the Bestandsmanager's note. */
  const [decidedAt, setDecidedAt] = useState<Partial<Record<ApprovalStep, RequestStamp>>>({});
  /** Comments typed into the Kommentare thread, per step. */
  const [comments, setComments] = useState<Partial<Record<ApprovalStep, PostedComment[]>>>({});
  /** The step to return to once the Bestandsmanager is done. */
  const [returnStep, setReturnStep] = useState<ApprovalStep | null>(null);
  /** The request currently open in the Bestandsmanager's review modal. */
  const [reviewStep, setReviewStep] = useState<ApprovalStep | null>(null);
  /** The id of the request opened as a full Freigabe page. */
  const [freigabeId, setFreigabeId] = useState<string | null>(initialRoute.freigabeId ?? null);
  const [workflowPane, setWorkflowPane] = useState<WorkflowPane>(
    initialRoute.workflowPane ?? "workflow",
  );
  /** Parked Maklervereinbarung tab: stays visible on Person until the tab is closed. */
  const [maklerOpen, setMaklerOpen] = useState(
    () =>
      initialRoute.view === "workflow" ||
      initialRoute.view === "manager" ||
      initialRoute.view === "freigabe",
  );

  function setSections(update: Section[] | ((current: Section[]) => Section[])) {
    setPartnerFiles((all) => {
      const current = all[filePartnerId];
      return {
        ...all,
        [filePartnerId]: {
          ...current,
          sections: typeof update === "function" ? update(current.sections) : update,
        },
      };
    });
  }

  function setVersions(update: PersonVersion[] | ((current: PersonVersion[]) => PersonVersion[])) {
    setPartnerFiles((all) => {
      const current = all[filePartnerId];
      return {
        ...all,
        [filePartnerId]: {
          ...current,
          versions: typeof update === "function" ? update(current.versions) : update,
        },
      };
    });
  }

  function setViewingVersionId(update: string | ((current: string) => string)) {
    setPartnerFiles((all) => {
      const current = all[filePartnerId];
      return {
        ...all,
        [filePartnerId]: {
          ...current,
          viewingVersionId: typeof update === "function" ? update(current.viewingVersionId) : update,
        },
      };
    });
  }

  function setStammdatenBaseline(
    update: Section[] | null | ((current: Section[] | null) => Section[] | null),
  ) {
    setPartnerFiles((all) => {
      const current = all[filePartnerId];
      return {
        ...all,
        [filePartnerId]: {
          ...current,
          stammdatenBaseline:
            typeof update === "function" ? update(current.stammdatenBaseline) : update,
        },
      };
    });
  }

  function setStammdatenPublished(
    update: Section[] | null | ((current: Section[] | null) => Section[] | null),
  ) {
    setPartnerFiles((all) => {
      const current = all[filePartnerId];
      return {
        ...all,
        [filePartnerId]: {
          ...current,
          stammdatenPublished:
            typeof update === "function" ? update(current.stammdatenPublished) : update,
        },
      };
    });
  }

  /** The first write replaces the entry so the back button does not land on a bare URL. */
  const hashWritten = useRef(false);
  useEffect(() => {
    const next = routeToHash({
      view,
      activeStep,
      freigabeId: freigabeId ?? undefined,
      stammdatenArea,
      stammdatenCardId: stammdatenCardId ?? undefined,
      workflowPane,
      personModule,
      personArea,
      partnerId: filePartnerId,
    });
    if (window.location.hash === next) {
      hashWritten.current = true;
      return;
    }
    if (hashWritten.current) window.location.hash = next;
    else window.history.replaceState(null, "", next);
    hashWritten.current = true;
  }, [
    view,
    activeStep,
    freigabeId,
    stammdatenArea,
    stammdatenCardId,
    workflowPane,
    personModule,
    personArea,
    filePartnerId,
  ]);

  useEffect(() => {
    function applyHash() {
      const route = hashToRoute(window.location.hash);
      setView(route.view);
      if (route.activeStep) setActiveStep(route.activeStep);
      setFreigabeId(route.freigabeId ?? null);
      if (route.stammdatenArea) setStammdatenArea(route.stammdatenArea);
      setStammdatenCardId(route.stammdatenCardId ?? null);
      setWorkflowPane(route.workflowPane ?? "workflow");
      if (route.view === "person") setPersonModule(route.personModule ?? "profil");
      if (route.personArea) setPersonArea(route.personArea);
      if (route.partnerId) setFilePartnerId(route.partnerId);
      if (route.view === "workflow") setMaklerOpen(true);
    }
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    if (view !== "stammdaten") return;
    const snapshot = sectionsRef.current;
    setStammdatenBaseline((current) => current ?? structuredClone(snapshot));
    setStammdatenPublished((current) => current ?? publishedSnapshot(snapshot));
  }, [view, filePartnerId]);

  const selectedPartner = partners.find((partner) => partner.id === partnerId) ?? null;
  const selectedBank = BANKS.find((bank) => bank.id === bankId) ?? BANKS[0];

  const modelLabel = useMemo(() => {
    if (model === "partner") return "bei anderem Partner mit umfasst";
    if (model === "custom") return "Individuell";
    return "Privat";
  }, [model]);

  function markDone(step: StepId) {
    setDone((current) => ({ ...current, [step]: true }));
  }

  function goTo(step: StepId) {
    setActiveStep(step);
    setOpenMenu(null);
  }

  function goNext() {
    markDone(activeStep);
    const index = STEP_IDS.indexOf(activeStep);
    const next = STEP_IDS[index + 1];
    if (next) goTo(next);
  }

  function goBack() {
    const index = STEP_IDS.indexOf(activeStep);
    const previous = STEP_IDS[index - 1];
    if (previous) goTo(previous);
  }

  function toggleMenu(menu: OpenMenu) {
    setOpenMenu((current) => (current === menu ? null : menu));
  }

  function chooseModel(next: Model) {
    setModel(next);
    setOpenMenu(null);
    if (next !== "partner") setPartnerId(null);
  }

  /**
   * The signed artefact only exists once a file is uploaded or a signature is drawn.
   * Missing consent does not block the Freigabe — it only triggers a warning first.
   */
  const hasSignature = signMode === "upload" ? Boolean(signFile) : Boolean(signature);

  const approvalOf = (step: ApprovalStep) => (step === "docs" ? docsApproval : signApproval);

  function setApprovalOf(step: ApprovalStep, value: Approval) {
    if (step === "docs") setDocsApproval(value);
    else setSignApproval(value);
  }

  /** Requests still waiting for a decision — this is the Bestandsmanager's inbox. */
  const openRequests = APPROVAL_STEPS.filter((step) => approvalOf(step) === "requested");

  /** Hand the step off to the Bestandsmanager and switch into their workspace. */
  function requestApproval(step: ApprovalStep, note = "") {
    setApprovalOf(step, "requested");
    setRequestedAt((current) => ({ ...current, [step]: stamp() }));
    setRequestNote((current) => ({ ...current, [step]: note }));
    setDecisionNote((current) => ({ ...current, [step]: undefined }));
    setDecidedAt((current) => ({ ...current, [step]: undefined }));
    setReturnStep(step);
    setOpenMenu(null);
    setPdfOpen(false);
    setView("manager");
  }

  /** Grant without a handoff ("Freigabe selbst erteilen"). */
  function grantApproval(step: ApprovalStep) {
    setApprovalOf(step, "granted");
    setGrantedBy((current) => ({ ...current, [step]: "self" }));
    markDone(step);
  }

  function addComment(step: ApprovalStep, person: PostedComment["person"], text: string) {
    const posted: PostedComment = { person, text, at: stamp() };
    setComments((current) => ({ ...current, [step]: [...(current[step] ?? []), posted] }));
  }

  /** Rewrites one of the posted comments, keeping its author and timestamp. */
  function editComment(step: ApprovalStep, index: number, text: string) {
    setComments((current) => ({
      ...current,
      [step]: (current[step] ?? []).map((entry, at) => (at === index ? { ...entry, text } : entry)),
    }));
  }

  function removeComment(step: ApprovalStep, index: number) {
    setComments((current) => ({
      ...current,
      [step]: (current[step] ?? []).filter((_, at) => at !== index),
    }));
  }

  function decideRequest(step: ApprovalStep, decision: "granted" | "rejected", note = "") {
    setApprovalOf(step, decision);
    setDecisionNote((current) => ({ ...current, [step]: note }));
    setDecidedAt((current) => ({ ...current, [step]: stamp() }));
    if (decision === "granted") {
      setGrantedBy((current) => ({ ...current, [step]: "manager" }));
      markDone(step);
    }
    setReviewStep(null);
    leaveManager(step);
  }

  /** Back to the workflow. Undecided requests stay pending. */
  function exitToWorkflow(step?: ApprovalStep) {
    const target = step ?? returnStep;
    if (target) setActiveStep(target);
    setReturnStep(null);
    setReviewStep(null);
    setFreigabeId(null);
    setWorkflowPane("workflow");
    setMaklerOpen(true);
    setView("workflow");
  }

  function leaveManager(step?: ApprovalStep) {
    if (hasStammdatenDrafts()) {
      setLeaveDest("workflow");
      setLeavePrompt(true);
      return;
    }
    if (stammdatenBaseline) {
      setStammdatenBaseline(null);
      if (!hasUnpublishedStammdaten()) setStammdatenPublished(null);
    }
    exitToWorkflow(step);
  }

  /** Open one request from the Bestandsmanager's list as its own page. */
  function openFreigabe(id: string) {
    setFreigabeId(id);
    setView("freigabe");
  }

  /** Opens the person file. Open workflow tabs stay parked until their own close control. */
  function openPerson() {
    setView("person");
  }

  function openPartner(id: PartnerId) {
    setFilePartnerId(id);
    setPersonModule("profil");
    setPersonArea(id === "ashley" ? "maklermandat" : "stammdaten");
    setVersionHistoryOpen(false);
    setView("person");
  }

  function openPersonArea(area: PersonArea) {
    setPersonArea(area);
    setPersonModule("profil");
    setView("person");
  }

  function convertAshley() {
    setAshleyConverted(true);
  }

  /** Profil vs Workflows & To-Dos, still inside the person file. */
  function openPersonModule(module: PersonModule) {
    setPersonModule(module);
    setView("person");
  }

  function openMakler() {
    setMaklerOpen(true);
    setView("workflow");
  }

  function closeMakler() {
    setMaklerOpen(false);
    if (view === "workflow") setView("person");
  }

  function firstCardId(area: StammdatenAreaId, source = sections) {
    const section = source.find((entry) => entry.id === sectionIdForArea(area));
    return section?.cards.find((card) => !card.empty)?.id ?? null;
  }

  function openStammdaten(area: StammdatenAreaId, cardId?: string) {
    setStammdatenBaseline((current) => current ?? structuredClone(sections));
    setStammdatenPublished((current) => current ?? publishedSnapshot(sections));
    setStammdatenArea(area);
    setStammdatenCardId(cardId ?? firstCardId(area));
    setView("stammdaten");
  }

  function resumeStammdaten() {
    setStammdatenBaseline((current) => current ?? structuredClone(sections));
    setStammdatenPublished((current) => current ?? publishedSnapshot(sections));
    setView("stammdaten");
  }

  function goStammdatenArea(area: StammdatenAreaId) {
    setStammdatenArea(area);
    setStammdatenCardId(firstCardId(area));
  }

  function selectStammdatenCard(id: string) {
    setStammdatenCardId(id);
  }

  function rewriteSection(area: StammdatenAreaId, rewrite: (cards: Card[]) => Card[]) {
    const sectionId = sectionIdForArea(area);
    setPartnerFiles((all) => {
      const current = all[filePartnerId];
      return {
        ...all,
        [filePartnerId]: {
          ...current,
          stammdatenBaseline: current.stammdatenBaseline ?? structuredClone(current.sections),
          stammdatenPublished: current.stammdatenPublished ?? publishedSnapshot(current.sections),
          sections: current.sections.map((section) =>
            section.id === sectionId ? { ...section, cards: rewrite(section.cards) } : section,
          ),
        },
      };
    });
  }

  function patchStammdatenCard(area: StammdatenAreaId, card: Card) {
    const baselineCard = stammdatenBaseline
      ?.find((section) => section.id === sectionIdForArea(area))
      ?.cards.find((entry) => entry.id === card.id);
    const published =
      card.previous ??
      baselineCard?.previous ??
      (baselineCard ? cardPayload(baselineCard) : undefined);
    const stillChanged = published ? JSON.stringify(cardPayload(card)) !== JSON.stringify(cardPayload(published)) : true;
    const next = {
      ...card,
      draft: stillChanged,
      previous: stillChanged && published ? published : undefined,
    };
    rewriteSection(area, (cards) => cards.map((entry) => (entry.id === next.id ? next : entry)));
  }

  function addStammdatenCard(preset?: Card) {
    if (!MULTI_CARD_AREAS.includes(stammdatenArea)) return;
    const id = preset?.id ?? `${stammdatenArea}-${Date.now()}`;
    const card = preset
      ? { ...preset, id, draft: true }
      : stammdatenArea === "kontakte"
        ? emptyContactCard(id)
        : stammdatenArea === "adressen"
          ? emptyAddressCard(id)
          : stammdatenArea === "bankverbindungen"
            ? emptyBankCard(id)
            : emptyWirtschaftCard(id);
    rewriteSection(stammdatenArea, (cards) => [...cards.filter((entry) => !entry.empty), card]);
    setStammdatenCardId(id);
  }

  function deleteStammdatenCard(area: StammdatenAreaId, cardId: string) {
    const leftover = sections
      .find((section) => section.id === sectionIdForArea(area))
      ?.cards.find((card) => card.id !== cardId && !card.empty)?.id ?? null;
    rewriteSection(area, (cards) => cards.filter((card) => card.id !== cardId));
    setStammdatenCardId((current) => (current === cardId ? leftover : current));
  }

  const viewingVersion = versions.find((version) => version.id === viewingVersionId) ?? currentVersion(versions);
  const liveVersion = currentVersion(versions);
  const isHistorical = Boolean(viewingVersion && viewingVersion.number < latestLegalNumber(versions));
  const displaySections = useMemo(
    () => overlayPersonVersion(sections, isHistorical ? viewingVersion : undefined),
    [sections, isHistorical, viewingVersion],
  );

  function partnerCardOf(source: Section[]) {
    return source.find((section) => section.id === "personendaten")?.cards.find((card) => !card.empty);
  }

  const livePartner = partnerCardOf(sections);
  const livePartnerName = livePartner
    ? `${partnerForm(livePartner).vorname} ${partnerForm(livePartner).nachname}`.trim()
    : "";
  const shownName = isHistorical
    ? personNameFromVersion(viewingVersion, FILE_PARTNERS[filePartnerId].name)
    : livePartnerName || personNameFromVersion(liveVersion, FILE_PARTNERS[filePartnerId].name);

  function openVersionHistory() {
    setVersionHistoryOpen(true);
  }

  function closeVersionHistory() {
    setVersionHistoryOpen(false);
  }

  function viewCurrentVersion() {
    const latest = currentVersion(versions);
    if (latest) setViewingVersionId(latest.id);
  }

  function openHistoryChange(id: string) {
    const entry = versions.find((version) => version.id === id);
    if (!entry) return;
    setViewingVersionId(id);
    setVersionHistoryOpen(true);
    const { place } = entry;
    if (place.app === "stammdaten") {
      if (view !== "stammdaten") {
        setStammdatenBaseline((current) => current ?? structuredClone(sections));
        setStammdatenPublished((current) => current ?? publishedSnapshot(sections));
      }
      setStammdatenArea(place.area);
      setStammdatenCardId(place.cardId ?? firstCardId(place.area));
      setView("stammdaten");
      return;
    }
    if (place.app === "makler") {
      setActiveStep(place.step);
      setWorkflowPane("workflow");
      setMaklerOpen(true);
      setView("workflow");
      return;
    }
    setView("person");
  }

  function viewPersonVersion(id: string) {
    openHistoryChange(id);
  }

  function saveStammdaten(publish: boolean) {
    if (isHistorical) return false;
    if (!publish) {
      setStammdatenBaseline(structuredClone(sections));
      setStammdatenPublished((current) => current ?? publishedSnapshot(sections));
      return true;
    }

    const card = partnerCardOf(sections);
    const form = card ? partnerForm(card) : undefined;
    const nameChanged = Boolean(form && liveVersion && namesDiffer(form.nachname, liveVersion.nachname));
    if (nameChanged && form && !form.files.some(isMarriageCertificate)) {
      setVersionSaveError(
        "Eine Änderung des Nachnamens legt eine neue Version an. Dafür ist eine Heiratsurkunde als Anhang Pflicht.",
      );
      if (stammdatenArea !== "personendaten") goStammdatenArea("personendaten");
      return false;
    }

    const published = sections.map((section) => ({
      ...section,
      cards: section.cards.map((entry) => cardPayload(entry)),
    }));
    const at = stamp();
    const number = nameChanged ? latestLegalNumber(versions) + 1 : latestLegalNumber(versions);
    const proof = form?.files.find(isMarriageCertificate);
    const before = stammdatenPublished ?? publishedSnapshot(stammdatenBaseline ?? sections);
    const entries = historyFromStammdatenSave(before, published, {
      number,
      at,
      editor: EDITOR_ADVISOR,
      vorname: form?.vorname || liveVersion?.vorname || FILE_PARTNERS[filePartnerId].name.split(" ")[0] || "Julia",
      nachname: form?.nachname || liveVersion?.nachname || FILE_PARTNERS[filePartnerId].name.split(" ").at(-1) || "Atkinson",
      legalNachname:
        nameChanged && form && liveVersion
          ? {
              from: liveVersion.nachname,
              to: form.nachname,
              attachment: proof ? { label: proof.label, name: proof.name } : undefined,
            }
          : undefined,
    });

    if (entries.length) {
      setVersions((current) => current.concat(entries));
      setViewingVersionId(entries[entries.length - 1].id);
    }

    setVersionSaveError(null);
    setSections(published);
    setStammdatenBaseline(structuredClone(published));
    setStammdatenPublished(structuredClone(published));
    setLeavePrompt(false);
    return true;
  }

  function hasStammdatenDrafts() {
    return Boolean(stammdatenBaseline && JSON.stringify(sections) !== JSON.stringify(stammdatenBaseline));
  }

  function hasUnpublishedStammdaten() {
    if (sections.some((section) => section.cards.some((card) => card.draft))) return true;
    const published = stammdatenPublished ?? publishedSnapshot(sections);
    return JSON.stringify(sectionData(sections)) !== JSON.stringify(sectionData(published));
  }

  function stammdatenDirtyAreas() {
    if (!stammdatenBaseline) return [];
    return STAMMDATEN_AREAS.filter((area) => {
      const ids = area.id === "externe" ? ["firmenbuch", "gisa"] : [sectionIdForArea(area.id)];
      return ids.some((sectionId) => {
        const now = sections.find((section) => section.id === sectionId);
        const was = stammdatenBaseline.find((section) => section.id === sectionId);
        return JSON.stringify(now) !== JSON.stringify(was);
      });
    }).map((area) => ({ id: area.id, label: areaTitle(area.id) }));
  }

  function closeStammdaten(revert: boolean) {
    if (revert && hasStammdatenDrafts()) {
      setLeaveDest(view === "stammdaten" ? "person" : "stay");
      setLeavePrompt(true);
      return;
    }
    if (revert && stammdatenBaseline) setSections(stammdatenBaseline);
    else {
      setSections((current) =>
        current.map((section) => ({
          ...section,
          cards: section.cards.filter((card) => !card.draft),
        })),
      );
    }
    setStammdatenBaseline(null);
    if (!hasUnpublishedStammdaten()) setStammdatenPublished(null);
    setLeavePrompt(false);
    if (view === "stammdaten") setView("person");
  }

  function finishLeave(keepDrafts: boolean) {
    if (!keepDrafts && stammdatenBaseline) {
      setSections(stammdatenBaseline);
      setStammdatenPublished(null);
    }
    setStammdatenBaseline(null);
    setLeavePrompt(false);
    if (leaveDest === "workflow") exitToWorkflow();
    else if (leaveDest === "person") setView("person");
  }

  function cancelLeavePrompt() {
    setLeavePrompt(false);
  }

  function saveDraftAndLeave() {
    saveStammdaten(false);
    finishLeave(true);
  }

  function discardAndLeave() {
    finishLeave(false);
  }

  function openDirtyArea(area: StammdatenAreaId) {
    setLeavePrompt(false);
    goStammdatenArea(area);
    setView("stammdaten");
  }

  const stammdatenDirty = view === "stammdaten" && hasStammdatenDrafts();
  const stammdatenCanPublish = view === "stammdaten" && hasUnpublishedStammdaten();

  /** Back to the Bestandsmanager's list. */
  function closeFreigabe() {
    setFreigabeId(null);
    setView("manager");
  }

  return {
    activeStep,
    done,
    goTo,
    goNext,
    goBack,
    markDone,
    model,
    chooseModel,
    modelLabel,
    billing,
    setBilling,
    payment,
    setPayment,
    delivery,
    setDelivery,
    amount,
    day,
    setDay,
    month,
    setMonth,
    year,
    setYear,
    dueDay,
    setDueDay,
    dueMonth,
    setDueMonth,
    openMenu,
    setOpenMenu,
    toggleMenu,
    partners,
    setPartners,
    partnerId,
    setPartnerId,
    selectedPartner,
    bankId,
    setBankId,
    selectedBank,
    paymentTerm,
    setPaymentTerm,
    invoiceNote,
    setInvoiceNote,
    customNote,
    setCustomNote,
    textBlock,
    setTextBlock,
    termsText,
    setTermsText,
    activeDoc,
    setActiveDoc,
    docsApproval,
    setDocsApproval,
    docSigner,
    setDocSigner,
    signMode,
    setSignMode,
    signFile,
    setSignFile,
    signature,
    setSignature,
    consent,
    setConsent,
    signDay,
    setSignDay,
    signMonth,
    setSignMonth,
    signYear,
    setSignYear,
    signApproval,
    setSignApproval,
    previewTab,
    setPreviewTab,
    hasSignature,
    pdfOpen,
    setPdfOpen,
    view,
    grantedBy,
    requestedAt,
    requestNote,
    decisionNote,
    decidedAt,
    comments,
    addComment,
    editComment,
    removeComment,
    openRequests,
    approvalOf,
    requestApproval,
    grantApproval,
    reviewStep,
    setReviewStep,
    decideRequest,
    leaveManager,
    freigabeId,
    openFreigabe,
    closeFreigabe,
    openPerson,
    filePartnerId,
    openPartner,
    ashleyConverted,
    convertAshley,
    personModule,
    openPersonModule,
    personArea,
    openPersonArea,
    maklerOpen,
    openMakler,
    closeMakler,
    stammdatenOpen: view === "stammdaten" || stammdatenBaseline !== null,
    resumeStammdaten,
    sections,
    displaySections,
    personName: shownName,
    versions,
    viewingVersion,
    viewingVersionId,
    isHistorical,
    versionHistoryOpen,
    openVersionHistory,
    closeVersionHistory,
    viewPersonVersion,
    openHistoryChange,
    viewCurrentVersion,
    versionSaveError,
    publishedNachname: liveVersion?.nachname ?? FILE_PARTNERS[filePartnerId].name.split(" ").at(-1) ?? "Atkinson",
    stammdatenArea,
    stammdatenCardId,
    openStammdaten,
    goStammdatenArea,
    selectStammdatenCard,
    patchStammdatenCard,
    addStammdatenCard,
    deleteStammdatenCard,
    saveStammdaten,
    closeStammdaten,
    stammdatenDirty,
    stammdatenCanPublish,
    leavePrompt,
    stammdatenDirtyAreas,
    cancelLeavePrompt,
    saveDraftAndLeave,
    discardAndLeave,
    openDirtyArea,
    workflowPane,
    setWorkflowPane,
  };
}

type Workflow = ReturnType<typeof useWorkflowState>;

const WorkflowContext = createContext<Workflow | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const value = useWorkflowState();
  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const value = useContext(WorkflowContext);
  if (!value) throw new Error("useWorkflow must be used inside WorkflowProvider");
  return value;
}
