import { MemoFilterActions } from "@core/memo";
import { createSlice } from "@reduxjs/toolkit";
import { initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";

const logbookSlice = createSlice({
  name: "logbook",
  initialState: {
    ...initialTableState,
  },
  reducers: {
    ...tableReducer,
  },
  extraReducers(builder) {
    builder
      .addCase(ProjectActions.changeProject, (state) => {
        console.log("Project changed! Resetting 'logbook' state.");
        resetProjectTableState(state);
      })
      .addCase(MemoFilterActions.init, (state, action) => {
        state.columnVisibilityModel = Object.values(action.payload.columnInfoMap).reduce((acc, column) => {
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
        }, {});
      })
      .addDefaultCase(() => {});
  },
});

export const LogbookActions = logbookSlice.actions;
export const logbookReducer = { [logbookSlice.name]: logbookSlice.reducer };
