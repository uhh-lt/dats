import ChromeReaderModeIcon from "@mui/icons-material/ChromeReaderMode";
import DoNotDisturbIcon from "@mui/icons-material/DoNotDisturb";
import FormatOverlineIcon from "@mui/icons-material/FormatOverline";
import FormatStrikethroughIcon from "@mui/icons-material/FormatStrikethrough";
import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { DocType } from "../../../../api/openapi/models/DocType.ts";
import { SourceDocumentRead } from "../../../../api/openapi/models/SourceDocumentRead.ts";
import { LLMAssistanceButton } from "../../../../components/LLMDialog/LLMAssistanceButton.tsx";
import { DATSToolbar } from "../../../../components/MUI/DATSToolbar.tsx";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { docTypeToIcon } from "../../../../utils/icons/docTypeToIcon.tsx";
import { getIconComponent, Icon } from "../../../../utils/icons/iconUtils.tsx";
import { AnnoActions, TagStyle } from "../../annoSlice.ts";
import { AnnotationMode } from "../../types/AnnotationMode.ts";
import { AnnotatorSelector } from "./components/AnnotatorSelector.tsx";
import { CompareWithButton } from "./components/CompareWithButton.tsx";
import { CompareWithSelector } from "./components/CompareWithSelector.tsx";

interface AnnotationToolbarProps {
  sdoc?: SourceDocumentRead;
}

export function AnnotationToolbar({ sdoc }: AnnotationToolbarProps) {
  // global client state
  const annotationMode = useAppSelector((state) => state.annotations.annotationMode);
  const isCompareMode = useAppSelector((state) => state.annotations.isCompareMode);
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
