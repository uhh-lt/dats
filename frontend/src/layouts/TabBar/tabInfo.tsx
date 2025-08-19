import { Icon } from "../../utils/icons/iconUtils";
import { TabData } from "./types/TabData";

function getIconForBase(base: string): Icon {
  switch (base) {
    case "search":
      return Icon.SEARCH;
    case "sentencesearch":
      return Icon.SENTENCE_SEARCH;
    case "imagesearch":
      return Icon.IMAGE_SEARCH;
    case "annotation":
      return Icon.ANNOTATION;
    case "whiteboard":
      return Icon.WHITEBOARD;
    case "logbook":
      return Icon.LOGBOOK;
    case "settings":
      return Icon.SETTINGS;
    case "analysis":
      return Icon.ANALYSIS;
    case "concepts-over-time-analysis":
      return Icon.COTA;
    case "timeline":
      return Icon.TIMELINE_ANALYSIS;
    case "word-frequency":
      return Icon.WORD_FREQUENCY;
    case "span-annotations":
      return Icon.SPAN_ANNOTATION_TABLE;
    case "sentence-annotations":
      return Icon.SENTENCE_ANNOTATION_TABLE;
    case "bbox-annotations":
      return Icon.BBOX_ANNOTATION_TABLE;
    case "code-frequency":
      return Icon.CODE_FREQUENCY;
    case "duplicate-finder":
      return Icon.DUPLICATE_FINDER;
    case "document-sampler":
      return Icon.DOCUMENT_SAMPLER;
    case "ml-automation":
      return Icon.ML_AUTOMATION;
    case "perspectives":
      return Icon.PERSPECTIVES;
    case "dashboard":
      return Icon.MAP;
    case "map":
      return Icon.MAP;
    case "health":
      return Icon.HEALTH;
    default:
      return Icon.PROJECT;
  }
}

export const getTabInfoFromPath = (path: string): Omit<TabData, "id"> => {
  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0) {
    return { path, base: "home", icon: Icon.HOME };
  }

  // Always look at the last 1-2 segments
  const lastSegment = segments[segments.length - 1];
  const secondLastSegment = segments.length > 1 ? segments[segments.length - 2] : null;

  // Check if last segment is a number (id)
  const isLastSegmentId = !isNaN(parseInt(lastSegment));

  if (isLastSegmentId && secondLastSegment) {
    // We have both base and id
    return {
      path,
      base: secondLastSegment,
      data_id: lastSegment,
      icon: getIconForBase(secondLastSegment),
    };
  } else {
    // We only have base
    return {
      path,
      base: lastSegment,
      icon: getIconForBase(lastSegment),
    };
  }
};
