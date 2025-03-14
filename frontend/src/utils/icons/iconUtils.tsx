import AddIcon from "@mui/icons-material/Add";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ArticleIcon from "@mui/icons-material/Article";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BarChartIcon from "@mui/icons-material/BarChart";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";
import CommentIcon from "@mui/icons-material/Comment";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import FolderIcon from "@mui/icons-material/Folder";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import HomeIcon from "@mui/icons-material/Home";
import ImageIcon from "@mui/icons-material/Image";
import ImageSearchIcon from "@mui/icons-material/ImageSearch";
import LabelIcon from "@mui/icons-material/Label";
import LayersIcon from "@mui/icons-material/Layers";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import NotesIcon from "@mui/icons-material/Notes";
import NumbersIcon from "@mui/icons-material/Numbers";
import PersonIcon from "@mui/icons-material/Person";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import ScaleIcon from "@mui/icons-material/Scale";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SquareIcon from "@mui/icons-material/Square";
import SubjectIcon from "@mui/icons-material/Subject";
import TextFormatIcon from "@mui/icons-material/TextFormat";
import TimelineIcon from "@mui/icons-material/Timeline";
import TuneIcon from "@mui/icons-material/Tune";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { SvgIconProps } from "@mui/material";
import React from "react";
export enum Icon {
  HOME = "home",

  // Core objects
  PROJECT = "project",
  CODE = "code",
  TAG = "tag",
  MEMO = "memo",
  DOCUMENT = "document",
  SPAN_ANNOTATION = "span_annotation",
  SENTENCE_ANNOTATION = "sentence_annotation",
  BBOX_ANNOTATION = "bbox_annotation",

  // Document types
  TEXT_DOCUMENT = "text_document",
  IMAGE_DOCUMENT = "image_document",
  AUDIO_DOCUMENT = "audio_document",
  VIDEO_DOCUMENT = "video_document",

  // Job objects
  CRAWLER_JOB = "crawler_job",
  PREPROCESSING_JOB = "preprocessing_job",
  LLM_JOB = "llm_job",
  ML_JOB = "ml_job",
  EXPORT_JOB = "export_job",

  // SEARCH
  SEARCH = "search",
  DOCUMENT_SEARCH = "document_search",
  IMAGE_SEARCH = "image_search",
  SENTENCE_SEARCH = "sentence_search",

  // Annotation
  ANNOTATION = "annotation",

  // ASSISTANT
  LLM_ASSISTANT = "llm_assistant",

  // ANALYSIS
  ANALYSIS = "analysis",
  COTA = "cota",
  TIMELINE_ANALYSIS = "timeline_analysis",
  ANNOTATION_SCALING = "annotation_scaling",
  WORD_FREQUENCY = "word_frequency",
  CODE_FREQUENCY = "code_frequency",
  SENTENCE_ANNOTATION_TABLE = "sentence_annotation_table",
  SPAN_ANNOTATION_TABLE = "span_annotation_table",

  // TOOLS
  TOOLS = "tools",
  DUPLICATE_FINDER = "duplicate_finder",
  DOCUMENT_SAMPLER = "document_sampler",
  ML_AUTOMATION = "ml_automation",

  // Whiteboard
  WHITEBOARD = "whiteboard",

  // Logbook
  LOGBOOK = "logbook",

  // SETTINGS
  SETTINGS = "project_settings",

  // USER
  USER = "user",

  // Metadata types
  META_STRING = "meta_string",
  META_NUMBER = "meta_number",
  META_DATE = "meta_date",
  META_BOOLEAN = "meta_boolean",
  META_LIST = "meta_list",

  // CRUD
  CREATE = "create",
  ADD = "add",
  EDIT = "edit",
  DELETE = "delete",
  DUPLICATE = "duplicate",

  // EXPORT
  EXPORT = "export",
  EXPORT_CSV = "export_csv",
  EXPORT_IMAGE = "export_image",

  // MENUS
  CONTEXT_MENU = "context_menu",

  // MISC
  VISIBILITY = "visibility",
  VISIBILITY_OFF = "visibility_off",
}

// Define a type for icon component factory functions
type IconFactory = (iconProps: SvgIconProps) => React.ReactElement;

// Map from enum to icon component factory functions
const iconMap: Record<Icon, IconFactory> = {
  // HOME
  [Icon.HOME]: (iconProps) => <HomeIcon {...iconProps} />,

  // Core objects
  [Icon.PROJECT]: (iconProps) => <FolderIcon {...iconProps} />,
  [Icon.CODE]: (iconProps) => <SquareIcon {...iconProps} />,
  [Icon.TAG]: (iconProps) => <LabelIcon {...iconProps} />,
  [Icon.MEMO]: (iconProps) => <CommentIcon {...iconProps} />,
  [Icon.DOCUMENT]: (iconProps) => <ArticleIcon {...iconProps} />,
  [Icon.SPAN_ANNOTATION]: (iconProps) => <NotesIcon {...iconProps} />,
  [Icon.SENTENCE_ANNOTATION]: (iconProps) => <NotesIcon {...iconProps} />,
  [Icon.BBOX_ANNOTATION]: (iconProps) => <ArticleIcon {...iconProps} />,

  // Document types
  [Icon.TEXT_DOCUMENT]: (iconProps) => <ArticleIcon {...iconProps} />,
  [Icon.IMAGE_DOCUMENT]: (iconProps) => <ImageSearchIcon {...iconProps} />,
  [Icon.AUDIO_DOCUMENT]: (iconProps) => <ImageSearchIcon {...iconProps} />,
  [Icon.VIDEO_DOCUMENT]: (iconProps) => <ImageSearchIcon {...iconProps} />,

  // Job objects
  [Icon.CRAWLER_JOB]: (iconProps) => <SearchIcon {...iconProps} />,
  [Icon.PREPROCESSING_JOB]: (iconProps) => <TuneIcon {...iconProps} />,
  [Icon.LLM_JOB]: (iconProps) => <AutoAwesomeIcon {...iconProps} />,
  [Icon.ML_JOB]: (iconProps) => <AutoAwesomeIcon {...iconProps} />,
  [Icon.EXPORT_JOB]: (iconProps) => <SaveAltIcon {...iconProps} />,

  // SEARCH
  [Icon.SEARCH]: (iconProps) => <SearchIcon {...iconProps} />,
  [Icon.DOCUMENT_SEARCH]: (iconProps) => <SearchIcon {...iconProps} />,
  [Icon.IMAGE_SEARCH]: (iconProps) => <ImageSearchIcon {...iconProps} />,
  [Icon.SENTENCE_SEARCH]: (iconProps) => <TextFormatIcon {...iconProps} />,

  // Annotation
  [Icon.ANNOTATION]: (iconProps) => <EditIcon {...iconProps} />,

  // ASSISTANT
  [Icon.LLM_ASSISTANT]: (iconProps) => <SmartToyIcon {...iconProps} />,

  // ANALYSIS
  [Icon.ANALYSIS]: (iconProps) => <TimelineIcon {...iconProps} />,
  [Icon.COTA]: (iconProps) => <TimelineIcon {...iconProps} />,
  [Icon.TIMELINE_ANALYSIS]: (iconProps) => <TimelineIcon {...iconProps} />,
  [Icon.ANNOTATION_SCALING]: (iconProps) => <ScaleIcon {...iconProps} />,
  [Icon.WORD_FREQUENCY]: (iconProps) => <TextFormatIcon {...iconProps} />,
  [Icon.CODE_FREQUENCY]: (iconProps) => <BarChartIcon {...iconProps} />,
  [Icon.SENTENCE_ANNOTATION_TABLE]: (iconProps) => <NotesIcon {...iconProps} />,
  [Icon.SPAN_ANNOTATION_TABLE]: (iconProps) => <NotesIcon {...iconProps} />,

  // TOOLS
  [Icon.TOOLS]: (iconProps) => <TuneIcon {...iconProps} />,
  [Icon.DUPLICATE_FINDER]: (iconProps) => <ContentCopyIcon {...iconProps} />,
  [Icon.DOCUMENT_SAMPLER]: (iconProps) => <ShuffleIcon {...iconProps} />,
  [Icon.ML_AUTOMATION]: (iconProps) => <AutoAwesomeIcon {...iconProps} />,

  // Whiteboard
  [Icon.WHITEBOARD]: (iconProps) => <LayersIcon {...iconProps} />,

  // Logbook
  [Icon.LOGBOOK]: (iconProps) => <MenuBookIcon {...iconProps} />,

  // SETTINGS
  [Icon.SETTINGS]: (iconProps) => <SettingsIcon {...iconProps} />,

  // USER
  [Icon.USER]: (iconProps) => <PersonIcon {...iconProps} />,

  // Metadata types
  [Icon.META_STRING]: (iconProps) => <SubjectIcon {...iconProps} />,
  [Icon.META_NUMBER]: (iconProps) => <NumbersIcon {...iconProps} />,
  [Icon.META_DATE]: (iconProps) => <CalendarMonthIcon {...iconProps} />,
  [Icon.META_BOOLEAN]: (iconProps) => <CheckBoxOutlinedIcon {...iconProps} />,
  [Icon.META_LIST]: (iconProps) => <FormatListBulletedOutlinedIcon {...iconProps} />,

  // CRUD
  [Icon.CREATE]: (iconProps) => <AddIcon {...iconProps} />,
  [Icon.ADD]: (iconProps) => <AddCircleIcon {...iconProps} />,
  [Icon.EDIT]: (iconProps) => <EditIcon {...iconProps} />,
  [Icon.DELETE]: (iconProps) => <DeleteIcon {...iconProps} />,
  [Icon.DUPLICATE]: (iconProps) => <FileCopyIcon {...iconProps} />,

  // EXPORT
  [Icon.EXPORT]: (iconProps) => <SaveAltIcon {...iconProps} />,
  [Icon.EXPORT_CSV]: (iconProps) => <FileCopyIcon {...iconProps} />,
  [Icon.EXPORT_IMAGE]: (iconProps) => <ImageIcon {...iconProps} />,

  // MENUS
  [Icon.CONTEXT_MENU]: (iconProps) => <MoreVertIcon {...iconProps} />,

  // MISC
  [Icon.VISIBILITY]: (iconProps) => <VisibilityIcon {...iconProps} />,
  [Icon.VISIBILITY_OFF]: (iconProps) => <VisibilityOffIcon {...iconProps} />,
};

/**
 * Returns an icon component for the given icon type with customizable props
 * @param icon - The icon type to render
 * @param props - Any valid SvgIcon props to pass to the icon component
 * @returns A React element representing the icon with applied props
 */
export const getIconComponent = (icon: Icon, props?: SvgIconProps): React.ReactElement => {
  return iconMap[icon](props || {});
};
