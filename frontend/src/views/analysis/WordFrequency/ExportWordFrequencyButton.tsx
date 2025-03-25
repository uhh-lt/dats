import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { WordFrequencyColumns } from "../../../api/openapi/models/WordFrequencyColumns.ts";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import { MyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import { downloadFile } from "../../../utils/ExportUtils.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";

interface ExportWordFrequencyButtonProps {
  filter: MyFilter<WordFrequencyColumns>;
}

export default function ExportWordFrequencyButton({ filter }: ExportWordFrequencyButtonProps) {
  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  const exportWordFrequencies = useMutation({
    mutationFn: AnalysisService.wordFrequencyAnalysisExport,
  });

  // snackbar
  const openSnackbar = useOpenSnackbar();

  const handleClick = () => {
    exportWordFrequencies.mutate(
      {
        projectId,
        requestBody: {
          filter: filter,
          sorts: [],
        },
      },
      {
        onError: (error) => {
          openSnackbar({
            text: `Word Frequency Export failed: ${error}`,
            severity: "error",
          });
        },
        onSuccess: (data) => {
          downloadFile("/content/" + data);
        },
      },
    );
  };

  if (exportWordFrequencies.isPending) {
    return <CircularProgress size={20} />;
  } else {
    return (
      <Tooltip title="Export word frequencies">
        <span>
          <IconButton onClick={handleClick}>{getIconComponent(Icon.EXPORT)}</IconButton>
        </span>
      </Tooltip>
    );
  }
}
