import { DocType } from "@api/models/DocType";
import { SourceDocumentRead } from "@api/models/SourceDocumentRead";
import { DATSToolbar } from "@components/DATSToolbar";
// TODO: Fix feature-to-feature imports
// eslint-disable-next-line boundaries/element-types
import { LLMAssistanceButton } from "@features/llm-assistant";
import ChromeReaderModeIcon from "@mui/icons-material/ChromeReaderMode";
import DoNotDisturbIcon from "@mui/icons-material/DoNotDisturb";
import FormatOverlineIcon from "@mui/icons-material/FormatOverline";
import FormatStrikethroughIcon from "@mui/icons-material/FormatStrikethrough";
import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { DocTypeIcons, getIconComponent, Icon } from "@utils/icons/iconUtils";
import { AnnotationRouteAPI } from "../../_hooks/annotationRouteAPI";
import { AnnotationMode } from "../../_types/AnnotationMode";
import { TagStyle } from "../../_types/TagStyle";
import { AnnoActions } from "../../store/annoSlice";
import { AnnotatorSelector } from "./_components/AnnotatorSelector";
import { CompareWithButton } from "./_components/CompareWithButton";
import { CompareWithSelector } from "./_components/CompareWithSelector";

interface AnnotationToolbarProps {
  sdoc?: SourceDocumentRead;
}

export function AnnotationToolbar({ sdoc }: AnnotationToolbarProps) {
  // global client state (URL search params)
  const { compareWithUserId } = AnnotationRouteAPI.useSearch();
  const isCompareMode = compareWithUserId !== undefined;

  // global client state (redux)
  const annotationMode = useAppSelector((state) => state.annotations.annotationMode);
  const tagStyle = useAppSelector((state) => state.annotations.tagStyle);
  const dispatch = useAppDispatch();

  return (
    <DATSToolbar disableGutters variant="dense">
      {sdoc ? (
        <>
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
              <ToggleButton value={AnnotationMode.Annotation}>
                {getIconComponent(DocTypeIcons[sdoc.doctype])}
              </ToggleButton>
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
