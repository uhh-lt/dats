import { FilterRenderer } from "@core/filter";
import { Box, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback } from "react";
import { TimelineAnalysisActions } from "../../../store/timelineAnalysisSlice";

export function ConceptFilterEditor() {
  const dispatch = useAppDispatch();
  const filter = useAppSelector((state) => state.timelineAnalysis.editableFilter);
  const column2Info = useAppSelector((state) => state.timelineAnalysis.column2Info);

  const handleAddFilter = useCallback(
    (filterId: string) => {
      dispatch(TimelineAnalysisActions.addDefaultFilter({ filterId }));
    },
    [dispatch],
  );

  const handleAddFilterExpression = useCallback(
    (filterId: string) => {
      dispatch(TimelineAnalysisActions.addDefaultFilterExpression({ filterId, addEnd: true }));
    },
    [dispatch],
  );

  const handleDeleteFilter = useCallback(
    (filterId: string) => {
      dispatch(TimelineAnalysisActions.deleteFilter({ filterId }));
    },
    [dispatch],
  );

  const handleLogicalOperatorChange = useCallback(
    (
      filterId: string,
      operator: Parameters<typeof TimelineAnalysisActions.changeFilterLogicalOperator>[0]["operator"],
    ) => {
      dispatch(TimelineAnalysisActions.changeFilterLogicalOperator({ filterId, operator }));
    },
    [dispatch],
  );

  const handleColumnChange = useCallback(
    (filterId: string, columnValue: string) => {
      dispatch(TimelineAnalysisActions.changeFilterColumn({ filterId, columnValue }));
    },
    [dispatch],
  );

  const handleOperatorChange = useCallback(
    (filterId: string, operator: Parameters<typeof TimelineAnalysisActions.changeFilterOperator>[0]["operator"]) => {
      dispatch(TimelineAnalysisActions.changeFilterOperator({ filterId, operator }));
    },
    [dispatch],
  );

  const handleValueChange = useCallback(
    (filterId: string, value: Parameters<typeof TimelineAnalysisActions.changeFilterValue>[0]["value"]) => {
      dispatch(TimelineAnalysisActions.changeFilterValue({ filterId, value }));
    },
    [dispatch],
  );

  return (
    <Box>
      <Typography>Filter:</Typography>
      <FilterRenderer
        editableFilter={filter}
        column2Info={column2Info}
        onAddFilter={handleAddFilter}
        onAddFilterExpression={handleAddFilterExpression}
        onDeleteFilter={handleDeleteFilter}
        onChangeFilterLogicalOperator={handleLogicalOperatorChange}
        onChangeFilterColumn={handleColumnChange}
        onChangeFilterOperator={handleOperatorChange}
        onChangeFilterValue={handleValueChange}
      />
    </Box>
  );
}
