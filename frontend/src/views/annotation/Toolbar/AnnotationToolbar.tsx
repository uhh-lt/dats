import ChromeReaderModeIcon from "@mui/icons-material/ChromeReaderMode";
import DoNotDisturbIcon from "@mui/icons-material/DoNotDisturb";
import FormatOverlineIcon from "@mui/icons-material/FormatOverline";
import FormatStrikethroughIcon from "@mui/icons-material/FormatStrikethrough";
import ShortTextIcon from "@mui/icons-material/ShortText";
import SubjectIcon from "@mui/icons-material/Subject";
import { ToggleButton, ToggleButtonGroup, Toolbar, Tooltip } from "@mui/material";
import { useEffect } from "react";
import { DocType } from "../../../api/openapi/models/DocType.ts";
import { SourceDocumentRead } from "../../../api/openapi/models/SourceDocumentRead.ts";
import LLMAssistanceButton from "../../../components/LLMDialog/LLMAssistanceButton.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { AnnoActions, TagStyle } from "../annoSlice.ts";
import AnnotationMode from "../AnnotationMode.ts";
import { AnnotatorSelector } from "../AnnotatorSelector.tsx";
import CompareWithButton from "./CompareWithButton.tsx";
import { CompareWithSelector } from "./CompareWithSelector.tsx";

const docTypeToIcon: Record<DocType, React.ReactNode> = {
  [DocType.TEXT]: <ShortTextIcon />,
  [DocType.IMAGE]: <SubjectIcon />,
  [DocType.AUDIO]: <SubjectIcon />,
  [DocType.VIDEO]: <SubjectIcon />,
};

interface AnnotationToolbarProps {
  sdoc?: SourceDocumentRead;
}

function AnnotationToolbar({ sdoc }: AnnotationToolbarProps) {
  // global client state
  const annotationMode = useAppSelector((state) => state.annotations.annotationMode);
  const isCompareMode = useAppSelector((state) => state.annotations.isCompareMode);
  const tagStyle = useAppSelector((state) => state.annotations.tagStyle);
  const dispatch = useAppDispatch();

  // ensure that annotation mode is correct
  useEffect(() => {
    if (!sdoc) return;
    if (sdoc.doctype !== DocType.TEXT && annotationMode === AnnotationMode.SentenceAnnotation) {
      dispatch(AnnoActions.onChangeAnnotationMode(AnnotationMode.Annotation));
    }
  }, [sdoc, annotationMode, dispatch]);

  return (
    <Toolbar
      disableGutters
      variant="dense"
      sx={{
        zIndex: (theme) => theme.zIndex.appBar + 1,
        bgcolor: (theme) => theme.palette.background.paper,
        borderBottom: "1px solid #e8eaed",
        boxShadow: 4,
        justifyContent: "center",
        gap: 1,
      }}
    >
      {sdoc ? (
        <>
          <ToggleButtonGroup
            value={annotationMode}
            exclusive
            onChange={(_, value) => dispatch(AnnoActions.onChangeAnnotationMode(value))}
            size="small"
            color="primary"
          >
            {sdoc.doctype === DocType.TEXT && (
              <Tooltip title="Sentence Annotation" placement="bottom">
                <ToggleButton value={AnnotationMode.SentenceAnnotation}>
                  <SubjectIcon />
                </ToggleButton>
              </Tooltip>
            )}
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
          {sdoc.doctype === DocType.TEXT && <LLMAssistanceButton sdocIds={[sdoc.id]} projectId={sdoc.project_id} />}
        </>
      ) : null}
    </Toolbar>
  );
}

export default AnnotationToolbar;
