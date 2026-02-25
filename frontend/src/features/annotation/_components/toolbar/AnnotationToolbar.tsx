import { FolderHooks } from "@api/FolderHooks";
import { DATSToolbar } from "@components/DATSToolbar";
import ChromeReaderModeIcon from "@mui/icons-material/ChromeReaderMode";
import DoNotDisturbIcon from "@mui/icons-material/DoNotDisturb";
import FormatOverlineIcon from "@mui/icons-material/FormatOverline";
import FormatStrikethroughIcon from "@mui/icons-material/FormatStrikethrough";
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { useNavigate } from "@tanstack/react-router";
import { DocType } from "../../../../api/openapi/models/DocType";
import { SourceDocumentRead } from "../../../../api/openapi/models/SourceDocumentRead";
import { docTypeToIcon } from "../../../../utils/icons/docTypeToIcon";
import { getIconComponent, Icon } from "../../../../utils/icons/iconUtils";
import { LLMAssistanceButton } from "../../../llm-assistant/views/button/LLMAssistantButton";
import { AnnotationMode } from "../../_types/AnnotationMode";
import { AnnoActions, TagStyle } from "../../store/annoSlice";
import { AnnotatorSelector } from "./components/AnnotatorSelector";
import { CompareWithButton } from "./components/CompareWithButton";
import { CompareWithSelector } from "./components/CompareWithSelector";

interface AnnotationToolbarProps {
  sdoc?: SourceDocumentRead;
}

export function AnnotationToolbar({ sdoc }: AnnotationToolbarProps) {
  // global client state
  const annotationMode = useAppSelector((state) => state.annotations.annotationMode);
  const isCompareMode = useAppSelector((state) => state.annotations.isCompareMode);
  const tagStyle = useAppSelector((state) => state.annotations.tagStyle);
  const dispatch = useAppDispatch();
  const sdocFolder = FolderHooks.useGetSdocFolder(sdoc?.folder_id);
  const folderWithSdocs = FolderHooks.useGetSdocIdsPerDoctypeInSdocFolder(sdocFolder.data?.id);
  const sdocIds = folderWithSdocs.data?.text;
  const navigate = useNavigate();

  function handleDocSelect(event: SelectChangeEvent<number>) {
    navigate(`/project/${sdoc?.project_id}/annotation/${event.target.value}`);
  }

  return (
    <DATSToolbar disableGutters variant="dense">
      {sdoc ? (
        <>
          {sdocIds && sdocIds.length > 1 ? (
            <FormControl>
              <InputLabel>Doc in Folder</InputLabel>
              <Select size="small" value={sdoc.id} sx={{ minWidth: 120 }} onChange={handleDocSelect}>
                {sdocIds.map((id, i) => (
                  <MenuItem value={id}>{i + 1}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          <ToggleButtonGroup
            value={annotationMode}
            exclusive
            onChange={(_, value) => dispatch(AnnoActions.onChangeAnnotationMode(value))}
            size="small"
            color="primary"
          >
            <Tooltip title="Sentence Annotation" placement="bottom">
              <ToggleButton value={AnnotationMode.SentenceAnnotation}>
                {getIconComponent(Icon.SENTENCE_ANNOTATION)}
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Annotation" placement="bottom">
              <ToggleButton value={AnnotationMode.Annotation}>{docTypeToIcon[sdoc.doctype]}</ToggleButton>
            </Tooltip>
            <Tooltip title="Reading" placement="bottom">
              <ToggleButton value={AnnotationMode.Reader}>
                <ChromeReaderModeIcon />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
          <AnnotatorSelector sdocId={sdoc.id} />
          {isCompareMode ? (
            <>
              vs.
              <CompareWithSelector sdocId={sdoc.id} />
            </>
          ) : (
            <CompareWithButton sdocId={sdoc.id} />
          )}
          {sdoc.doctype === DocType.TEXT && annotationMode !== AnnotationMode.SentenceAnnotation && (
            <ToggleButtonGroup
              value={tagStyle}
              exclusive
              onChange={(_, value) => dispatch(AnnoActions.onSetAnnotatorTagStyle(value))}
              size="small"
              color="primary"
            >
              <Tooltip title="None" placement="bottom">
                <ToggleButton value={TagStyle.None}>
                  <DoNotDisturbIcon />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Inline" placement="bottom">
                <ToggleButton value={TagStyle.Inline}>
                  <FormatStrikethroughIcon />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Above" placement="bottom">
                <ToggleButton value={TagStyle.Above}>
                  <FormatOverlineIcon />
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
          )}
          <LLMAssistanceButton sdocIds={[sdoc.id]} projectId={sdoc.project_id} />
        </>
      ) : null}
    </DATSToolbar>
  );
}
