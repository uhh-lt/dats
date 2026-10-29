import { CodeRenderer } from "@core/code";
import { PromptTemplateHooks } from "@core/prompt-template";
import { PromptCode } from "@models/PromptCode";
import { PromptExampleKind } from "@models/PromptExampleKind";
import { SpanPromptExample } from "@models/SpanPromptExample";
import DeleteIcon from "@mui/icons-material/Delete";
import { Alert, Box, Button, Divider, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { Fragment, ReactNode, useCallback } from "react";
import { PromptExample } from "../_hooks/usePromptTemplateEditor";
import { ExampleSelection } from "./ExampleSelection";

interface ExamplesPanelProps {
  projectId: number;
  kind: PromptExampleKind;
  examples: PromptExample[];
  codes: PromptCode[];
  onChange: (examples: PromptExample[]) => void;
}

const isSpanExample = (example: PromptExample): example is SpanPromptExample => "spans" in example;

/** The codes an example shows, in order of appearance. */
function exampleCodeIds(example: PromptExample): number[] {
  if (isSpanExample(example)) return [...new Set(example.spans.map((span) => span.code_id))];
  return [example.code_id];
}

interface ExampleTextProps {
  example: PromptExample;
  selectedCodeIds: Set<number>;
}

/** The text of an example with its spans marked; spans of codes that are not selected are not shown to the LLM. */
function ExampleText({ example, selectedCodeIds }: ExampleTextProps) {
  if (!isSpanExample(example)) return <Typography variant="body2">{example.text}</Typography>;

  const parts: ReactNode[] = [];
  let cursor = 0;
  example.spans.forEach((span, index) => {
    // overlapping spans are not marked twice
    if (span.begin < cursor) return;
    parts.push(<Fragment key={`text-${index}`}>{example.text.slice(cursor, span.begin)}</Fragment>);
    const isSelected = selectedCodeIds.has(span.code_id);
    parts.push(
      <mark
        key={`span-${index}`}
        style={isSelected ? undefined : { backgroundColor: "transparent", textDecoration: "underline dotted" }}
      >
        {example.text.slice(span.begin, span.end)}
      </mark>,
    );
    cursor = span.end;
  });
  parts.push(<Fragment key="text-end">{example.text.slice(cursor)}</Fragment>);
  return <Typography variant="body2">{parts}</Typography>;
}

/** Few-shot examples of a prompt: snapshots of annotations, rendered through <examples>. */
export function ExamplesPanel({ projectId, kind, examples, codes, onChange }: ExamplesPanelProps) {
  const { mutate: createPromptExamplesMutation, isPending } = PromptTemplateHooks.useCreatePromptExamples();
  const selectedCodeIds = new Set(codes.map((code) => code.code_id));
  const numShown = examples.filter((example) => exampleCodeIds(example).some((id) => selectedCodeIds.has(id))).length;

  const handleAddExamples = useCallback(
    (annotationIds: number[]) => {
      createPromptExamplesMutation(
        { requestBody: { project_id: projectId, kind, annotation_ids: annotationIds } },
        {
          onSuccess: (created) => {
            // an annotation that is already part of an example adds nothing
            const existing = new Set(examples.flatMap((example) => example.source_annotation_ids));
            onChange([
              ...examples,
              ...created.filter((example) => !example.source_annotation_ids.some((id) => existing.has(id))),
            ]);
          },
        },
      );
    },
    [createPromptExamplesMutation, projectId, kind, examples, onChange],
  );
  const handleRemoveExample = useCallback(
    (index: number) => () => onChange(examples.filter((_, i) => i !== index)),
    [examples, onChange],
  );
  const handleRemoveAll = useCallback(() => onChange([]), [onChange]);

  return (
    <Stack spacing={1}>
      {kind === PromptExampleKind.SPAN && examples.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          Each example shows all spans its annotator marked; dotted spans are not sent, because their code is not
          selected.
        </Typography>
      )}
      {examples.length > 0 && numShown === 0 && (
        <Alert severity="warning">None of the examples shows a selected code, so the run is zero-shot.</Alert>
      )}
      {examples.length > 0 && (
        <Stack divider={<Divider flexItem />} sx={{ maxHeight: 320, overflowY: "auto" }}>
          {examples.map((example, index) => (
            <Stack
              key={`${example.source_annotation_ids.join("-")}-${index}`}
              direction="row"
              spacing={0.5}
              alignItems="flex-start"
              sx={{ py: 0.75 }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <ExampleText example={example} selectedCodeIds={selectedCodeIds} />
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.25 }}>
                  {exampleCodeIds(example).map((codeId) => (
                    <Typography key={codeId} variant="caption" component="span">
                      <CodeRenderer code={codeId} />
                    </Typography>
                  ))}
                </Stack>
              </Box>
              <Tooltip title="Remove example">
                <IconButton size="small" onClick={handleRemoveExample(index)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </Stack>
      )}
      <Stack direction="row" spacing={1} alignItems="center">
        <ExampleSelection projectId={projectId} kind={kind} codes={codes} onConfirmSelection={handleAddExamples} />
        {examples.length > 0 && (
          <Button size="small" color="error" disabled={isPending} onClick={handleRemoveAll}>
            Remove all
          </Button>
        )}
        {isPending && <Typography variant="body2">Creating examples…</Typography>}
        {examples.length === 0 && !isPending && (
          <Typography variant="body2" color="text.secondary">
            No examples: zero-shot.
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
