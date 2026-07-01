import { DocProcessingHooks } from "@api/hooks/DocProcessingHooks";
import { LLMHooks } from "@api/hooks/LLMHooks";
import { Language } from "@api/models/Language";
import { ProcessingSettings } from "@api/models/ProcessingSettings";
import { DialogSection } from "@components/DialogSection";
import { ProcessingSettingsButton } from "@components/ProcessingSettingsButton";
import PlayCircle from "@mui/icons-material/PlayCircle";
import { Button } from "@mui/material";
import { useCallback, useState } from "react";
import { UploadDropzone } from "./UploadDropzone";

interface FileUploadSectionProps {
  projectId: number;
}

export function FileUploadSection({ projectId }: FileUploadSectionProps) {
  const availableLLMs = LLMHooks.useGetAvailableLLMs();

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

  const uploadDocumentMutation = DocProcessingHooks.useUploadDocument();
  const handleUpload = useCallback(async () => {
    if (files.length > 0) {
      await uploadDocumentMutation.mutateAsync({
        projId: projectId,
        formData: {
          settings: JSON.stringify(settings),
          uploaded_files: Array.from(files),
        },
      });
      setFiles([]);
    }
  }, [files, projectId, settings, uploadDocumentMutation]);

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
        loading={uploadDocumentMutation.isPending}
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
