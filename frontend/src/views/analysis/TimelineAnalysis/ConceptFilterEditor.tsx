import { Box, Typography } from "@mui/material";
import FilterRenderer from "../../../features/FilterDialog/FilterRenderer";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import { TimelineAnalysisFilterActions } from "./timelineAnalysisFilterSlice";

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
