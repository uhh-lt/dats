import PlayCircle from "@mui/icons-material/PlayCircle";
import { LoadingButton } from "@mui/lab";
import { useCallback, useState } from "react";
import DocProcessingHooks from "../../api/DocProcessingHooks.ts";
import { Language } from "../../api/openapi/models/Language.ts";
import { ProcessingSettings } from "../../api/openapi/models/ProcessingSettings.ts";
import { DialogSection } from "../MUI/DialogSection.tsx";
import ProcessingSettingsButton from "./ProcessingSettingsButton.tsx";
import { UploadDropzone } from "./UploadDropzone.tsx";

interface FileUploadSectionProps {
  projectId: number;
}

export function FileUploadSection({ projectId }: FileUploadSectionProps) {
  // Upload mutation
  const uploadDocumentMutation = DocProcessingHooks.useUploadDocument();

  // Local state
  const [files, setFiles] = useState<File[]>([]);
  const [settings, setSettings] = useState<ProcessingSettings>({
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
      action={<ProcessingSettingsButton settings={settings} onChangeSettings={setSettings} />}
    >
      <UploadDropzone onFilesChanged={handleFilesChange} files={files} />
      <LoadingButton
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
      </LoadingButton>
    </DialogSection>
  );
}
