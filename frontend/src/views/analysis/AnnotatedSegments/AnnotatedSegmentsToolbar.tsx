import ReorderIcon from "@mui/icons-material/Reorder";
import VerticalSplitIcon from "@mui/icons-material/VerticalSplit";
import { Box, Card, CardContent, IconButton, Stack, TextField, Tooltip } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { AnnotatedSegmentsActions } from "./annotatedSegmentsSlice.ts";

function AnnotatedSegmentsToolbar() {
  const contextSize = useAppSelector((state) => state.annotatedSegments.contextSize);
  const isSplitView = useAppSelector((state) => state.annotatedSegments.isSplitView);

  // actions
  const dispatch = useAppDispatch();
  const handleClickSplitView = () => {
    dispatch(AnnotatedSegmentsActions.toggleSplitView());
  };

  return (
    <Card sx={{ mb: 2, flexShrink: 0 }} elevation={2}>
      <CardContent sx={{ p: 1, pb: "8px !important" }}>
        <Stack direction="row" alignItems="center">
          <Box sx={{ flexGrow: 1 }} />
          <TextField
            label="Context Size"
            type="number"
            size="small"
            value={contextSize}
            onChange={(event) => dispatch(AnnotatedSegmentsActions.setContextSize(parseInt(event.target.value)))}
          />
          <Tooltip title="Split/not split view">
            <IconButton onClick={handleClickSplitView}>
              {isSplitView ? <ReorderIcon /> : <VerticalSplitIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default AnnotatedSegmentsToolbar;
