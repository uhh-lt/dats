import { Icon } from "../../utils/icons/iconUtils";
import { TabData } from "./types/TabData";

const baseToIconMap: Record<string, Icon> = {
  search: Icon.SEARCH,
  sentencesearch: Icon.SENTENCE_SEARCH,
  imagesearch: Icon.IMAGE_SEARCH,
  annotation: Icon.ANNOTATION,
  whiteboard: Icon.WHITEBOARD,
  logbook: Icon.LOGBOOK,
  settings: Icon.SETTINGS,
  analysis: Icon.ANALYSIS,
  "concepts-over-time-analysis": Icon.COTA,
  timeline: Icon.TIMELINE_ANALYSIS,
  "word-frequency": Icon.WORD_FREQUENCY,
  "span-annotations": Icon.SPAN_ANNOTATION_TABLE,
  "sentence-annotations": Icon.SENTENCE_ANNOTATION_TABLE,
  "bbox-annotations": Icon.BBOX_ANNOTATION_TABLE,
  "code-frequency": Icon.CODE_FREQUENCY,
  "duplicate-finder": Icon.DUPLICATE_FINDER,
  "document-sampler": Icon.DOCUMENT_SAMPLER,
  "ml-automation": Icon.ML_AUTOMATION,
  perspectives: Icon.PERSPECTIVES,
  dashboard: Icon.MAP,
  map: Icon.MAP,
  health: Icon.HEALTH,
  classifier: Icon.CLASSIFIER,
};

function getIconForBase(base: string): Icon {
  return baseToIconMap[base] ?? Icon.PROJECT;
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
