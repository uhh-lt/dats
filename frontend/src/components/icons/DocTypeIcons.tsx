import { DocType } from "@api/models/DocType";
import { Icon } from "./DATSIcons";

export const DocTypeIcons: Record<DocType, Icon> = {
  [DocType.TEXT]: Icon.TEXT_DOCUMENT,
  [DocType.IMAGE]: Icon.IMAGE_DOCUMENT,
  [DocType.VIDEO]: Icon.VIDEO_DOCUMENT,
  [DocType.AUDIO]: Icon.AUDIO_DOCUMENT,
};
