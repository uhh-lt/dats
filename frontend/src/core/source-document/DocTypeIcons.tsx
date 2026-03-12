import { DocType } from "@api/models/DocType";
import { Icon, getIconComponent } from "@utils/icons/iconUtils";

export const DocTypeIcons: Record<DocType, React.ReactElement> = {
  [DocType.TEXT]: getIconComponent(Icon.TEXT_DOCUMENT),
  [DocType.IMAGE]: getIconComponent(Icon.IMAGE_DOCUMENT),
  [DocType.VIDEO]: getIconComponent(Icon.VIDEO_DOCUMENT),
  [DocType.AUDIO]: getIconComponent(Icon.AUDIO_DOCUMENT),
};
