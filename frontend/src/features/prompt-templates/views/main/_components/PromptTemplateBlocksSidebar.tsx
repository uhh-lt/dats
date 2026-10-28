import {
  documentBlock,
  getDocumentUnit,
  getOutputFormat,
  outputFormatBlock,
  promptTemplateQueries,
} from "@core/prompt-template";
import { PromptBlock } from "@models/PromptBlock";
import CheckIcon from "@mui/icons-material/Check";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Alert, Box, Chip, CircularProgress, Divider, Stack, Tooltip, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { ReactNode } from "react";
import { PromptTemplateEditorState } from "../_hooks/usePromptTemplateEditor";
import { DocumentBlockPanel } from "./DocumentBlockPanel";
import { ExamplesPanel } from "./ExamplesPanel";
import { OutputFormatBlockPanel } from "./OutputFormatBlockPanel";
import { SelectionPanel } from "./SelectionPanel";

interface BlockChip {
  // the chip's label
  label: string;
  // what a click inserts at the cursor
  block: string;
  isUsed: boolean;
}

interface BlockSectionProps {
  title: string;
  description: string;
  chips: BlockChip[];
  // the prompt must contain one of the chips' blocks
  isRequired: boolean;
  onInsert: (block: string) => void;
  // the settings, shown while the prompt uses the block
  children: ReactNode;
}

/** One block of the task: its chips insert it, its settings show while the prompt uses it. */
function BlockSection({ title, description, chips, isRequired, onInsert, children }: BlockSectionProps) {
  const isUsed = chips.some((chip) => chip.isUsed);
  const isMissing = isRequired && !isUsed;
  return (
    <>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2" sx={{ flexGrow: 1 }} color={isMissing ? "error" : undefined}>
            {title}
          </Typography>
          <Tooltip title={description}>
            <InfoOutlinedIcon fontSize="small" color="action" />
          </Tooltip>
        </Stack>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
          {chips.map((chip) => (
            <Tooltip key={chip.label} title="Insert at the cursor" describeChild>
              <Chip
                size="small"
                label={chip.label}
                onClick={() => onInsert(chip.block)}
                color={isMissing ? "error" : chip.isUsed ? "success" : "default"}
                variant={chip.isUsed || isMissing ? "filled" : "outlined"}
                icon={isMissing ? <ErrorOutlineIcon /> : chip.isUsed ? <CheckIcon /> : undefined}
                sx={{ fontFamily: "monospace" }}
              />
            </Tooltip>
          ))}
        </Stack>
        {isUsed && <Box sx={{ mt: 1.5 }}>{children}</Box>}
      </Box>
      <Divider />
    </>
  );
}

interface PromptTemplateBlocksSidebarProps {
  editor: PromptTemplateEditorState;
  projectId: number;
}

/** The right of the Prompts page: every block of the task, expanded with its settings while the prompt uses it. */
export function PromptTemplateBlocksSidebar({ editor, projectId }: PromptTemplateBlocksSidebarProps) {
  const { template, draft, outdated, onInsert } = editor;
  const taskInfo = useQuery(promptTemplateQueries.taskInfo(template.task_type));
  if (taskInfo.isLoading) return <CircularProgress sx={{ m: 2 }} />;
  if (!taskInfo.data) return <Alert severity="error">Could not load the blocks of this task.</Alert>;

  const prompt = draft.prompt;
  const documentUnit = getDocumentUnit(prompt);
  const outputFormat = getOutputFormat(prompt);
  // a new document block gets the unit that the output format works best with
  const formats = taskInfo.data.output_formats;
  const format = formats.find((info) => info.output_format === outputFormat) ?? formats[0];
  const blocks = new Set(taskInfo.data.blocks.map((info) => info.block));
  const descriptions = Object.fromEntries(taskInfo.data.blocks.map((info) => [info.block, info.description]));
  const chip = (block: string): BlockChip => ({ label: block, block, isUsed: prompt.includes(block) });

  return (
    <Box sx={{ height: "100%", overflowY: "auto", bgcolor: "background.paper" }}>
      <Typography variant="body2" color="text.secondary" sx={{ px: 2, pt: 1.5 }}>
        Click a block to insert it at the cursor.
      </Typography>
      <BlockSection
        title="Document"
        description={`The document; it is the only block a run fills in. ${documentUnit ? (taskInfo.data.document_units.find((info) => info.unit === documentUnit)?.description ?? "") : ""}`}
        chips={[
          {
            label: "<document>",
            block: documentBlock(format.default_document_unit),
            isUsed: /<document(:[a-z_-]*)?>/.test(prompt),
          },
        ]}
        isRequired
        onInsert={onInsert}
      >
        {documentUnit ? (
          <DocumentBlockPanel
            taskType={template.task_type}
            prompt={prompt}
            unit={documentUnit}
            settings={draft.settings}
            onChangePrompt={editor.onChangePrompt}
            onChangeSettings={editor.onChangeSettings}
          />
        ) : (
          <Alert severity="error">Use exactly one supported document block.</Alert>
        )}
      </BlockSection>
      <BlockSection
        title="Output format"
        description={`The fixed answer instructions of the answer format; the answers are read in this format. ${format.description}`}
        chips={[
          {
            label: "<output-format>",
            block: outputFormatBlock(format.output_format),
            isUsed: /<output-format(:[a-z_-]*)?>/.test(prompt),
          },
        ]}
        isRequired
        onInsert={onInsert}
      >
        {outputFormat ? (
          <OutputFormatBlockPanel
            projectId={projectId}
            draft={editor.snapshot}
            outputFormat={outputFormat}
            settings={draft.settings}
            onChangePrompt={editor.onChangePrompt}
            onChangeSettings={editor.onChangeSettings}
          />
        ) : (
          <Alert severity="error">Use exactly one supported output format block.</Alert>
        )}
      </BlockSection>
      {blocks.has(PromptBlock._CODES_) && (
        <BlockSection
          title={`Codes (${draft.codes.length})`}
          description={`${descriptions[PromptBlock._CODES_]} ${descriptions[PromptBlock._CODE_NAMES_] ?? ""}`}
          chips={[chip(PromptBlock._CODES_), chip(PromptBlock._CODE_NAMES_)]}
          isRequired={taskInfo.data.required_blocks.includes(PromptBlock._CODES_)}
          onInsert={onInsert}
        >
          <SelectionPanel
            label="Codes"
            options={editor.codes.map((code) => ({ id: code.id, label: code.name }))}
            selected={draft.codes.map((code) => ({ id: code.code_id, label: code.name }))}
            outdatedIds={outdated.codes}
            onChange={editor.onChangeCodes}
          />
        </BlockSection>
      )}
      {blocks.has(PromptBlock._EXAMPLES_) && taskInfo.data.example_kind && (
        <BlockSection
          title={`Few-shot examples (${draft.examples.length})`}
          description={descriptions[PromptBlock._EXAMPLES_]}
          chips={[chip(PromptBlock._EXAMPLES_)]}
          isRequired={false}
          onInsert={onInsert}
        >
          <ExamplesPanel
            projectId={projectId}
            kind={taskInfo.data.example_kind}
            examples={draft.examples}
            codes={draft.codes}
            onChange={editor.onChangeExamples}
          />
        </BlockSection>
      )}
      {!prompt.includes(PromptBlock._EXAMPLES_) && draft.examples.length > 0 && (
        <Alert severity="warning" sx={{ m: 1 }}>
          The draft has {draft.examples.length} example(s), but the prompt does not show them. Add {"<examples>"} or
          remove them.
        </Alert>
      )}
      {blocks.has(PromptBlock._TAGS_) && (
        <BlockSection
          title={`Tags (${draft.tags.length})`}
          description={descriptions[PromptBlock._TAGS_]}
          chips={[chip(PromptBlock._TAGS_)]}
          isRequired={taskInfo.data.required_blocks.includes(PromptBlock._TAGS_)}
          onInsert={onInsert}
        >
          <SelectionPanel
            label="Tags"
            options={editor.tags.map((tag) => ({ id: tag.id, label: tag.name }))}
            selected={draft.tags.map((tag) => ({ id: tag.tag_id, label: tag.name }))}
            outdatedIds={outdated.tags}
            onChange={editor.onChangeTags}
          />
        </BlockSection>
      )}
      {blocks.has(PromptBlock._METADATA_FIELDS_) && (
        <BlockSection
          title={`Metadata fields (${draft.metadata_fields.length})`}
          description={descriptions[PromptBlock._METADATA_FIELDS_]}
          chips={[chip(PromptBlock._METADATA_FIELDS_)]}
          isRequired={taskInfo.data.required_blocks.includes(PromptBlock._METADATA_FIELDS_)}
          onInsert={onInsert}
        >
          <SelectionPanel
            label="Metadata fields"
            options={editor.metadataFields.map((field) => ({ id: field.id, label: field.key }))}
            selected={draft.metadata_fields.map((field) => ({ id: field.project_metadata_id, label: field.key }))}
            outdatedIds={outdated.metadataFields}
            onChange={editor.onChangeMetadataFields}
          />
        </BlockSection>
      )}
    </Box>
  );
}
