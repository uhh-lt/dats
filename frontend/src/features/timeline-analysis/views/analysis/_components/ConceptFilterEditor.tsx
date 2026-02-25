import { FilterRenderer } from "@components/filter/redux-filter-dialog/index";
import { Box, Typography } from "@mui/material";
import { useAppSelector } from "@plugins/redux";
import { TimelineAnalysisActions } from "../../../store/timelineAnalysisSlice";

export function ConceptFilterEditor() {
  const filter = useAppSelector((state) => state.timelineAnalysis.editableFilter);
  const column2Info = useAppSelector((state) => state.timelineAnalysis.column2Info);

  return (
    <Box>
      <Typography>Filter:</Typography>
      <FilterRenderer editableFilter={filter} filterActions={TimelineAnalysisActions} column2Info={column2Info} />
    </Box>
  );
}
