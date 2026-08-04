import { DATSToolbar } from "@components/DATSToolbar";
import { DocTypeIcons, getIconComponent, Icon } from "@components/icons";
import { DocType } from "@models/DocType";
import { SourceDocumentRead } from "@models/SourceDocumentRead";
// TODO: Fix feature-to-feature imports
// eslint-disable-next-line boundaries/element-types
import { LLMAssistanceButton } from "@features/llm-assistant";
import ChromeReaderModeIcon from "@mui/icons-material/ChromeReaderMode";
import DoNotDisturbIcon from "@mui/icons-material/DoNotDisturb";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import { Box, IconButton, Theme, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { AnnotationMode } from "../../_types/AnnotationMode";
import { TagStyle } from "../../_types/TagStyle";
import { AnnoActions } from "../../store/annoSlice";
import { AnnotatorSelector } from "./_components/AnnotatorSelector";
import { CompareWithSelector } from "./_components/CompareWithSelector";
import { TagStyleAboveIcon } from "./_components/TagStyleAboveIcon";
import { TagStyleInlineIcon } from "./_components/TagStyleInlineIcon";

interface AnnotationToolbarProps {
  sdoc?: SourceDocumentRead;
}

const groupLabelSx = (theme: Theme) => ({
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 500,
  whiteSpace: "nowrap",
  lineHeight: 1.2,
  // two-line labels when the toolbar container gets narrower
  [theme.containerQueries.down("lg")]: {
    whiteSpace: "pre-line",
    textAlign: "center",
  },
  // hide labels entirely when the toolbar container gets very narrow
  [theme.containerQueries.down(1100)]: {
    display: "none",
  },
});

const groupSx = { display: "flex", alignItems: "center", gap: 1 } as const;

export function AnnotationToolbar({ sdoc }: AnnotationToolbarProps) {
  const openCodeShortcutManager = useOpenDialog("codeShortcutManager");

  // global client state (redux)
  const annotationMode = useAppSelector((state) => state.annotations.annotationMode);
  const tagStyle = useAppSelector((state) => state.annotations.tagStyle);
  const dispatch = useAppDispatch();

  return (
    <DATSToolbar disableGutters variant="dense">
      {sdoc ? (
        <Box
          sx={(theme) => ({
            containerType: "inline-size",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            width: "100%",
            maxWidth: theme.breakpoints.values.xl,
            mx: "auto",
            px: 3,
          })}
        >
          <Box sx={{ ...groupSx, pl: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={groupLabelSx}>
              Annotator
            </Typography>
            <AnnotatorSelector sdocId={sdoc.id} />
            vs.
            <CompareWithSelector sdocId={sdoc.id} />
          </Box>
          <Box sx={groupSx}>
            <Typography variant="overline" color="text.secondary" sx={groupLabelSx}>
              {"Text\nview"}
            </Typography>
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
          </Box>
          {sdoc.doctype === DocType.TEXT && annotationMode !== AnnotationMode.SentenceAnnotation && (
            <Box sx={groupSx}>
              <Typography variant="overline" color="text.secondary" sx={groupLabelSx}>
                {"Annotation\nview"}
              </Typography>
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
                    <TagStyleInlineIcon />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Above" placement="bottom">
                  <ToggleButton value={TagStyle.Above}>
                    <TagStyleAboveIcon />
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
            </Box>
          )}
          <Box sx={groupSx}>
            <Typography variant="overline" color="text.secondary" sx={groupLabelSx}>
              Shortcuts
            </Typography>
            <Tooltip title="Manage code shortcuts" placement="bottom">
              <IconButton onClick={() => openCodeShortcutManager()}>
                <KeyboardIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={groupSx}>
            <Typography variant="overline" color="text.secondary" sx={groupLabelSx}>
              {"LLM\nAssistant"}
            </Typography>
            <LLMAssistanceButton sdocIds={[sdoc.id]} projectId={sdoc.project_id} />
          </Box>
        </Box>
      ) : null}
    </DATSToolbar>
  );
}
