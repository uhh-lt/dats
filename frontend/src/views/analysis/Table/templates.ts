import { TableType } from "../../../api/openapi";

const CUSTOM_TEMPLATE = [
  ["", "", "", "", ""],
  ["", "", "", "", ""],
  ["", "", "", "", ""],
  ["", "", "", "", ""],
  ["", "", "", "", ""],
];

const SITUATIONMAP_TEMPLATE = [
  ["<h3>INDIVIDUELLE MENSCHLICHE ELEMENTE/AKTEURE</h3>", "<h3>NICHTMENSCHLICHE ELEMENTE/ AKTANTEN</h3>"],
  ["", ""],
  ["<h3>KOLLEKTIVE MENSCHLICHE ELEMENTE/AKTEURE</h3>", "<h3>IMPLIZIERTE/STUMME AKTEURE/AKTANTEN</h3>"],
  ["", ""],
  [
    "<h3>DISKURSIVE KONSTRUKTIONEN INDIVIDUELLER UND/ODER KOLLEKTIVER MENSCHLICHER AKTEURE</h3>",
    "<h3>DISKURSIVE KONSTRUKTION NICHTMENSCHLICHER AKTANTEN</h3>",
  ],
  ["", ""],
  ["<h3>POLITISCHE/WIRTSCHAFTLICHE ELEMENTE</h3>", "<h3>SOZIO-KULTURELLE/SYMBOLISCHE ELEMENTE</h3>"],
  ["", ""],
  ["<h3>ZEITLICHE ELEMENTE</h3>", "<h3>RÄUMLICHE ELEMENTE</h3>"],
  ["", ""],
  [
    "<h3>HAUPTTHEMEN/DEBATTEN (MEIST UMSTRITTEN)</h3>",
    "<h3>VERWANDTE DISKURSE (HISTORISCHE, NARRATIVE UND/ODER VISUELLE)</h3>",
  ],
  ["", ""],
];

const INTERPRETATION_TEMPLATE = [
  [
    "<b>Fundstelle</b>",
    "<b>Deutungsmuster</b>",
    "<b>Akteur:in</b>",
    "<b>Ursache</b>",
    "<b>Hypothese</b>",
    "<b>Konsequenz</b>",
    "<b>Präzisierungen</b>",
    "<b>Argumentation</b>",
  ],
  ["Code", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
];

const PHENOMENON_TEMPLATE = [
  ["<b>Dimension</b>", "<b>Inhaltliche Ausführung</b>", "<b>Theoretisierung</b>"],
  ["Diskursthema", "", ""],
  ["Ursachen", "", ""],
  ["Folgen", "", ""],
  ["Handlungsbedarf", "", ""],
  ["Problemlösung", "", ""],
  ["Akteur:innen", "", ""],
  ["Verantwortung", "", ""],
  ["Handlungsstrategien", "", ""],
  ["Aushandlungsstrategien", "", ""],
  ["Selbstpositionierung", "", ""],
  ["Fremdpositionierung", "", ""],
  ["Dingkultur", "", ""],
  ["Wertbezug", "", ""],
];

export const TableType2Template = {
  [TableType.CUSTOM]: CUSTOM_TEMPLATE,
  [TableType.SITUATION]: SITUATIONMAP_TEMPLATE,
  [TableType.PHENOMENON]: PHENOMENON_TEMPLATE,
  [TableType.INTERPRETATION]: INTERPRETATION_TEMPLATE,
};
