import { useState } from "react";
import * as a from "../assets/index";
import { ConstructionArt } from "../mein-bereich/MeinBereichView";
import { ContextMenu, Icon } from "../ui";
import { FilePreview } from "./cards";
import { useWorkflow } from "../workflow";
import { ShelfBody } from "./ProfileShelf";
import { getPartner } from "./partners";
import { REISEPASS_MAIL, partnerMail } from "./versions";

/**
 * Partner → Kommunikation (Figma 6210:147241): the partner's E-Mails without the mailbox side nav of the Figma
 * (Eingang, Archiv, Gesendete …). Here the usual side nav has two areas: E-Mail and Telefonie (still to come).
 */

type Channel = "email" | "telefonie";
type Sender = { name: string; mail: string; photo?: string };
type Attachment = { name: string; type: "pdf" | "jpg"; docTyp?: string };
type Message = { id: string; from: Sender; to: Sender[]; cc?: Sender[]; day: string; time: string; long: string; body: string[]; attachment?: Attachment };
type Thread = { id: string; subject: string; tags: string[]; unread: boolean; event?: boolean; messages: Message[] };

const LUCY: Sender = { name: "Lucy Dullon", mail: "lucy.dullon@winter.at", photo: a.empLucy };
const CHRISTINE: Sender = { name: "Christine Auer", mail: "christine.auer@winter.at", photo: a.empChristine };
const ANNA: Sender = { name: "Anna Adams", mail: "anna.adams@winter.at", photo: a.reqAnna };

const DISCLAIMER =
  "Disclaimer: Diese E-Mail und jegliche Anhänge sind vertraulich und ausschließlich für den/die genannten Adressaten bestimmt. Sollten Sie nicht der vorgesehene Empfänger sein, ist jegliche Offenlegung, Vervielfältigung, Weiterleitung oder Nutzung des Inhalts dieser E-Mail unzulässig. Bitte informieren Sie den Absender umgehend und löschen Sie diese E-Mail. Wir weisen darauf hin, dass die Sicherheit von Übertragungen per E-Mail nicht gewährleistet werden kann und bitten um Ihr Verständnis.";

export { partnerMail };

/**
 * The Reisepass mail: Ash Atkinson's only mail, and the first mail of every partner created in Partner anlegen
 * (once a mail address is entered): the partner sends the Reisepass to the Kundenberaterin.
 */
function reisepassThreads(partner: Sender, time = "10:15"): Thread[] {
  const first = partner.name.split(" ")[0];
  return [
    {
      id: "t1",
      subject: REISEPASS_MAIL.subject,
      tags: ["#Reisepass", "#Dokumente"],
      unread: true,
      messages: [
        {
          id: "m1",
          from: partner,
          to: [LUCY],
          day: "heute",
          time,
          long: `Heute, ${time}`,
          attachment: { name: REISEPASS_MAIL.file(partner.name), type: "jpg", docTyp: "Reisepass" },
          body: ["Hallo Lucy,", "wie besprochen schicke ich dir meinen Reisepass im Anhang.", `Danke und liebe Grüße, ${first}`],
        },
      ],
    },
  ];
}

/** Downloads the attachment: the scan page as a real file of its type (JPG via a canvas, else the page as is). */
async function downloadAttachment(file: Attachment) {
  let href: string = a.docPage1;
  if (file.type === "jpg") {
    const img = new Image();
    img.src = a.docPage1;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    href = canvas.toDataURL("image/jpeg", 0.9);
  }
  const link = document.createElement("a");
  link.href = href;
  link.download = file.type === "jpg" ? file.name : file.name.replace(/\.pdf$/i, ".png");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function threadsFor(partner: Sender, partnerId: string, mailTime?: string): Thread[] {
  if (partnerId === "ash") return reisepassThreads(partner);
  if (mailTime) return reisepassThreads(partner, mailTime);
  const first = partner.name.split(" ")[0];
  const sign = (who: Sender) => ["Liebe Grüße,", who.name, "Makler Winter"];
  return [
    {
      id: "t1",
      subject: "Unterlagen zur Haushaltsversicherung",
      tags: ["#Haushalt", "@Makler_Winter"],
      unread: true,
      messages: [
        { id: "m1c", from: LUCY, to: [partner], day: "heute", time: "09:46", long: "Heute, 09:46", attachment: { name: "Haushaltsversicherung_Angebot.pdf", type: "pdf" }, body: [`Hallo ${first},`, "wie besprochen findest du im Anhang das Angebot zur Haushaltsversicherung. Bitte sieh es dir in Ruhe an und gib mir Bescheid, ob alles passt.", ...sign(LUCY)] },
        { id: "m1b", from: partner, to: [LUCY], day: "Mo", time: "16:20", long: "Montag, 16:20", body: ["Hallo Lucy,", "danke für das Gespräch. Kannst du mir das Angebot noch per Mail schicken?", `Liebe Grüße, ${first}`] },
        { id: "m1a", from: LUCY, to: [partner], day: "Mo", time: "10:05", long: "Montag, 10:05", body: [`Hallo ${first},`, "ich habe mir deine Wohnsituation angesehen. Für die neue Wohnung empfehle ich eine Haushaltsversicherung. Melde dich gerne für einen Termin.", ...sign(LUCY)] },
      ],
    },
    {
      id: "t2",
      subject: "Frage zu meiner Bankverbindung",
      tags: ["#Bankverbindung"],
      unread: false,
      messages: [
        { id: "m2", from: partner, to: [LUCY], cc: [CHRISTINE], day: "Mi", time: "12:12", long: "Mittwoch, 12:12", body: ["Hallo Lucy,", "ich habe ein neues Konto bei der Sparkasse Mondsee. Muss ich die neue IBAN irgendwo eintragen oder machst du das für mich?", `Danke und liebe Grüße, ${first}`] },
      ],
    },
    {
      id: "t3",
      subject: "Terminbestätigung Beratungsgespräch",
      tags: ["#Termin"],
      unread: true,
      messages: [
        { id: "m3b", from: partner, to: [CHRISTINE], day: "Di", time: "15:51", long: "Dienstag, 15:51", body: ["Hallo Frau Auer,", "der Termin passt mir gut, ich komme ins Büro.", `Liebe Grüße, ${first}`] },
        { id: "m3a", from: CHRISTINE, to: [partner], day: "Mi", time: "09:33", long: "Mittwoch, 09:33", body: [`Hallo ${first},`, "hiermit bestätige ich unser Beratungsgespräch am Freitag um 10:00 Uhr im Büro Mondsee.", ...sign(CHRISTINE)] },
      ],
    },
    {
      id: "t4",
      subject: "Einladung zum Kundenevent",
      tags: ["#Event", "@Makler_Winter"],
      unread: false,
      event: true,
      messages: [
        { id: "m4", from: ANNA, to: [partner], day: "Di", time: "17:33", long: "Dienstag, 17:33", body: [`Hallo ${first},`, "wir freuen uns, dich zu unserem Kundenevent am 05.12. in Mondsee einzuladen. Bitte gib uns bis Ende November Bescheid, ob du dabei bist.", ...sign(ANNA)] },
      ],
    },
    {
      id: "t5",
      subject: "Monatliches Update",
      tags: ["#Newsletter"],
      unread: false,
      messages: [
        { id: "m5", from: LUCY, to: [partner], day: "Di", time: "11:54", long: "Dienstag, 11:54", attachment: { name: "Update_November.pdf", type: "pdf" }, body: [`Hallo ${first},`, "hier findest du die neuesten Updates und Informationen aus unserem Unternehmen.", ...sign(LUCY)] },
      ],
    },
  ];
}

function Avatar({ who, size = 40 }: { who: Sender; size?: number }) {
  return (
    who.photo ? (
      <span className="km-avatar" style={{ width: size, height: size }}>
        <img src={who.photo} alt="" />
        <i className="km-online" />
      </span>
    ) : (
      // The partner: the light grey partner icon (as in the Bestand Kunden list).
      <span className="kd-avatar">
        <img src={a.avatarBg} alt="" />
        <img className="glyph" src={a.clientBlank} alt="" />
      </span>
    )
  );
}

const DISPLAY_MAIL = (who: Sender) => who.mail;

export function KommunikationPage() {
  const { personName } = useWorkflow();
  const [channel, setChannel] = useState<Channel>("email");

  return (
    <ShelfBody>
      <aside className="pp-side">
        <header className="pp-side-head">
          <span className="pp-side-glyph">
            <Icon src={a.moduleCommunication} size={24} />
          </span>
          <span className="pp-side-title">
            <strong>Kommunikation</strong>
            <small>{personName}</small>
          </span>
        </header>
        <div className="pp-side-search">
          <Icon src={a.searchDark} size={18} />
          Suchen...
        </div>
        <button type="button" className={channel === "email" ? "pp-area open" : "pp-area"} onClick={() => setChannel("email")}>
          <span className="pp-area-label">
            <Icon src={a.mail} size={18} />
            E-Mail
          </span>
        </button>
        <button type="button" className={channel === "telefonie" ? "pp-area open" : "pp-area"} onClick={() => setChannel("telefonie")}>
          <span className="pp-area-label">
            <Icon src={a.phone} size={18} />
            Telefonie
          </span>
        </button>
      </aside>
      <main className="pp-main km-main">
        {channel === "email" ? (
          <EmailView />
        ) : (
          <section className="mb-empty km-tba">
            <ConstructionArt />
            <h1>Seite noch im Aufbau</h1>
            <p>Telefonie wird noch erstellt und wird veröffentlicht sobald sie fertig entwickelt wurde.</p>
          </section>
        )}
      </main>
    </ShelfBody>
  );
}

function EmailView() {
  const { personName, sections, filePartnerId, versions } = useWorkflow();
  const mail = partnerMail(sections);
  const created = Boolean(getPartner(filePartnerId).createdAt);
  // A new partner's Reisepass mail arrives at the time its Verlauf records.
  const mailTime = created ? versions.find((v) => v.place.app === "kommunikation")?.time ?? "10:15" : undefined;
  const reisepass = filePartnerId === "ash" || created;
  if (!mail) return <NoMail />;
  return <Mailbox partner={{ name: personName, mail }} partnerId={filePartnerId} mailTime={mailTime} reisepass={reisepass} />;
}

function NoMail() {
  return (
    <section className="mb-empty km-tba">
      <h1>Noch keine E-Mail-Adresse hinterlegt</h1>
      <p>Kommunikation ist verfügbar, sobald in den Stammdaten eine E-Mail-Adresse angelegt ist.</p>
    </section>
  );
}

function Mailbox({ partner, partnerId, mailTime, reisepass }: { partner: Sender; partnerId: string; mailTime?: string; reisepass: boolean }) {
  const filePartnerId = partnerId;
  const [threads, setThreads] = useState<Thread[]>(() => threadsFor(partner, filePartnerId, mailTime).map((t) => (t.id === (reisepass ? "t1" : "t2") ? { ...t, unread: false } : t)));
  const [selected, setSelected] = useState<string>(reisepass ? "t1" : "t2");
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [open, setOpen] = useState<string[]>(["t3"]);
  const current = threads.find((t) => t.id === selected) ?? threads[0];
  const unread = threads.filter((t) => t.unread).length;

  const select = (id: string) => {
    setSelected(id);
    setThreads((list) => list.map((t) => (t.id === id ? { ...t, unread: false } : t)));
  };
  const toggleRead = () => current && setThreads((list) => list.map((t) => (t.id === current.id ? { ...t, unread: !t.unread } : t)));
  const archive = () => {
    if (!current) return;
    const rest = threads.filter((t) => t.id !== current.id);
    setThreads(rest);
    setSelected(rest[0]?.id ?? "");
  };

  return (
    <section className="km-mail">
      <div className="km-toolbar">
        <label className="km-search">
          <img src={a.kmSearch} alt="" width={15} height={16} />
          <input placeholder="Suchen..." />
          <span className="km-search-filter">
            <img src={a.kmFilter} alt="" width={14} height={8} />
            Filter
          </span>
        </label>
        <span className="km-tools">
          <button type="button">
            <img src={a.kmNewMail} alt="" width={26} height={19} />
            Neue Email
          </button>
          <button type="button" onClick={() => setThreads(threadsFor(partner, filePartnerId, mailTime))}>
            <span className="km-refresh">
              <img src={a.kmRefreshA} alt="" width={25} height={15} />
              <img src={a.kmRefreshB} alt="" width={15} height={15} />
            </span>
            Aktualisieren
          </button>
          <i className="km-sep" />
          <button type="button" onClick={toggleRead}>
            <img src={a.kmRead} alt="" width={21} height={20} />
            Gelesen/Ungelesen
          </button>
          <button type="button" onClick={archive}>
            <img src={a.kmArchive} alt="" width={27} height={19} />
            Archivieren
          </button>
          <i className="km-sep" />
          <button type="button">
            <img src={a.kmReply} alt="" width={13} height={20} />
            Antworten
          </button>
          <button type="button">
            <span className="km-reply-all">
              <img src={a.kmReplyAllA} alt="" width={12} height={19} />
              <img src={a.kmReplyAllB} alt="" width={12} height={19} />
            </span>
            Allen Antworten
          </button>
          <button type="button">
            <img className="km-forward" src={a.kmForward} alt="" width={13} height={20} />
            Weiterleiten
          </button>
          <button type="button" className="km-kebab" aria-label="Mehr">
            <img src={a.kmKebab} alt="" width={4} height={21} />
          </button>
        </span>
      </div>

      <div className="km-body">
        <div className="km-list">
          <div className="km-list-head">
            <span>
              {threads.length} {threads.length === 1 ? "E-Mail" : "E-Mails"}, {unread} ungelesen
            </span>
            <span className="km-list-ctrl">
              Sortieren
              <span className="km-disc">
                <img src={a.kmSortDisc} alt="" width={16} height={16} />
                <img className="km-disc-glyph" src={a.kmSortUp} alt="" width={5} height={7} />
              </span>
            </span>
            <span className="km-list-ctrl">
              Filter
              <span className="km-disc">
                <img src={a.kmFilterDisc} alt="" width={16} height={16} />
                <img className="km-disc-glyph wide" src={a.kmFilterLines} alt="" width={10} height={5} />
              </span>
            </span>
          </div>
          {threads.map((thread) => {
            const last = thread.messages[0];
            const active = thread.id === current?.id;
            const replies = thread.messages.length - 1;
            const expanded = open.includes(thread.id);
            const replied = thread.messages.some((m) => m.from.mail === partner.mail) && last.from.mail !== partner.mail;
            return (
              <div className="km-item-wrap" key={thread.id}>
                <button type="button" className={["km-item", active ? "active" : "", thread.unread ? "unread" : ""].join(" ")} onClick={() => select(thread.id)}>
                  <span className="km-item-top">
                    <strong>
                      {replied ? <img src={a.kmReplySmall} alt="" width={7} height={9} /> : null}
                      {last.from.name}
                    </strong>
                    {last.attachment ? <img className="km-clip" src={a.kmClip} alt="Anhang" width={13} height={7} /> : null}
                    {thread.event ? <img src={a.kmCalendar} alt="Termin" width={13} height={13} /> : null}
                  </span>
                  <span className="km-item-sub">
                    <b>{thread.subject}</b>
                    <small>
                      {last.day}, {last.time}
                    </small>
                  </span>
                  <span className="km-item-text">{last.body.slice(1).join(" ")}</span>
                  {replies > 0 ? (
                    <span
                      className={expanded ? "km-replies open" : "km-replies"}
                      role="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpen((list) => (list.includes(thread.id) ? list.filter((id) => id !== thread.id) : [...list, thread.id]));
                      }}
                    >
                      {replies} {replies === 1 ? "Antwort" : "Antworten"}
                      <img src={a.kmChevron} alt="" width={9} height={5} />
                    </span>
                  ) : null}
                </button>
                {expanded
                  ? thread.messages.slice(1).map((m) => (
                      <button type="button" className="km-reply-item" key={m.id} onClick={() => select(thread.id)}>
                        <span className="km-item-top">
                          <strong>
                            <img src={a.kmReplySmall} alt="" width={7} height={9} />
                            {m.from.name}
                          </strong>
                          <small>
                            {m.day}, {m.time}
                          </small>
                        </span>
                        <span className="km-item-text">{m.body.slice(1).join(" ")}</span>
                      </button>
                    ))
                  : null}
              </div>
            );
          })}
        </div>

        <div className="km-read">
          {current ? (
            current.messages.map((m) => (
              <article className="km-msg" key={m.id}>
                <header className="km-msg-head">
                  <Avatar who={m.from} />
                  <div className="km-msg-meta">
                    <h3>
                      <img src={a.kmReplySmall} alt="" width={9} height={11} />
                      {current.subject}
                      {m.attachment ? <img className="km-clip" src={a.kmClip} alt="" width={13} height={7} /> : null}
                    </h3>
                    <dl>
                      <dt>Von:</dt>
                      <dd>
                        <a href={`mailto:${m.from.mail}`}>{DISPLAY_MAIL(m.from)}</a>
                      </dd>
                      <dt>An:</dt>
                      <dd>{m.to.map((p) => <span key={p.mail}>{p.mail}</span>)}</dd>
                      {m.cc?.length ? (
                        <>
                          <dt>CC:</dt>
                          <dd>{m.cc.map((p) => <span key={p.mail}>{p.mail}</span>)}</dd>
                        </>
                      ) : null}
                      <dt>Tags:</dt>
                      <dd>{current.tags.map((t) => <span key={t}>{t}</span>)}</dd>
                    </dl>
                  </div>
                  <div className="km-msg-side">
                    <span>{m.long}</span>
                    <span className="km-round-row">
                      <button type="button" aria-label="Antworten">
                        <img src={a.kmRoundReply} alt="" width={26} height={26} />
                      </button>
                      <button type="button" aria-label="Allen Antworten" className="km-round">
                        <img src={a.kmRound} alt="" width={26} height={26} />
                        <img className="km-round-glyph a" src={a.kmReplyAllA} alt="" width={8} height={12} />
                        <img className="km-round-glyph b" src={a.kmReplyAllA} alt="" width={8} height={12} />
                      </button>
                      <button type="button" aria-label="Weiterleiten">
                        <img src={a.kmRoundForward} alt="" width={26} height={26} />
                      </button>
                      <button type="button" aria-label="Mehr" className="km-round">
                        <img src={a.kmRound} alt="" width={26} height={26} />
                        <img className="km-round-glyph dots" src={a.kmKebab} alt="" width={3} height={13} />
                      </button>
                    </span>
                  </div>
                </header>
                {m.attachment ? (
                  <AttachmentChip file={m.attachment} onOpen={() => setPreview(m.attachment!)} />
                ) : null}
                <hr />
                <div className="km-msg-body">
                  {m.body.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                <p className="km-disclaimer">{DISCLAIMER}</p>
              </article>
            ))
          ) : (
            <p className="km-none">Keine E-Mails vorhanden.</p>
          )}
        </div>
        {preview ? (
          <FilePreview value={{ kind: "file", text: preview.name, type: preview.type, docTyp: preview.docTyp }} onClose={() => setPreview(null)} placeholder />
        ) : null}
      </div>
    </section>
  );
}

/** Attachment of a mail (Figma 6404:16329): icon, name, type and "ansehen"; ⋮ opens Ansehen / Herunterladen. */
function AttachmentChip({ file, onOpen }: { file: Attachment; onOpen: () => void }) {
  return (
    <div className="km-attach">
      <span className="km-attach-icon">{file.type === "pdf" ? <img src={a.kmPdf} alt="" /> : <img className="jpg" src={a.jpg} alt="" />}</span>
      <span className="km-attach-copy">
        <strong>{file.name}</strong>
        <span>
          {file.type.toUpperCase()}
          <button type="button" className="km-attach-open" onClick={onOpen}>
            ansehen
          </button>
        </span>
      </span>
      <ContextMenu
        label="Anhang Aktionen"
        items={[
          { label: "Ansehen", icon: a.eye, onSelect: onOpen },
          { label: "Herunterladen", icon: a.download, onSelect: () => void downloadAttachment(file) },
        ]}
      />
    </div>
  );
}
