import { Box, Typography } from "@mui/material";
import { FilterRenderer } from "../../../components/FilterDialog/FilterRenderer/FilterRenderer.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { TimelineAnalysisActions } from "./timelineAnalysisSlice.ts";

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
