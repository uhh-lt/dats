import { WordFrequencyColumns } from "@api/models/WordFrequencyColumns";
import { WordFrequencyService } from "@api/services/WordFrequencyService";
import { MyFilter } from "@components/filter";
import { useOpenSnackbar } from "@core/notification/snackbar/useOpenSnackbar";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { useAppSelector } from "@plugins/redux";
import { useMutation } from "@tanstack/react-query";
import { downloadFile } from "@utils/ExportUtils";
import { getIconComponent, Icon } from "@utils/icons/iconUtils";

interface WordFrequencyExportButtonProps {
  filter: MyFilter<WordFrequencyColumns>;
}

export function WordFrequencyExportButton({ filter }: WordFrequencyExportButtonProps) {
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
