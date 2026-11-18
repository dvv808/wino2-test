import * as a from "../assets/index";
import type { CommsChoice } from "../workflow";
import { commsOptions, type Block, type Card, type Section } from "./stammdaten";
import type { CommsPick } from "../workflow";

/**
 * The picks a finished Maklervereinbarung uses when none were made by hand (e.g. a Kunde from the seed): the
 * first phone, mail and Postadresse in the Stammdaten – the same defaults the finished workflow shows.
 */
export function kommunikationChoice(sections: Section[], choice: CommsChoice): CommsChoice {
  const pickOf = (type: "phone" | "mail" | "post"): CommsPick | undefined => {
    const group = commsOptions(sections, type)[0];
    const option = group?.options[0];
    return option ? { value: option.value, second: option.second, cardId: group.id, cardTitle: group.title, tags: option.tags, owner: group.person?.name } : undefined;
  };
  return { ...choice, phone: choice.phone ?? pickOf("phone"), mail: choice.mail ?? pickOf("mail"), post: choice.post ?? pickOf("post") };
}

/**
 * Once a Maklervereinbarung is complete, its Kommunikationsdaten (step 1) show on the Stammdaten cards they come
 * from: the contact card gets the "Zentraler Kontakt" box (Telefon + Mail, each with its contact), the address card
 * the "Postadresse" pill. Each stays on its own card, as in the Stammdaten workflow.
 */
export function withKommunikation(card: Card, choice: CommsChoice, done: boolean, company = false): Card {
  if (!done || card.empty) return card;
  let blocks = card.blocks ?? [];
  const boxes: Block[] = [];
  const moved = new Set<string>();
  // Figma 22934:35249 (person) / 22934:40910 (Unternehmen): the picked phone / mail of this card move into the
  // "Zentraler Kontakt" box; a company's Versand mail (e.g. Office) gets its own box. The card's list keeps the rest.
  const phone = choice.phone?.cardId === card.id ? choice.phone : undefined;
  const mail = choice.mail?.cardId === card.id ? choice.mail : undefined;
  if (phone || mail) {
    [phone?.value, mail?.value].forEach((value) => value && moved.add(value));
    boxes.push({
      kind: "usage",
      icon: a.commsMainContact,
      caption: "Zentraler Kontakt",
      text: "Diese Kontaktdaten dienen als zentraler Kontakt",
      rows: [
        ...(phone ? [{ label: "Telefon", value: phone.value, icon: a.commsPhone, action: true }] : []),
        ...(mail ? [{ label: "Mail", value: mail.value, icon: a.commsMail, action: true }] : []),
      ],
    });
  }
  const versand = company && choice.versandMail?.cardId === card.id ? choice.versandMail : undefined;
  if (versand) {
    moved.add(versand.value);
    boxes.push({
      kind: "usage",
      icon: a.commsMailSent,
      caption: "Nachrichten, Dokumente und Erklärungen",
      text: "Diese Mail dient als Versand von Nachrichten, Dokumente und Erklärungen",
      rows: [{ label: "Mail", value: versand.value, icon: a.commsMail, action: true }],
    });
  }
  if (boxes.length) {
    blocks = blocks
      .map((block) =>
        block.kind === "rows" || block.kind === "group"
          ? { ...block, rows: block.rows.filter((row) => !(typeof row.value === "string" && moved.has(row.value))) }
          : block,
      )
      .filter((block) => !((block.kind === "rows" || block.kind === "group") && block.rows.length === 0));
    // Person: right under the person. Unternehmen: under the contact's note.
    const person = blocks.findIndex((block) => block.kind === "person");
    const note = company && blocks[person + 1]?.kind === "note" ? person + 1 : person;
    blocks = [...blocks.slice(0, note + 1), ...boxes, ...blocks.slice(note + 1)];
  }
  if (choice.post?.cardId === card.id) {
    // The general "Diese Adresse ist die Postadresse" pill makes way for the Maklervereinbarung one, first of the pills.
    const rest = blocks.filter((block) => !(block.kind === "badge" && block.caption === "Postadresse"));
    const at = rest.findIndex((block) => block.kind === "badge");
    const pill: Block = { kind: "badge", icon: a.commsHouse, caption: "Postadresse", text: "Diese Adresse ist die Postadresse" };
    blocks = at < 0 ? [...rest, pill] : [...rest.slice(0, at), pill, ...rest.slice(at)];
  }
  return blocks === card.blocks ? card : { ...card, blocks };
}
