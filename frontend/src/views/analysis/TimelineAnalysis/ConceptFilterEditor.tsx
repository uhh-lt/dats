import { Box, Typography } from "@mui/material";
import FilterRenderer from "../../../features/FilterDialog/FilterRenderer";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import { TimelineAnalysisFilterActions } from "./timelineAnalysisFilterSlice";

function ConceptFilterEditor({ rootFilterId }: { rootFilterId: string }) {
  const filter = useAppSelector((state) => state.timelineAnalysisFilter.editableFilter);
  const column2Info = useAppSelector((state) => state.timelineAnalysisFilter.column2Info);

  if (filter !== undefined) {
    return (
      <Box>
        <Typography>Filter:</Typography>
        <FilterRenderer
          editableFilter={filter}
          filterActions={TimelineAnalysisFilterActions}
          column2Info={column2Info}
        />
      </Box>
    );
  } else {
    return <>Filter with id {rootFilterId} does not exist!</>;
  }
}

export default ConceptFilterEditor;
