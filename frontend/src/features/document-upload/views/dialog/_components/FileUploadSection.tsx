import { generalQueries } from "@api/general/generalQueries";
import { DialogSection } from "@components/DialogSection";
import { ProcessingSettingsButton } from "@components/ProcessingSettingsButton";
import { Language } from "@models/Language";
import { ProcessingSettings } from "@models/ProcessingSettings";
import PlayCircle from "@mui/icons-material/PlayCircle";
import { Button } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { DocumentUploadHooks } from "../../../api/documentUploadHooks";
import { UploadDropzone } from "./UploadDropzone";

interface FileUploadSectionProps {
  projectId: number;
}

export function FileUploadSection({ projectId }: FileUploadSectionProps) {
  const availableLLMs = useQuery(generalQueries.availableModels());

  // Local state
  const [files, setFiles] = useState<File[]>([]);
  const [settings, setSettings] = useState<ProcessingSettings>({
    model: "default",
    extract_images: true,
    pages_per_chunk: 10,
    keyword_deduplication_threshold: 0.5,
    keyword_max_ngram_size: 2,
    keyword_number: 5,
    language: Language.AUTO,
  });

  const handleFilesChange = useCallback((files: File[]) => {
    setFiles(files);
  }, []);

  const { mutate: uploadDocument, isPending: isUploadPending } = DocumentUploadHooks.useUploadDocument();
  const handleUpload = useCallback(() => {
    if (files.length === 0) return;
    uploadDocument(
      {
        projectId,
        formData: {
          settings: JSON.stringify(settings),
          // @ts-expect-error: ignore this error until we switch to new codegen heyapi.dev
          uploaded_files: Array.from(files),
        },
      },
      { onSuccess: () => setFiles([]) },
    );
  }, [files, projectId, settings, uploadDocument]);

  return (
    <DialogSection
      title="Upload Files"
      action={
        <ProcessingSettingsButton
          settings={settings}
          onChangeSettings={setSettings}
          availableLLMs={availableLLMs.data || []}
        />
      }
    >
      <UploadDropzone onFilesChanged={handleFilesChange} files={files} />
      <Button
        variant="contained"
        color="primary"
        onClick={handleUpload}
        loading={isUploadPending}
        loadingPosition="start"
        startIcon={<PlayCircle />}
        disabled={files.length === 0}
        fullWidth
        sx={{ mt: 2 }}
      >
        Upload {files.length} File{files.length !== 1 ? "s" : ""}
      </Button>
    </DialogSection>
  );
}
