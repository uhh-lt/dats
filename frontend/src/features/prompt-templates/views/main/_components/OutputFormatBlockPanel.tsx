import { OUTPUT_FORMAT_LABELS, OutputFormatAbout, promptTemplateQueries, setOutputFormat } from "@core/prompt-template";
import { useDebounce } from "@hooks/useDebounce";
import { OutputFormat } from "@models/OutputFormat";
import { PromptSettings } from "@models/PromptSettings";
import { PromptTemplateSnapshot } from "@models/PromptTemplateSnapshot";
import { Link, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { ChangeEvent, useCallback, useMemo, useState } from "react";
import { SettingField } from "./SettingField";

interface OutputFormatBlockPanelProps {
  projectId: number;
  draft: PromptTemplateSnapshot;
  outputFormat: OutputFormat;
  settings: Required<PromptSettings>;
  onChangePrompt: (prompt: string) => void;
  onChangeSettings: (settings: Required<PromptSettings>) => void;
}

/** Configures the output format block: how the LLM answers; shows its fixed answer instructions. */
export function OutputFormatBlockPanel({
  projectId,
  draft,
  outputFormat,
  settings,
  onChangePrompt,
  onChangeSettings,
}: OutputFormatBlockPanelProps) {
  const taskInfo = useQuery(promptTemplateQueries.taskInfo(draft.task_type));
  const formats = useMemo(() => taskInfo.data?.output_formats ?? [], [taskInfo.data]);
  const formatInfo = formats.find((info) => info.output_format === outputFormat);
  const handleChangeFormat = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = formats.find((info) => info.output_format === event.target.value);
      if (value) onChangePrompt(setOutputFormat(draft.prompt, value.output_format));
    },
    [formats, draft.prompt, onChangePrompt],
  );

  // the fixed answer instructions, as the block renders them once the user stops typing
  const debouncedDraft = useDebounce(draft, 500);
  const rendered = useQuery(
    promptTemplateQueries.preview({ project_id: projectId, draft: debouncedDraft, sdoc_id: null, message_index: 0 }),
  );
  const [showInstructions, setShowInstructions] = useState(false);
  const handleToggleInstructions = useCallback(() => setShowInstructions((current) => !current), []);
  const instructions = formatInfo
    ? rendered.data?.blocks.find((block) => block.placeholder === formatInfo.placeholder)?.text
    : undefined;

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <TextField
          select
          size="small"
          label="Output format"
          value={outputFormat}
          onChange={handleChangeFormat}
          sx={{ flex: "1 1 100%" }}
        >
          {formats.length === 0 ? (
            <MenuItem value={outputFormat}>{OUTPUT_FORMAT_LABELS[outputFormat]}</MenuItem>
          ) : (
            formats.map((info) => (
              <MenuItem key={info.output_format} value={info.output_format}>
                {OUTPUT_FORMAT_LABELS[info.output_format]}
              </MenuItem>
            ))
          )}
        </TextField>
        {outputFormat === OutputFormat.CONTEXT && (
          <>
            <SettingField
              label="Context before"
              field="context_before_chars"
              settings={settings}
              onChangeSettings={onChangeSettings}
            />
            <SettingField
              label="Context after"
              field="context_after_chars"
              settings={settings}
              onChangeSettings={onChangeSettings}
            />
            <SettingField
              label="Fuzzy threshold"
              field="fuzzy_threshold"
              step={0.05}
              settings={settings}
              onChangeSettings={onChangeSettings}
            />
          </>
        )}
      </Stack>
      {instructions !== undefined && (
        <>
          <Link
            component="button"
            variant="body2"
            underline="hover"
            onClick={handleToggleInstructions}
            sx={{ alignSelf: "flex-start" }}
          >
            {showInstructions ? "Hide" : "Show"} the answer instructions
          </Link>
          {showInstructions && (
            <Typography
              variant="body2"
              component="pre"
              sx={{ whiteSpace: "pre-wrap", fontFamily: "monospace", bgcolor: "grey.50", p: 1, borderRadius: 1, m: 0 }}
            >
              {instructions}
            </Typography>
          )}
        </>
      )}
      {formatInfo && <OutputFormatAbout name={formatInfo.name} details={formatInfo.details} />}
    </Stack>
  );
}
