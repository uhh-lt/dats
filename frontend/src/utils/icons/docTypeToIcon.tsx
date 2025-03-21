import { DocType } from "../../api/openapi/models/DocType.ts";
import { Icon, getIconComponent } from "./iconUtils.tsx";

export const docTypeToIcon: Record<DocType, React.ReactElement> = {
  [DocType.TEXT]: getIconComponent(Icon.TEXT_DOCUMENT),
  [DocType.IMAGE]: getIconComponent(Icon.IMAGE_DOCUMENT),
  [DocType.VIDEO]: getIconComponent(Icon.VIDEO_DOCUMENT),
  [DocType.AUDIO]: getIconComponent(Icon.AUDIO_DOCUMENT),
};
