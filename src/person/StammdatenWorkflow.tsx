import { useEffect, useMemo, useRef, useState } from "react";
import * as a from "../assets/index";
import { AppsNav, FileIdentity, FileTabs, LogoButton, ProfileMenu, MeinBereichTab } from "../chrome";
import { Icon, Notice, Snackbar } from "../ui";
import { useWorkflow } from "../workflow";
import { DataCard } from "./cards";
import { DeleteCard } from "./DeleteCard";
import { FILE_PARTNERS } from "./partners";
import { useFamilyLinks } from "./familyLinks";
import { useKonzernLinks } from "./konzernLinks";
import { SaveConfirm } from "./SaveConfirm";
import { bindVerknuepfungSave } from "./verknuepfungSave";
import { VerknuepfungPanel } from "./Verknuepfung";
import {
  AddressFields,
  AnhaengeFields,
  BankFields,
  CompanyFirmenbuchFields,
  CompanyGisaFields,
  CompanyOrganeFields,
  ContactFields,
  WicoDatenFields,
  GewerbeFields,
  PartnerFields,
  VereinFields,
  WirtschaftFields,
} from "./forms";
import {
  applyCompanyFiles,
  applyCompanyFirmenbuch,
  applyCompanyGisa,
  applyCompanyOrgane,
  EMPTY_COMPANY_GISA,
  EMPTY_COMPANY_ORGANE,
  INITIAL_COMPANY_FILES,
  INITIAL_COMPANY_FIRMENBUCH,
  INITIAL_COMPANY_GISA,
  INITIAL_COMPANY_ORGANE,
  INITIAL_WICO_ID,
  companyShellFirmenbuch,
  lookupWico,
  type CompanyFirmenbuchForm,
  type CompanyGisaForm,
  type CompanyOrganeForm,
  type WicoRecord,
} from "./companyWirtschaft";
import {
  BLANK_AREAS,
  EMPTY_ADDRESS,
  EMPTY_BANK,
  EMPTY_CONTACT,
  EMPTY_PARTNER,
  INITIAL_GEWERBE,
  INITIAL_PERSON_WICO_ID,
  INITIAL_VEREIN,
  INITIAL_WIRTSCHAFT,
  INITIAL_WIRTSCHAFT_FILES,
  lookupPersonWico,
  MULTI_CARD_AREAS,
  STAMMDATEN_AREAS,
  addressForm,
  applyAddress,
  applyBank,
  applyContact,
  applyGewerbe,
  applyPartner,
  applyVerein,
  applyWirtschaft,
  applyWirtschaftFiles,
  bankForm,
  contactForm,
  countedTitle,
  partnerForm,
  plusLabel,
  sectionIdForArea,
  type AddressForm,
  type BankForm,
  type Card,
  type ContactForm,
  type FileEntry,
  type GewerbeEntry,
  type PartnerForm,
  type PersonWicoRecord,
  type VereinEntry,
  type WirtschaftForm,
} from "./stammdaten";

function Identity() {
  return <FileIdentity className="sw-id" />;
}

function Stepper() {
  const { stammdatenArea, goStammdatenArea } = useWorkflow();

  return (
    <div className="stepper-wrap">
      <div className="stepper sw-stepper">
        {STAMMDATEN_AREAS.map((area) => (
          <button
            key={area.id}
            type="button"
            className={`step${stammdatenArea === area.id ? " active" : ""}`}
            onClick={() => goStammdatenArea(area.id)}
          >
            <span className={`step-num${stammdatenArea === area.id ? " active" : ""}`}>
              <img src={stammdatenArea === area.id ? a.stepActive : a.stepDone} alt="" />
              <span className="sw-step-icon">
                <Icon src={area.icon} size={16} />
              </span>
            </span>
            <span className="step-label">
              {area.label.split("\n").map((line) => (
                <span key={line} style={{ display: "block" }}>
                  {line}
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function StammdatenWorkflow() {
  const {
    displaySections,
    filePartnerId,
    stammdatenArea,
    stammdatenCardId,
    selectStammdatenCard,
    patchStammdatenCard,
    addStammdatenCard,
    deleteStammdatenCard,
    saveStammdaten,
    closeStammdaten,
    stammdatenDirty,
    stammdatenCanPublish,
    isHistorical,
    viewingVersion,
    viewingVersionId,
    openVersionHistory,
    publishedNachname,
    versionSaveError,
  } = useWorkflow();
  const family = useFamilyLinks();
  const konzern = useKonzernLinks();
  const isCompanyFile = FILE_PARTNERS[filePartnerId].fileKind === "company";

  useEffect(() => {
    return bindVerknuepfungSave({
      snapshot: () => {
        family.snapshot();
        konzern.snapshot();
      },
      commit: () => {
        family.commitSnapshot();
        konzern.commitSnapshot();
      },
      revert: () => {
        family.revert();
        konzern.revert();
      },
      publish: () => {
        family.publish(filePartnerId);
        konzern.publish(filePartnerId, isCompanyFile ? "company" : "person");
      },
      dirty: () => family.isDirty() || konzern.isDirty(),
      publishable: () =>
        family.hasPublishable(filePartnerId) ||
        konzern.hasPublishable(filePartnerId, isCompanyFile ? "company" : "person"),
    });
  }, [family, konzern, filePartnerId, isCompanyFile]);

  const section = displaySections.find((entry) => entry.id === sectionIdForArea(stammdatenArea));
  const cards = useMemo(
    () => (section?.cards ?? []).filter((card) => !card.empty),
    [section],
  );
  const selected = cards.find((card) => card.id === stammdatenCardId) ?? cards[0] ?? null;
  const blank = BLANK_AREAS.includes(stammdatenArea);
  const isCompany = FILE_PARTNERS[filePartnerId].fileKind === "company";
  const vkDirty = family.isDirty() || konzern.isDirty();
  const vkPublishable =
    family.hasPublishable(filePartnerId) ||
    konzern.hasPublishable(filePartnerId, isCompany ? "company" : "person");
  const canSaveDraft = stammdatenDirty || vkDirty;
  const canPublish = stammdatenCanPublish || vkPublishable;
  const canAdd = MULTI_CARD_AREAS.includes(stammdatenArea) && !(isCompany && stammdatenArea === "wirtschaftsdaten");

  const [partner, setPartner] = useState<PartnerForm>(EMPTY_PARTNER);
  const [contact, setContact] = useState<ContactForm>(EMPTY_CONTACT);
  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDRESS);
  const [bank, setBank] = useState<BankForm>(EMPTY_BANK);
  const [wirtschaft, setWirtschaft] = useState<WirtschaftForm>(INITIAL_WIRTSCHAFT);
  const [gewerbe, setGewerbe] = useState<GewerbeEntry[]>(INITIAL_GEWERBE);
  const [verein, setVerein] = useState<VereinEntry[]>(INITIAL_VEREIN);
  const [wirtschaftFiles, setWirtschaftFiles] = useState<FileEntry[]>(INITIAL_WIRTSCHAFT_FILES);
  const [companyFirmenbuch, setCompanyFirmenbuch] = useState<CompanyFirmenbuchForm>(INITIAL_COMPANY_FIRMENBUCH);
  const [companyOrgane, setCompanyOrgane] = useState<CompanyOrganeForm>(INITIAL_COMPANY_ORGANE);
  const [companyGisa, setCompanyGisa] = useState<CompanyGisaForm>(INITIAL_COMPANY_GISA);
  const [companyFiles, setCompanyFiles] = useState<FileEntry[]>(INITIAL_COMPANY_FILES);
  const defaultWicoId = isCompany ? INITIAL_WICO_ID : INITIAL_PERSON_WICO_ID;
  const [wicoDraft, setWicoDraft] = useState(defaultWicoId);
  const [wicoId, setWicoId] = useState(defaultWicoId);
  const [wicoSyncing, setWicoSyncing] = useState(false);
  const [wicoSnapshot, setWicoSnapshot] = useState<WicoRecord>(() => lookupWico(INITIAL_WICO_ID));
  const [personWico, setPersonWico] = useState<PersonWicoRecord>(() => lookupPersonWico(INITIAL_PERSON_WICO_ID));
  const [pendingDelete, setPendingDelete] = useState<Card | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [snack, setSnack] = useState<{ id: number; message: string; undo?: () => void } | null>(null);
  const wicoTimer = useRef(0);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  useEffect(() => {
    if (stammdatenArea !== "wirtschaftsdaten") return;
    if (isCompany) {
      const file = FILE_PARTNERS[filePartnerId];
      const filled = filePartnerId === "lunixo";
      setCompanyFirmenbuch(
        filled
          ? INITIAL_COMPANY_FIRMENBUCH
          : companyShellFirmenbuch(file.name, file.address?.[1] ?? "", file.fn ?? ""),
      );
      setCompanyOrgane(filled ? INITIAL_COMPANY_ORGANE : EMPTY_COMPANY_ORGANE);
      setCompanyGisa(filled ? INITIAL_COMPANY_GISA : EMPTY_COMPANY_GISA);
      setCompanyFiles(filled ? INITIAL_COMPANY_FILES : []);
      setWicoDraft(filled ? INITIAL_WICO_ID : "");
      setWicoId(filled ? INITIAL_WICO_ID : "");
      setWicoSyncing(false);
      setWicoSnapshot(filled ? lookupWico(INITIAL_WICO_ID) : lookupWico(""));
      return;
    }
    setWirtschaft(INITIAL_WIRTSCHAFT);
    setGewerbe(INITIAL_GEWERBE);
    setVerein(INITIAL_VEREIN);
    setWirtschaftFiles(INITIAL_WIRTSCHAFT_FILES);
    setWicoDraft(INITIAL_PERSON_WICO_ID);
    setWicoId(INITIAL_PERSON_WICO_ID);
    setWicoSyncing(false);
    setPersonWico(lookupPersonWico(INITIAL_PERSON_WICO_ID));
  }, [stammdatenArea, isCompany, filePartnerId]);

  useEffect(() => {
    if (!selected) return;
    if (stammdatenArea === "personendaten") setPartner(partnerForm(selected));
    if (stammdatenArea === "kontakte") {
      const next = contactForm(selected);
      setContact({
        ...next,
        phones: next.phones.length ? next.phones : EMPTY_CONTACT.phones,
        mails: next.mails.length ? next.mails : EMPTY_CONTACT.mails,
        websites: next.websites.length ? next.websites : EMPTY_CONTACT.websites,
      });
    }
    if (stammdatenArea === "adressen") setAddress(addressForm(selected));
    if (stammdatenArea === "bankverbindungen") setBank(bankForm(selected));
  }, [stammdatenArea, stammdatenCardId, selected, viewingVersionId, isHistorical]);

  function updatePartner(form: PartnerForm) {
    if (isHistorical) return;
    setPartner(form);
    if (selected) patchStammdatenCard(stammdatenArea, applyPartner(selected, form, true));
  }

  function updateContact(form: ContactForm) {
    if (isHistorical) return;
    setContact(form);
    if (selected) {
      patchStammdatenCard(stammdatenArea, applyContact(selected, form, true));
      return;
    }
    addStammdatenCard(applyContact({ id: `kontakte-${Date.now()}` }, form, true));
  }

  function updateAddress(form: AddressForm) {
    if (isHistorical) return;
    setAddress(form);
    if (selected) {
      patchStammdatenCard(stammdatenArea, applyAddress(selected, form, true));
      return;
    }
    addStammdatenCard(applyAddress({ id: `adressen-${Date.now()}`, icon: a.flag }, form, true));
  }

  function updateBank(form: BankForm) {
    if (isHistorical) return;
    setBank(form);
    if (selected) {
      patchStammdatenCard(stammdatenArea, applyBank(selected, form, true));
      return;
    }
    addStammdatenCard(applyBank({ id: `bankverbindungen-${Date.now()}` }, form, true));
  }

  function updateWirtschaft(form: WirtschaftForm) {
    if (isHistorical) return;
    setWirtschaft(form);
    const firmenbuch = cards.find((card) => card.id === "wirtschaft-firmenbuch");
    if (firmenbuch) patchStammdatenCard(stammdatenArea, applyWirtschaft(firmenbuch, form, true));
  }

  function updateGewerbe(entries: GewerbeEntry[]) {
    if (isHistorical) return;
    setGewerbe(entries);
    const card = cards.find((entry) => entry.id === "wirtschaft-gewerbe");
    if (card) patchStammdatenCard(stammdatenArea, applyGewerbe(card, entries, true));
  }

  function updateVerein(entries: VereinEntry[]) {
    if (isHistorical) return;
    setVerein(entries);
    const card = cards.find((entry) => entry.id === "wirtschaft-verein");
    if (card) patchStammdatenCard(stammdatenArea, applyVerein(card, entries, true));
  }

  function updateWirtschaftFiles(files: FileEntry[]) {
    if (isHistorical) return;
    setWirtschaftFiles(files);
    const card = cards.find((entry) => entry.id === "wirtschaft-anhaenge");
    if (card) patchStammdatenCard(stammdatenArea, applyWirtschaftFiles(card, files, true));
  }

  function updateCompanyFirmenbuch(form: CompanyFirmenbuchForm) {
    if (isHistorical) return;
    setCompanyFirmenbuch(form);
    const card = cards.find((entry) => entry.id === "wirtschaft-firmenbuch");
    if (card) patchStammdatenCard(stammdatenArea, applyCompanyFirmenbuch(card, form, true));
  }

  function updateCompanyOrgane(form: CompanyOrganeForm) {
    if (isHistorical) return;
    setCompanyOrgane(form);
    const card = cards.find((entry) => entry.id === "wirtschaft-organe");
    if (card) patchStammdatenCard(stammdatenArea, applyCompanyOrgane(card, form, true));
  }

  function updateCompanyGisa(form: CompanyGisaForm) {
    if (isHistorical) return;
    setCompanyGisa(form);
    const card = cards.find((entry) => entry.id === "wirtschaft-gisa");
    if (card) patchStammdatenCard(stammdatenArea, applyCompanyGisa(card, form, true));
  }

  function updateCompanyFiles(files: FileEntry[]) {
    if (isHistorical) return;
    setCompanyFiles(files);
    const card = cards.find((entry) => entry.id === "wirtschaft-anhaenge");
    if (card) patchStammdatenCard(stammdatenArea, applyCompanyFiles(card, files, true));
  }

  function applyWicoRecord(record: WicoRecord) {
    setWicoId(record.id);
    setWicoDraft(record.id);
    setWicoSnapshot(record);
    setCompanyFirmenbuch(record.firmenbuch);
    setCompanyOrgane(record.organe);
    setCompanyGisa(record.gisa);
    const current = cardsRef.current;
    const firmenbuch = current.find((entry) => entry.id === "wirtschaft-firmenbuch");
    const organe = current.find((entry) => entry.id === "wirtschaft-organe");
    const gisa = current.find((entry) => entry.id === "wirtschaft-gisa");
    if (firmenbuch) patchStammdatenCard(stammdatenArea, applyCompanyFirmenbuch(firmenbuch, record.firmenbuch, true));
    if (organe) patchStammdatenCard(stammdatenArea, applyCompanyOrgane(organe, record.organe, true));
    if (gisa) patchStammdatenCard(stammdatenArea, applyCompanyGisa(gisa, record.gisa, true));
  }

  function applyPersonWico(record: PersonWicoRecord) {
    setWicoId(record.id);
    setWicoDraft(record.id);
    setPersonWico(record);
    setWirtschaft(record.wirtschaft);
    setGewerbe(record.gewerbe);
    setVerein(record.verein);
    const current = cardsRef.current;
    const firmenbuch = current.find((entry) => entry.id === "wirtschaft-firmenbuch");
    const gewerbeCard = current.find((entry) => entry.id === "wirtschaft-gewerbe");
    const vereinCard = current.find((entry) => entry.id === "wirtschaft-verein");
    if (firmenbuch) patchStammdatenCard(stammdatenArea, applyWirtschaft(firmenbuch, record.wirtschaft, true));
    if (gewerbeCard) patchStammdatenCard(stammdatenArea, applyGewerbe(gewerbeCard, record.gewerbe, true));
    if (vereinCard) patchStammdatenCard(stammdatenArea, applyVerein(vereinCard, record.verein, true));
  }

  function runWicoSync(id: string) {
    if (isCompany) {
      const record = lookupWico(id);
      applyWicoRecord(record);
      setWicoSyncing(false);
      setSnack({ id: Date.now(), message: `WICO-Daten für ${record.name} übernommen.` });
      return;
    }
    const record = lookupPersonWico(id);
    applyPersonWico(record);
    setWicoSyncing(false);
    setSnack({ id: Date.now(), message: `WICO-Daten für ${record.name} übernommen.` });
  }

  function scheduleWicoSync(id: string) {
    if (isHistorical) return;
    const next = id.trim();
    window.clearTimeout(wicoTimer.current);
    if (!next || next === wicoId) {
      setWicoSyncing(false);
      return;
    }
    setWicoSyncing(true);
    wicoTimer.current = window.setTimeout(() => runWicoSync(next), 700);
  }

  function flushWicoSync() {
    if (isHistorical) return;
    const next = wicoDraft.trim();
    window.clearTimeout(wicoTimer.current);
    if (!next || next === wicoId) {
      setWicoSyncing(false);
      return;
    }
    setWicoSyncing(true);
    runWicoSync(next);
  }

  useEffect(() => () => window.clearTimeout(wicoTimer.current), []);

  function notifyRemoved(message: string, undo: () => void) {
    setSnack({ id: Date.now(), message, undo });
  }

  const previewTitle =
    stammdatenArea === "personendaten"
      ? "Allgemeine Partnerdaten"
      : STAMMDATEN_AREAS.find((area) => area.id === stammdatenArea)?.label.replace("\n", " ") ?? "";

  const formTitle =
    selected?.id === "wirtschaft-firmenbuch"
      ? isCompany
        ? "Stammdaten laut Firmenbuch"
        : "Firmenbuch"
      : selected?.id === "wirtschaft-organe"
        ? "Organe & Beteiligungen"
        : selected?.id === "wirtschaft-gisa"
          ? "Stammdaten laut GISA"
          : selected?.id === "wirtschaft-gewerbe"
            ? "Gewerberegister (GISA)"
            : selected?.id === "wirtschaft-verein"
              ? "Vereinsregister"
              : selected?.id === "wirtschaft-anhaenge"
                ? "Anhänge"
                : previewTitle;

  const showWico = stammdatenArea === "wirtschaftsdaten" && selected?.id !== "wirtschaft-anhaenge";

  return (
    <div className={isHistorical ? "app person stammdaten-wf historical" : "app person stammdaten-wf"}>
      <div className="shell">
        <header className="main-nav">
          <div className="main-nav-left">
            <LogoButton />
            <FileTabs />
            <MeinBereichTab />
          </div>
          <div className="main-nav-right">
            <button type="button" className="search-btn" aria-label="Suche">
              <Icon src={a.search} size={42} />
            </button>
            <ProfileMenu />
          </div>
        </header>

        <AppsNav />

        <div className="content-shell">
          <Stepper />

          <div className="sw-body">
            <div className="sw-strip">
              <Identity />
            <button
              type="button"
              className={isHistorical ? "sw-version old" : "sw-version"}
              onClick={openVersionHistory}
            >
              <Icon src={a.history} size={16} />
              Version {viewingVersion?.number ?? 1}
              {isHistorical ? " · veraltet" : " · aktuell"}
            </button>
            </div>

            <main className="sw-main">
            {stammdatenArea === "verknuepfung" ? (
              <VerknuepfungPanel key={filePartnerId} memberId={filePartnerId} initialId={stammdatenCardId} />
            ) : blank ? (
              <p className="sw-blank">Dieser Bereich folgt.</p>
            ) : (
              <>
                <div className="sw-forms">
                {showWico ? (
                  <form
                    className="sw-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      flushWicoSync();
                    }}
                  >
                    <fieldset className="sw-fieldset" disabled={isHistorical}>
                      <WicoDatenFields
                        value={wicoDraft}
                        syncing={wicoSyncing}
                        onChange={(value) => {
                          setWicoDraft(value);
                          scheduleWicoSync(value);
                        }}
                        onSync={flushWicoSync}
                      />
                    </fieldset>
                  </form>
                ) : null}
                <form className={wicoSyncing ? "sw-form syncing" : "sw-form"} onSubmit={(event) => event.preventDefault()}>
                  <h1>{formTitle}</h1>
                  {stammdatenArea === "personendaten" && (
                    <>
                      {isHistorical ? (
                        <Notice tone="pending" title="Nur Ansicht">
                          Das ist Version {viewingVersion?.number} · veraltet ({viewingVersion?.date}). Änderungen
                          machst du in der aktuellen Version.
                        </Notice>
                      ) : null}
                      {versionSaveError ? (
                        <Notice tone="error" title="Speichern nicht möglich">
                          {versionSaveError}
                        </Notice>
                      ) : null}
                      <fieldset className="sw-fieldset" disabled={isHistorical}>
                        <PartnerFields
                          form={partner}
                          onChange={updatePartner}
                          publishedNachname={isHistorical ? undefined : publishedNachname}
                        />
                      </fieldset>
                    </>
                  )}
                  {stammdatenArea === "wirtschaftsdaten" && isCompany && selected?.id === "wirtschaft-firmenbuch" && (
                    <CompanyFirmenbuchFields
                      form={companyFirmenbuch}
                      wico={wicoSnapshot.firmenbuch}
                      onChange={updateCompanyFirmenbuch}
                    />
                  )}
                  {stammdatenArea === "wirtschaftsdaten" && isCompany && selected?.id === "wirtschaft-organe" && (
                    <CompanyOrganeFields
                      form={companyOrgane}
                      wico={wicoSnapshot.organe}
                      onChange={updateCompanyOrgane}
                      onRemoved={notifyRemoved}
                    />
                  )}
                  {stammdatenArea === "wirtschaftsdaten" && isCompany && selected?.id === "wirtschaft-gisa" && (
                    <CompanyGisaFields
                      form={companyGisa}
                      wico={wicoSnapshot.gisa}
                      onChange={updateCompanyGisa}
                      onRemoved={notifyRemoved}
                    />
                  )}
                  {stammdatenArea === "wirtschaftsdaten" && isCompany && selected?.id === "wirtschaft-anhaenge" && (
                    <AnhaengeFields files={companyFiles} onChange={updateCompanyFiles} onRemoved={notifyRemoved} />
                  )}
                  {stammdatenArea === "wirtschaftsdaten" && !isCompany && selected?.id === "wirtschaft-gewerbe" && (
                    <GewerbeFields
                      entries={gewerbe}
                      wico={personWico.gewerbe}
                      onChange={updateGewerbe}
                      onRemoved={notifyRemoved}
                    />
                  )}
                  {stammdatenArea === "wirtschaftsdaten" && !isCompany && selected?.id === "wirtschaft-verein" && (
                    <VereinFields
                      entries={verein}
                      wico={personWico.verein}
                      onChange={updateVerein}
                      onRemoved={notifyRemoved}
                    />
                  )}
                  {stammdatenArea === "wirtschaftsdaten" && !isCompany && selected?.id === "wirtschaft-anhaenge" && (
                    <AnhaengeFields files={wirtschaftFiles} onChange={updateWirtschaftFiles} onRemoved={notifyRemoved} />
                  )}
                  {stammdatenArea === "wirtschaftsdaten" &&
                    !isCompany &&
                    selected?.id !== "wirtschaft-gewerbe" &&
                    selected?.id !== "wirtschaft-verein" &&
                    selected?.id !== "wirtschaft-anhaenge" && (
                      <WirtschaftFields
                        form={wirtschaft}
                        wico={personWico.wirtschaft}
                        onChange={updateWirtschaft}
                      />
                    )}
                  {stammdatenArea === "kontakte" && (
                    <ContactFields form={contact} onChange={updateContact} onRemoved={notifyRemoved} />
                  )}
                  {stammdatenArea === "adressen" && (
                    <AddressFields form={address} onChange={updateAddress} />
                  )}
                  {stammdatenArea === "bankverbindungen" && (
                    <BankFields form={bank} onChange={updateBank} />
                  )}
                </form>
                </div>

                <aside className="sw-preview">
                  <header className="sw-preview-head">
                    <span>
                      <Icon src={section?.icon ?? a.stammdaten} size={22} />
                      {section ? countedTitle(section) : previewTitle}
                      <Icon src={a.infoFull} size={18} />
                    </span>
                    {canAdd ? (
                      <button type="button" className="btn-primary sw-plus" onClick={() => addStammdatenCard()}>
                        {plusLabel(stammdatenArea)}
                      </button>
                    ) : null}
                  </header>
                  <p className={selected?.draft || canSaveDraft || canPublish ? "sw-now unsaved" : "sw-now"}>
                    {canSaveDraft
                      ? "Ungespeicherte Änderungen"
                      : canPublish || selected?.draft
                        ? "Entwurf"
                        : "Aktuell in Wino"}
                  </p>
                  <div className="sw-cards">
                    {cards.map((card) => (
                      <DataCard
                        key={card.id}
                        card={card}
                        full
                        selected={card.id === selected?.id}
                        onSelect={() => selectStammdatenCard(card.id)}
                        onEdit={() => selectStammdatenCard(card.id)}
                        onDelete={() => setPendingDelete(card)}
                      />
                    ))}
                  </div>
                </aside>
              </>
            )}
          </main>
          </div>

          <footer className="footer">
            <button type="button" className="btn-secondary" onClick={() => closeStammdaten(true)}>
              Abbrechen
            </button>
            <div className="footer-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={isHistorical || !canSaveDraft}
                onClick={() => saveStammdaten(false)}
              >
                Entwurf speichern
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={isHistorical || !canPublish}
                onClick={() => setConfirmSave(true)}
              >
                Speichern
              </button>
            </div>
          </footer>
        </div>
      </div>

      {snack ? (
        <Snackbar
          key={snack.id}
          message={snack.message}
          onUndo={
            snack.undo
              ? () => {
                  snack.undo?.();
                  setSnack(null);
                }
              : undefined
          }
          onClose={() => setSnack(null)}
        />
      ) : null}

      {confirmSave ? (
        <SaveConfirm
          onCancel={() => setConfirmSave(false)}
          onConfirm={() => {
            setConfirmSave(false);
            if (saveStammdaten(true)) {
              setSnack({ id: Date.now(), message: "Änderungen gespeichert." });
            }
          }}
        />
      ) : null}

      {pendingDelete ? (
        <DeleteCard
          title={pendingDelete.title || "Eintrag"}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteStammdatenCard(stammdatenArea, pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      ) : null}
    </div>
  );
}
