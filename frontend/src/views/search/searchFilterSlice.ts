import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";

import { IDListOperator } from "../../api/openapi/models/IDListOperator.ts";
import { ListOperator } from "../../api/openapi/models/ListOperator.ts";
import { LogicalOperator } from "../../api/openapi/models/LogicalOperator.ts";
import { SearchColumns } from "../../api/openapi/models/SearchColumns.ts";
import { SourceDocumentMetadataReadResolved } from "../../api/openapi/models/SourceDocumentMetadataReadResolved.ts";
import { StringOperator } from "../../api/openapi/models/StringOperator.ts";
import { QueryKey } from "../../api/QueryKey.ts";
import {
  createInitialFilterState,
  filterReducer,
  getOrCreateFilter,
  resetProjectFilterState,
} from "../../components/FilterDialog/filterSlice.ts";
import {
  MyFilterExpression,
  filterOperator2FilterOperatorType,
  getDefaultOperator,
} from "../../components/FilterDialog/filterUtils.ts";
import { ProjectActions } from "../../components/Project/projectSlice.ts";
import queryClient from "../../plugins/ReactQueryClient.ts";
import { getValue } from "./metadataUtils.ts";

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: SearchColumns.SC_SOURCE_DOCUMENT_FILENAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState = createInitialFilterState(defaultFilterExpression);

const searchFilterSlice = createSlice({
  name: "searchFilter",
  initialState: initialState,
  reducers: {
    ...filterReducer,
    // filtering
    onAddKeywordFilter: (
      state,
      action: PayloadAction<{ keywordMetadataIds: number[]; keyword: string; filterName: string }>,
    ) => {
      const filterItems: MyFilterExpression[] = action.payload.keywordMetadataIds?.map((keywordMetadataId) => {
        return {
          id: uuidv4(),
          column: keywordMetadataId,
          operator: ListOperator.LIST_CONTAINS,
          value: [action.payload.keyword],
        };
      });

      const currentFilter = getOrCreateFilter(state, action.payload.filterName);
      currentFilter.items = [
        ...currentFilter.items,
        {
          id: uuidv4(),
          logic_operator: LogicalOperator.OR,
          items: filterItems,
        },
      ];
    },
    onAddTagFilter: (state, action: PayloadAction<{ tagId: number | string; filterName: string }>) => {
      const currentFilter = getOrCreateFilter(state, action.payload.filterName);
      currentFilter.items = [
        ...currentFilter.items,
        {
          id: uuidv4(),
          column: SearchColumns.SC_DOCUMENT_TAG_ID_LIST,
          operator: IDListOperator.ID_LIST_CONTAINS,
          value: action.payload.tagId,
        },
      ];
    },
    onAddSpanAnnotationFilter: (
      state,
      action: PayloadAction<{ codeId: number; spanText: string; filterName: string }>,
    ) => {
      const currentFilter = getOrCreateFilter(state, action.payload.filterName);
      currentFilter.items = [
        ...currentFilter.items,
        {
          id: uuidv4(),
          column: SearchColumns.SC_SPAN_ANNOTATIONS,
          operator: ListOperator.LIST_CONTAINS,
          value: [action.payload.codeId.toString(), action.payload.spanText],
        },
      ];
    },
    onAddMetadataFilter: (
      state,
      action: PayloadAction<{ metadata: SourceDocumentMetadataReadResolved; filterName: string }>,
    ) => {
      // the column of a metadata filter is the project_metadata.id
      const filterOperator = state.column2Info[action.payload.metadata.project_metadata.id.toString()].operator;
      const filterOperatorType = filterOperator2FilterOperatorType[filterOperator];

      const currentFilter = getOrCreateFilter(state, action.payload.filterName);
      currentFilter.items = [
        ...currentFilter.items,
        {
          id: uuidv4(),
          column: action.payload.metadata.project_metadata.id,
          operator: getDefaultOperator(filterOperatorType),
          value: getValue(action.payload.metadata)!,
        },
      ];
    },
  },
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state, action) => {
      console.log("Project changed! Resetting 'searchFilter' state.");
      resetProjectFilterState(state, defaultFilterExpression);
      queryClient.removeQueries({ queryKey: [QueryKey.TABLE_INFO, "search", action.payload] });
    });
  },
});

export const SearchFilterActions = searchFilterSlice.actions;

export default searchFilterSlice.reducer;
