import { DATSToolbar } from "@components/DATSToolbar";
import { EditableTypography } from "@components/EditableTypography";
import { getIconComponent, Icon } from "@components/icons";
import { PROMPT_TEXT_STYLE, PromptPage } from "@core/prompt";
import EditIcon from "@mui/icons-material/Edit";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import SaveIcon from "@mui/icons-material/Save";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  ListItemText,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { formatDateTime } from "@utils/DateUtils";
import { ChangeEvent, KeyboardEvent, MouseEvent, useCallback } from "react";
import { EditorView, PromptEditorState } from "../_hooks/usePromptEditor";
import { PreviewPanel } from "./PreviewPanel";

interface PromptEditorProps {
  editor: PromptEditorState;
  projectId: number;
}

/** The center of the Prompts page: one toolbar row, then the prompt, raw or as preview. */
export function PromptEditor({ editor, projectId }: PromptEditorProps) {
  const { prompt, version, draft, onChangeVersion, onChangeView, onChangeText, onSave, inputRef } = editor;
  const nextVersion = prompt.versions.length + 1;

  const handleChangeVersion = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChangeVersion(Number(event.target.value)),
    [onChangeVersion],
  );
  const handleChangeView = useCallback(
    (_: MouseEvent<HTMLElement>, value: EditorView | null) => {
      if (value) onChangeView(value);
    },
    [onChangeView],
  );
  const handleChangePrompt = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChangeText(event.target.value),
    [onChangeText],
  );
  // Ctrl+S (Cmd+S) saves the draft
  const isEdited = editor.isEdited;
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "s" || !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      if (isEdited) onSave();
    },
    [isEdited, onSave],
  );

  return (
    <Box className="h100 myFlexContainer" onKeyDown={handleKeyDown}>
      <DATSToolbar variant="dense" sx={{ justifyContent: "flex-start", px: 1.5, gap: 0.5 }}>
        <EditableTypography
          value={prompt.name}
          onChange={editor.onRename}
          whiteColor={false}
          variant="h6"
          noWrap
          title={prompt.name}
          sx={{ minWidth: 0 }}
          stackProps={{ sx: { minWidth: 80, flexShrink: 1 } }}
        />
        <TextField
          select
          size="small"
          variant="standard"
          value={version.id}
          onChange={handleChangeVersion}
          slotProps={{
            input: { disableUnderline: true },
            select: { renderValue: () => `v${version.version}` },
          }}
          sx={{ flexShrink: 0 }}
        >
          {prompt.versions
            .slice()
            .reverse()
            .map((candidate, index) => (
              <MenuItem key={candidate.id} value={candidate.id}>
                <ListItemText
                  primary={`Version ${candidate.version}${index === 0 ? " (latest)" : ""}`}
                  secondary={formatDateTime(candidate.created)}
                />
              </MenuItem>
            ))}
        </TextField>
        {!editor.isLatest && (
          <Tooltip title={`Saving creates version ${nextVersion} from this version; older versions never change.`}>
            <Chip size="small" variant="outlined" label="Older version" />
          </Tooltip>
        )}
        {prompt.is_archived && (
          <Tooltip title="Archived prompts are not offered in the LLM Assistant. Runs that used them keep their versions.">
            <Chip size="small" variant="outlined" color="warning" label="Archived" />
          </Tooltip>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <ToggleButtonGroup size="small" exclusive value={editor.view} onChange={handleChangeView}>
          <ToggleButton value="editor" sx={{ px: 1, py: 0.25, gap: 0.5 }}>
            <EditIcon fontSize="small" /> Write
          </ToggleButton>
          <ToggleButton value="preview" sx={{ px: 1, py: 0.25, gap: 0.5 }}>
            <VisibilityIcon fontSize="small" /> Preview
          </ToggleButton>
        </ToggleButtonGroup>
        <Divider orientation="vertical" flexItem variant="middle" />
        <Tooltip title="Duplicate: copy the prompt and selections shown here into a new prompt">
          <span>
            <IconButton size="small" onClick={editor.onDuplicate} disabled={editor.isDuplicating}>
              {getIconComponent(Icon.DUPLICATE, { fontSize: "small" })}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={prompt.is_archived ? "Unarchive" : "Archive: hide the prompt from the LLM Assistant"}>
          <IconButton size="small" onClick={editor.onToggleArchived}>
            {getIconComponent(prompt.is_archived ? Icon.UNARCHIVE : Icon.ARCHIVE, { fontSize: "small" })}
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem variant="middle" />
        {editor.isEdited ? (
          <>
            <Tooltip title="Unsaved changes">
              <FiberManualRecordIcon sx={{ fontSize: 12, color: "warning.main", flexShrink: 0 }} />
            </Tooltip>
            <Button size="small" onClick={editor.onDiscard} disabled={editor.isSaving} sx={{ flexShrink: 0 }}>
              Discard
            </Button>
            <Tooltip title={`Save as version ${nextVersion} (Ctrl+S)`}>
              <Button
                size="small"
                variant="contained"
                sx={{ flexShrink: 0 }}
                color="success"
                startIcon={<SaveIcon />}
                loading={editor.isSaving}
                loadingPosition="start"
                onClick={onSave}
              >
                Save
              </Button>
            </Tooltip>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
            Saved · v{prompt.versions.length}
          </Typography>
        )}
      </DATSToolbar>
      {editor.view === "editor" ? (
        <Box className="myFlexFillAllContainer">
          <PromptPage>
            <TextField
              fullWidth
              multiline
              minRows={20}
              variant="standard"
              placeholder="Write the prompt and insert blocks from the right."
              value={draft.text}
              onChange={handleChangePrompt}
              inputRef={(element: HTMLTextAreaElement | null) => {
                inputRef.current = element;
              }}
              slotProps={{ input: { disableUnderline: true, sx: { p: 0 } }, htmlInput: { style: PROMPT_TEXT_STYLE } }}
            />
          </PromptPage>
        </Box>
      ) : (
        <PreviewPanel projectId={projectId} draft={editor.snapshot} />
      )}
    </Box>
  );
}
