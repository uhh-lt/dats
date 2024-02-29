import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";

import { IDListOperator } from "../../api/openapi/models/IDListOperator.ts";
import { ListOperator } from "../../api/openapi/models/ListOperator.ts";
import { LogicalOperator } from "../../api/openapi/models/LogicalOperator.ts";
import { SearchColumns } from "../../api/openapi/models/SearchColumns.ts";
import { SourceDocumentMetadataReadResolved } from "../../api/openapi/models/SourceDocumentMetadataReadResolved.ts";
import { StringOperator } from "../../api/openapi/models/StringOperator.ts";
import { FilterState, filterReducer } from "../../features/FilterDialog/filterSlice.ts";
import {
  MyFilterExpression,
  filterOperator2FilterOperatorType,
  getDefaultOperator,
} from "../../features/FilterDialog/filterUtils.ts";
import { getValue } from "../../views/search/DocumentViewer/DocumentMetadata/metadataUtils.ts";
import { SearchActions } from "../../views/search/searchSlice.ts";

const initialState: FilterState = {
  filter: {
    root: {
      id: "root",
      logic_operator: LogicalOperator.AND,
      items: [],
    },
  },
  editableFilter: {
    id: "root",
    logic_operator: LogicalOperator.AND,
    items: [],
  },
  defaultFilterExpression: {
    id: uuidv4(),
    column: SearchColumns.SC_SOURCE_DOCUMENT_FILENAME,
    operator: StringOperator.STRING_CONTAINS,
    value: "",
  },
  column2Info: {},
  expertMode: false,
};

const searchFilterSlice = createSlice({
  name: "searchFilter",
  initialState: initialState,
  reducers: {
    ...filterReducer,
    // filtering
    onAddKeywordFilter: (state, action: PayloadAction<{ keywordMetadataIds: number[]; keyword: string }>) => {
      const filterItems: MyFilterExpression[] = action.payload.keywordMetadataIds?.map((keywordMetadataId) => {
        return {
          id: uuidv4(),
          column: keywordMetadataId,
          operator: ListOperator.LIST_CONTAINS,
          value: [action.payload.keyword],
        };
      });

      state.filter["root"].items = [
        ...state.filter["root"].items,
        {
          id: uuidv4(),
          logic_operator: LogicalOperator.OR,
          items: filterItems,
        },
      ];
    },
    onAddTagFilter: (state, action: PayloadAction<{ tagId: number | string }>) => {
      state.filter["root"].items = [
        ...state.filter["root"].items,
        {
          id: uuidv4(),
          column: SearchColumns.SC_DOCUMENT_TAG_ID_LIST,
          operator: IDListOperator.ID_LIST_CONTAINS,
          value: action.payload.tagId,
        },
      ];
    },
    onAddFilenameFilter: (state, action: PayloadAction<{ filename: string }>) => {
      state.filter["root"].items = [
        ...state.filter["root"].items,
        {
          id: uuidv4(),
          column: SearchColumns.SC_SOURCE_DOCUMENT_FILENAME,
          operator: StringOperator.STRING_CONTAINS,
          value: action.payload.filename,
        },
      ];
    },
    onAddSpanAnnotationFilter: (state, action: PayloadAction<{ codeId: number; spanText: string }>) => {
      state.filter["root"].items = [
        ...state.filter["root"].items,
        {
          id: uuidv4(),
          column: SearchColumns.SC_SPAN_ANNOTATIONS,
          operator: ListOperator.LIST_CONTAINS,
          value: [action.payload.codeId.toString(), action.payload.spanText],
        },
      ];
    },
    onAddMetadataFilter: (state, action: PayloadAction<{ metadata: SourceDocumentMetadataReadResolved }>) => {
      // the column of a metadata filter is the project_metadata.id
      const filterOperator = state.column2Info[action.payload.metadata.project_metadata.id.toString()].operator;
      const filterOperatorType = filterOperator2FilterOperatorType[filterOperator];

      state.filter["root"].items = [
        ...state.filter["root"].items,
        {
          id: uuidv4(),
          column: action.payload.metadata.project_metadata.id,
          operator: getDefaultOperator(filterOperatorType),
          value: getValue(action.payload.metadata)!,
        },
      ];
    },
    onTest: (state) => {
      console.log(state);
    },
  },
  extraReducers(builder) {
    builder.addCase(SearchActions.onClearSearch, (state) => {
      state.filter["root"] = {
        id: "root",
        logic_operator: LogicalOperator.AND,
        items: [],
      };
    });
  },
});

export const SearchFilterActions = searchFilterSlice.actions;

export default searchFilterSlice.reducer;
