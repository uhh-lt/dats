import { DOCUMENT_UNIT_LABELS, promptTemplateQueries, setDocumentUnit } from "@core/prompt-template";
import { DocumentUnit } from "@models/DocumentUnit";
import { PromptSettings } from "@models/PromptSettings";
import { TaskType } from "@models/TaskType";
import { MenuItem, Stack, TextField } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { ChangeEvent, useCallback, useMemo } from "react";
import { SettingField } from "./SettingField";

interface DocumentBlockPanelProps {
  taskType: TaskType;
  prompt: string;
  unit: DocumentUnit;
  settings: Required<PromptSettings>;
  onChangePrompt: (prompt: string) => void;
  onChangeSettings: (settings: Required<PromptSettings>) => void;
}

/** Configures the document block: how a document is split into LLM calls. */
export function DocumentBlockPanel({
  taskType,
  prompt,
  unit,
  settings,
  onChangePrompt,
  onChangeSettings,
}: DocumentBlockPanelProps) {
  const taskInfo = useQuery(promptTemplateQueries.taskInfo(taskType));
  const units = useMemo(() => taskInfo.data?.document_units ?? [], [taskInfo.data]);
  const handleChangeUnit = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = units.find((info) => info.unit === event.target.value);
      if (value) onChangePrompt(setDocumentUnit(prompt, value.unit));
    },
    [units, prompt, onChangePrompt],
  );

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      <TextField select size="small" label="Send" value={unit} onChange={handleChangeUnit} sx={{ flex: "1 1 100%" }}>
        {units.length === 0 ? (
          <MenuItem value={unit}>{DOCUMENT_UNIT_LABELS[unit]}</MenuItem>
        ) : (
          units.map((info) => (
            <MenuItem key={info.unit} value={info.unit}>
              {DOCUMENT_UNIT_LABELS[info.unit]}
            </MenuItem>
          ))
        )}
      </TextField>
      {unit === DocumentUnit.CHUNKS && (
        <>
          <SettingField
            label="Chunk size (tokens)"
            field="chunk_size_tokens"
            settings={settings}
            onChangeSettings={onChangeSettings}
          />
          <SettingField
            label="Overlap (tokens)"
            field="chunk_overlap_tokens"
            settings={settings}
            onChangeSettings={onChangeSettings}
          />
        </>
      )}
    </Stack>
  );
}
