import ArticleIcon from "@mui/icons-material/Article";
import AudioFileIcon from "@mui/icons-material/AudioFile";
import VideoFileIcon from "@mui/icons-material/VideoFile";
import ImageIcon from "@mui/icons-material/Image";
import * as React from "react";
import { DocType } from "../../api/openapi";

export const docTypeToIcon: Record<DocType, React.ReactElement> = {
  [DocType.TEXT]: <ArticleIcon />,
  [DocType.IMAGE]: <ImageIcon />,
  [DocType.VIDEO]: <VideoFileIcon />,
  [DocType.AUDIO]: <AudioFileIcon />,
};
