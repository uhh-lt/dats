import { BBoxFilterActions } from "@core/bbox-annotation";
import { BBoxColumns } from "@models/BBoxColumns";
import { createSlice } from "@reduxjs/toolkit";
import { initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";

const BBoxAnnotationsSlice = createSlice({
  name: "bboxAnnotationAnalysis",
  initialState: {
    ...initialTableState,
  },
  reducers: {
    ...tableReducer,
  },
  extraReducers: (builder) => {
    builder
      .addCase(ProjectActions.changeProject, (state) => {
        console.log("Project changed! Resetting 'bboxAnnotationAnalysis' state.");
        resetProjectTableState(state);
      })
      .addCase(BBoxFilterActions.init, (state, action) => {
        state.columnVisibilityModel = Object.values(action.payload.columnInfoMap).reduce(
          (acc, column) => {
            if (!column.column) return acc;
            // this is a normal column
            if (isNaN(parseInt(column.column))) {
              return acc;
              // this is a metadata column
            } else {
              return {
                ...acc,
                [column.column]: false,
              };
            }
          },
          {
            [BBoxColumns.BB_MEMO_CONTENT]: false,
          },
        );
      })
      .addDefaultCase(() => {});
  },
});

export const BBoxAnnotationsActions = BBoxAnnotationsSlice.actions;
export const bboxAnnotationAnalysisReducer = { [BBoxAnnotationsSlice.name]: BBoxAnnotationsSlice.reducer };
