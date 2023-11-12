import { Box, Typography } from "@mui/material";
import { useFilterSliceSelector } from "../../../features/FilterDialog/FilterProvider";
import FilterRenderer from "../../../features/FilterDialog/FilterRenderer";

function ConceptFilterEditor({ rootFilterId }: { rootFilterId: string }) {
  const filter = useFilterSliceSelector().filter[rootFilterId] || undefined;

  if (filter !== undefined) {
    return (
      <Box>
        <Typography>Filter:</Typography>
        <FilterRenderer filter={filter} />
      </Box>
    );
  } else {
    return <>Filter with id {rootFilterId} does not exist!</>;
  }
}

export default ConceptFilterEditor;
