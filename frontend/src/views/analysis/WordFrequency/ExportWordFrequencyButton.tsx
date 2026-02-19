import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { WordFrequencyColumns } from "../../../api/openapi/models/WordFrequencyColumns.ts";
import { WordFrequencyService } from "../../../api/openapi/services/WordFrequencyService.ts";
import { MyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { downloadFile } from "../../../utils/ExportUtils.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";

interface ExportWordFrequencyButtonProps {
  filter: MyFilter<WordFrequencyColumns>;
}

export default function ExportWordFrequencyButton({ filter }: ExportWordFrequencyButtonProps) {
  const projectId = useAppSelector((state) => state.project.projectId);

  const exportWordFrequencies = useMutation({
    mutationFn: WordFrequencyService.wordFrequencyAnalysisExport,
  });

  // snackbar
  const openSnackbar = useOpenSnackbar();

  const handleClick = () => {
    if (!projectId) return;
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
          downloadFile(encodeURI("/content/" + data));
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
