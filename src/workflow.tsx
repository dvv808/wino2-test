import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { hashToRoute, routeToHash } from "./routing";

export type Model = "privat" | "partner" | "custom";
export type OpenMenu = "partner" | "bank" | "textblock" | "docSigner" | "signer" | null;
export type StepId = "tasks" | "comms" | "fee" | "terms" | "scope" | "docs" | "sign";
export type Approval = "idle" | "requested" | "granted" | "rejected";
export type SignMode = "upload" | "digital";
/**
 * The workflow and the Bestandsmanager are two separate workspaces. From the
 * Bestandsmanager's list, a single request opens as its own page: "freigabe".
 */
export type View = "workflow" | "manager" | "freigabe";
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

  /** The first write replaces the entry so the back button does not land on a bare URL. */
  const hashWritten = useRef(false);
  useEffect(() => {
    const next = routeToHash({ view, activeStep, freigabeId: freigabeId ?? undefined });
    if (window.location.hash === next) {
      hashWritten.current = true;
      return;
    }
    if (hashWritten.current) window.location.hash = next;
    else window.history.replaceState(null, "", next);
    hashWritten.current = true;
  }, [view, activeStep, freigabeId]);

  useEffect(() => {
    function applyHash() {
      const route = hashToRoute(window.location.hash);
      setView(route.view);
      if (route.activeStep) setActiveStep(route.activeStep);
      setFreigabeId(route.freigabeId ?? null);
    }
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

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
  function leaveManager(step?: ApprovalStep) {
    const target = step ?? returnStep;
    if (target) setActiveStep(target);
    setReturnStep(null);
    setReviewStep(null);
    setFreigabeId(null);
    setView("workflow");
  }

  /** Open one request from the Bestandsmanager's list as its own page. */
  function openFreigabe(id: string) {
    setFreigabeId(id);
    setView("freigabe");
  }

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
