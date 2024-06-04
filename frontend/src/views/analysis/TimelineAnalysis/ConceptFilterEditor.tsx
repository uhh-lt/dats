import { Box, Typography } from "@mui/material";
import FilterRenderer from "../../../components/FilterDialog/FilterRenderer.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { TimelineAnalysisFilterActions } from "./timelineAnalysisFilterSlice.ts";

function ConceptFilterEditor() {
  const filter = useAppSelector((state) => state.timelineAnalysisFilter.editableFilter);
  const column2Info = useAppSelector((state) => state.timelineAnalysisFilter.column2Info);

  return (
    <Box>
      <Typography>Filter:</Typography>
      <FilterRenderer editableFilter={filter} filterActions={TimelineAnalysisFilterActions} column2Info={column2Info} />
    </Box>
  );
}

export default ConceptFilterEditor;
