import { PromptPreview, PromptPreviewSource } from "@core/prompt-template";
import { useDebounce } from "@hooks/useDebounce";
import { PromptTemplateSnapshot } from "@models/PromptTemplateSnapshot";
import { Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { PreviewDocumentsDialog } from "./PreviewDocumentsDialog";

interface PreviewPanelProps {
  projectId: number;
  draft: PromptTemplateSnapshot;
}

/** Previews the editor's draft exactly as the LLM receives it, for sample documents. */
export function PreviewPanel({ projectId, draft }: PreviewPanelProps) {
  // sample documents: the documents of the examples until the user selects others
  const [selectedSdocIds, setSelectedSdocIds] = useState<number[] | undefined>(undefined);
  const exampleSdocIds = useMemo(
    () => [...new Set((draft.examples ?? []).map((example) => example.sdoc_id))],
    [draft.examples],
  );
  const sdocIds = selectedSdocIds ?? exampleSdocIds;

  // render the draft once the user stops typing
  const debouncedDraft = useDebounce(draft, 500);
  const source = useMemo<PromptPreviewSource>(() => ({ draft: debouncedDraft }), [debouncedDraft]);

  return (
    <Stack spacing={2} sx={{ height: "100%" }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          Every block is filled with the selections of the draft; a run only adds the document.
        </Typography>
        <PreviewDocumentsDialog projectId={projectId} sdocIds={sdocIds} onChange={setSelectedSdocIds} />
      </Stack>
      <PromptPreview projectId={projectId} sdocIds={sdocIds} source={source} />
    </Stack>
  );
}
