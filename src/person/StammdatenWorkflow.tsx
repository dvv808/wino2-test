import { useEffect, useMemo, useState } from "react";
import * as a from "../assets/index";
import { AppsNav, FileIdentity, LogoButton } from "../chrome";
import { Icon, Notice, Snackbar } from "../ui";
import { useWorkflow } from "../workflow";
import { DataCard } from "./cards";
import { DeleteCard } from "./DeleteCard";
import { SaveConfirm } from "./SaveConfirm";
import {
  AddressFields,
  AnhaengeFields,
  BankFields,
  ContactFields,
  GewerbeFields,
  PartnerFields,
  VereinFields,
  WirtschaftFields,
} from "./forms";
import {
  BLANK_AREAS,
  EMPTY_ADDRESS,
  EMPTY_BANK,
  EMPTY_CONTACT,
  EMPTY_PARTNER,
  INITIAL_GEWERBE,
  INITIAL_VEREIN,
  INITIAL_WIRTSCHAFT,
  INITIAL_WIRTSCHAFT_FILES,
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
    personName,
    stammdatenArea,
    stammdatenCardId,
    selectStammdatenCard,
    patchStammdatenCard,
    addStammdatenCard,
    deleteStammdatenCard,
    saveStammdaten,
    closeStammdaten,
    leaveManager,
    openPerson,
    stammdatenDirty,
    stammdatenCanPublish,
    isHistorical,
    viewingVersion,
    viewingVersionId,
    openVersionHistory,
    publishedNachname,
    versionSaveError,
  } = useWorkflow();

  const section = displaySections.find((entry) => entry.id === sectionIdForArea(stammdatenArea));
  const cards = useMemo(
    () => (section?.cards ?? []).filter((card) => !card.empty),
    [section],
  );
  const selected = cards.find((card) => card.id === stammdatenCardId) ?? cards[0] ?? null;
  const blank = BLANK_AREAS.includes(stammdatenArea);
  const canAdd = MULTI_CARD_AREAS.includes(stammdatenArea);

  const [partner, setPartner] = useState<PartnerForm>(EMPTY_PARTNER);
  const [contact, setContact] = useState<ContactForm>(EMPTY_CONTACT);
  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDRESS);
  const [bank, setBank] = useState<BankForm>(EMPTY_BANK);
  const [wirtschaft, setWirtschaft] = useState<WirtschaftForm>(INITIAL_WIRTSCHAFT);
  const [gewerbe, setGewerbe] = useState<GewerbeEntry[]>(INITIAL_GEWERBE);
  const [verein, setVerein] = useState<VereinEntry[]>(INITIAL_VEREIN);
  const [wirtschaftFiles, setWirtschaftFiles] = useState<FileEntry[]>(INITIAL_WIRTSCHAFT_FILES);
  const [pendingDelete, setPendingDelete] = useState<Card | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [snack, setSnack] = useState<{ id: number; message: string; undo?: () => void } | null>(null);

  useEffect(() => {
    if (stammdatenArea === "wirtschaftsdaten") {
      setWirtschaft(INITIAL_WIRTSCHAFT);
      setGewerbe(INITIAL_GEWERBE);
      setVerein(INITIAL_VEREIN);
      setWirtschaftFiles(INITIAL_WIRTSCHAFT_FILES);
    }
  }, [stammdatenArea]);

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

  function notifyRemoved(message: string, undo: () => void) {
    setSnack({ id: Date.now(), message, undo });
  }

  const previewTitle =
    stammdatenArea === "personendaten"
      ? "Allgemeine Partnerdaten"
      : STAMMDATEN_AREAS.find((area) => area.id === stammdatenArea)?.label.replace("\n", " ") ?? "";

  const formTitle =
    selected?.id === "wirtschaft-firmenbuch"
      ? "Firmenbuch"
      : selected?.id === "wirtschaft-gewerbe"
        ? "Gewerberegister (GISA)"
        : selected?.id === "wirtschaft-verein"
          ? "Vereinsregister"
          : selected?.id === "wirtschaft-anhaenge"
            ? "Anhänge"
            : previewTitle;

  return (
    <div className={isHistorical ? "app person stammdaten-wf historical" : "app person stammdaten-wf"}>
      <div className="shell">
        <header className="main-nav">
          <div className="main-nav-left">
            <LogoButton />
            <div className="person-tab">
              <img className="tab-ear left" src={a.tabLeft} alt="" width={10} height={11} />
              <button type="button" className="person-tab-body" onClick={openPerson}>
                <Icon src={a.person} size={24} />
                {personName}
                <span
                  className="close-icon"
                  role="button"
                  aria-label={`${personName} schließen`}
                  onClick={(event) => {
                    event.stopPropagation();
                    leaveManager();
                  }}
                >
                  <img src={a.iconClose} alt="" width={18} height={18} />
                </span>
              </button>
              <img className="tab-ear flip" src={a.tabRight} alt="" width={10} height={11} />
            </div>
          </div>
          <div className="main-nav-right">
            <button type="button" className="search-btn" aria-label="Suche">
              <Icon src={a.search} size={42} />
            </button>
            <div className="avatar-wrap">
              <img className="photo" src={a.avatar} alt="Profil" />
              <img className="ring" src={a.avatarRing} alt="" />
              <img className="dot" src={a.statusDot} alt="" />
            </div>
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
            {blank ? (
              <p className="sw-blank">Dieser Bereich folgt.</p>
            ) : (
              <>
                <form className="sw-form" onSubmit={(event) => event.preventDefault()}>
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
                  {stammdatenArea === "wirtschaftsdaten" && selected?.id === "wirtschaft-gewerbe" && (
                    <GewerbeFields entries={gewerbe} onChange={updateGewerbe} onRemoved={notifyRemoved} />
                  )}
                  {stammdatenArea === "wirtschaftsdaten" && selected?.id === "wirtschaft-verein" && (
                    <VereinFields entries={verein} onChange={updateVerein} onRemoved={notifyRemoved} />
                  )}
                  {stammdatenArea === "wirtschaftsdaten" && selected?.id === "wirtschaft-anhaenge" && (
                    <AnhaengeFields files={wirtschaftFiles} onChange={updateWirtschaftFiles} onRemoved={notifyRemoved} />
                  )}
                  {stammdatenArea === "wirtschaftsdaten" &&
                    selected?.id !== "wirtschaft-gewerbe" &&
                    selected?.id !== "wirtschaft-verein" &&
                    selected?.id !== "wirtschaft-anhaenge" && (
                      <WirtschaftFields form={wirtschaft} onChange={updateWirtschaft} />
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
                  <p className={selected?.draft || stammdatenDirty || stammdatenCanPublish ? "sw-now unsaved" : "sw-now"}>
                    {stammdatenDirty
                      ? "Ungespeicherte Änderungen"
                      : stammdatenCanPublish || selected?.draft
                        ? "Entwurf"
                        : "Aktuell in Wino"}
                  </p>
                  <div className="sw-cards">
                    {cards.map((card) => (
                      <DataCard
                        key={card.id}
                        card={card}
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
                disabled={isHistorical || !stammdatenDirty}
                onClick={() => saveStammdaten(false)}
              >
                Entwurf speichern
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={isHistorical || !stammdatenCanPublish}
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
