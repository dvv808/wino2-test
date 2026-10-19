export type StammdatenDiffIcon = "phone" | "mail" | "maps";

export type StammdatenDiffField = {
  label: string;
  icon?: StammdatenDiffIcon;
  left: string;
  right: string;
  rightLink?: boolean;
};

export type StammdatenDiffSection = {
  caption: string;
  stamp: string;
  fields: StammdatenDiffField[];
};

export type StammdatenDiffVersion = {
  number: number;
  title: string;
  open?: boolean;
  sections: StammdatenDiffSection[];
};

export type StammdatenDiff = {
  headline: string;
  leftLabel: string;
  rightLabel: string;
  versions: StammdatenDiffVersion[];
};

/** Julia: Kontakte + Postadresse, matching the Figma Freigabe card. */
export const JULIA_STAMMDATEN_DIFF: StammdatenDiff = {
  headline: "Stammdaten: Kunde",
  leftLabel: "Winmakler",
  rightLabel: "Wino 2",
  versions: [
    {
      number: 2,
      title: "Version - 2 Ergänzungen",
      open: true,
      sections: [
        {
          caption: "Zentraler Kontakt",
          stamp: "Ergänzung 2 von 2 - 22.10.2027, 13:33 Uhr, Lucy Dullon",
          fields: [
            {
              label: "Mobil Privat",
              icon: "phone",
              left: "+43 3810 393 112 3",
              right: "+43 2231 4212 444",
            },
            {
              label: "Mail Privat",
              icon: "mail",
              left: "julia.atkinson@mail.at",
              right: "julia123@hotmail.at",
            },
          ],
        },
        {
          caption: "Postadresse",
          stamp: "Ergänzung 2 von 2 - 06.09.2027, 09:12 Uhr, Lucy Dullon",
          fields: [
            { label: "Straße", left: "Mondseestrasse", right: "Hinterbergerstrasse" },
            { label: "Hausnummer", left: "32", right: "44" },
            { label: "PLZ", left: "5310", right: "8970" },
            { label: "Ort", left: "Mondsee", right: "Schladming" },
            { label: "Land", left: "Österreich", right: "Österreich" },
            {
              label: "Google Link",
              icon: "maps",
              left: "YN4rqLSvp9uEqKmT8",
              right: "58182034812038",
              rightLink: true,
            },
          ],
        },
      ],
    },
    {
      number: 1,
      title: "Version - 4 Ergänzungen",
      sections: [],
    },
  ],
};

/** Lunixo: Firmenbuch pushed in from WICO. */
export const LUNIXO_WICO_DIFF: StammdatenDiff = {
  headline: "Stammdaten: Interessent",
  leftLabel: "Winmakler",
  rightLabel: "Wino 2",
  versions: [
    {
      number: 2,
      title: "Version - 1 Ergänzung",
      open: true,
      sections: [
        {
          caption: "Firmenbuch",
          stamp: "Ergänzung 1 von 1 - 15.10.2027, 08:04 Uhr, WICO",
          fields: [
            { label: "Firmenwortlaut", left: "Lunixo AG", right: "Lunixo AG" },
            { label: "Straße", left: "Mondseestrasse", right: "Industriestrasse" },
            { label: "Hausnummer", left: "32", right: "8" },
            { label: "PLZ", left: "5310", right: "4020" },
            { label: "Ort", left: "Mondsee", right: "Linz" },
            { label: "Firmenbuchnummer", left: "51209z", right: "51209z" },
            { label: "UID", left: "ATU20051022", right: "ATU20051099" },
          ],
        },
      ],
    },
    {
      number: 1,
      title: "Version - 3 Ergänzungen",
      sections: [],
    },
  ],
};
