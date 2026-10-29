import { PromptPreview, PromptPreviewSource } from "@core/prompt-template";
import { useDebounce } from "@hooks/useDebounce";
import { PromptTemplateSnapshot } from "@models/PromptTemplateSnapshot";
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
    <PromptPreview
      variant="page"
      projectId={projectId}
      sdocIds={sdocIds}
      source={source}
      toolbarStart={<PreviewDocumentsDialog projectId={projectId} sdocIds={sdocIds} onChange={setSelectedSdocIds} />}
    />
  );
}
