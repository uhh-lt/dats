import { v4 as uuidv4 } from "uuid";
import { IDListOperator, ListOperator, LogicalOperator, SearchColumns, StringOperator } from "../../api/openapi";
import { getValue } from "../../views/search/DocumentViewer/DocumentMetadata/metadataUtils";
import { SearchActions } from "../../views/search/searchSlice";
import { createFilterSlice } from "../../features/FilterDialog/filterSlice";
import {
  MyFilterExpression,
  filterOperator2FilterOperatorType,
  getDefaultOperator,
} from "../../features/FilterDialog/filterUtils";

const searchFilterSlice = createFilterSlice({
  name: "searchFilter",
  initialState: {
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
  },
  extraReducer(builder) {
    builder
      .addCase(SearchActions.onClearSearch, (state, action) => {
        state.filter["root"] = {
          id: "root",
          logic_operator: LogicalOperator.AND,
          items: [],
        };
      })
      .addCase(SearchActions.onAddKeywordFilter, (state, action) => {
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
      })
      .addCase(SearchActions.onAddTagFilter, (state, action) => {
        state.filter["root"].items = [
          ...state.filter["root"].items,
          {
            id: uuidv4(),
            column: SearchColumns.SC_DOCUMENT_TAG_ID_LIST,
            operator: IDListOperator.ID_LIST_CONTAINS,
            value: action.payload.tagId,
          },
        ];
      })
      .addCase(SearchActions.onAddFilenameFilter, (state, action) => {
        state.filter["root"].items = [
          ...state.filter["root"].items,
          {
            id: uuidv4(),
            column: SearchColumns.SC_SOURCE_DOCUMENT_FILENAME,
            operator: StringOperator.STRING_CONTAINS,
            value: action.payload.filename,
          },
        ];
      })
      .addCase(SearchActions.onAddSpanAnnotationFilter, (state, action) => {
        state.filter["root"].items = [
          ...state.filter["root"].items,
          {
            id: uuidv4(),
            column: SearchColumns.SC_SPAN_ANNOTATIONS,
            operator: ListOperator.LIST_CONTAINS,
            value: [action.payload.codeId.toString(), action.payload.spanText],
          },
        ];
      })
      .addCase(SearchActions.onAddMetadataFilter, (state, action) => {
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
      });
  },
});

export const SearchFilterActions = searchFilterSlice.actions;

export default searchFilterSlice.reducer;
