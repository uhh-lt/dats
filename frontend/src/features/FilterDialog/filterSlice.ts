import { createSlice, Draft, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import {
  DBColumns,
  FilterExpression,
  IDListOperator,
  ListOperator,
  LogicalOperator,
  ProjectMetadataRead,
  SourceDocumentMetadataReadResolved,
  StringOperator,
} from "../../api/openapi";
import { getValue } from "../../views/search/DocumentViewer/DocumentMetadata/metadataUtils";
import {
  deleteInFilter,
  FilterOperator,
  FilterOperatorType,
  findInFilter,
  getDefaultOperator,
  isFilter,
  isFilterExpression,
  MyFilter,
  MyFilterExpression,
} from "./filterUtils";

export interface FilterState {
  filter: MyFilter;
  defaultFilterExpression: FilterExpression;
  columns: { label: string; value: string }[];
  columnValue2Operator: Record<string, FilterOperatorType>;
  projectMetadata: ProjectMetadataRead[];
}

const filterReducer = {
  addDefaultFilter: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string }>) => {
    // const newFilter = JSON.parse(JSON.stringify(filter)) as MyFilter;
    const filterItem = findInFilter(state.filter, action.payload.filterId);
    if (filterItem && isFilter(filterItem)) {
      filterItem.items = [
        {
          id: `${Date.now()}`,
          items: [],
          logic_operator: LogicalOperator.AND,
        } as MyFilter,
        ...filterItem.items,
      ];
    }
  },
  addDefaultFilterExpression: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string }>) => {
    // const newFilter = JSON.parse(JSON.stringify(filter)) as MyFilter;
    const filterItem = findInFilter(state.filter, action.payload.filterId);
    if (filterItem && isFilter(filterItem)) {
      filterItem.items = [
        {
          id: `${Date.now()}`,
          ...state.defaultFilterExpression,
        } as MyFilterExpression,
        ...filterItem.items,
      ];
    }
  },
  addKeywordFilterExpression: (state: Draft<FilterState>, action: PayloadAction<{ keyword: string }>) => {
    const keywordProjectMetadatas = state.projectMetadata.filter((metadata) => metadata.key === "keywords");

    const filterItems: MyFilterExpression[] = keywordProjectMetadatas?.map((projectMetadata) => {
      return {
        id: uuidv4(),
        column: DBColumns.METADATA,
        project_metadata_id: projectMetadata.id,
        operator: ListOperator.LIST_CONTAINS,
        value: [action.payload.keyword],
      };
    });

    state.filter.items = [
      ...state.filter.items,
      {
        id: uuidv4(),
        logic_operator: LogicalOperator.OR,
        items: filterItems,
      },
    ];
  },
  addTagFilterExpression: (state: Draft<FilterState>, action: PayloadAction<{ tagId: number | string }>) => {
    state.filter.items = [
      ...state.filter.items,
      {
        id: uuidv4(),
        column: DBColumns.DOCUMENT_TAG_ID_LIST,
        operator: IDListOperator.ID_LIST_CONTAINS,
        value: action.payload.tagId,
      },
    ];
  },
  addFilenameFilterExpression: (state: Draft<FilterState>, action: PayloadAction<{ filename: string }>) => {
    state.filter.items = [
      ...state.filter.items,
      {
        id: uuidv4(),
        column: DBColumns.SOURCE_DOCUMENT_FILENAME,
        operator: StringOperator.STRING_CONTAINS,
        value: action.payload.filename,
      },
    ];
  },
  addContentFilterExpression: (state: Draft<FilterState>, action: PayloadAction<{ text: string }>) => {
    state.filter.items = [
      ...state.filter.items,
      {
        id: uuidv4(),
        column: DBColumns.SOURCE_DOCUMENT_CONTENT,
        operator: StringOperator.STRING_CONTAINS,
        value: action.payload.text,
      },
    ];
  },
  addSpanAnnotationFilterExpression: (
    state: Draft<FilterState>,
    action: PayloadAction<{ codeId: number; spanText: string }>,
  ) => {
    state.filter.items = [
      ...state.filter.items,
      {
        id: uuidv4(),
        column: DBColumns.SPAN_ANNOTATIONS,
        operator: ListOperator.LIST_CONTAINS,
        value: [[action.payload.codeId.toString(), action.payload.spanText]],
      },
    ];
  },
  addMetadataFilterExpression: (
    state: Draft<FilterState>,
    action: PayloadAction<{ metadata: SourceDocumentMetadataReadResolved }>,
  ) => {
    // the column value of a metadata filter is the project_metadata.id
    const operatorType = state.columnValue2Operator[action.payload.metadata.project_metadata.id.toString()];

    state.filter.items = [
      ...state.filter.items,
      {
        id: uuidv4(),
        column: DBColumns.METADATA,
        project_metadata_id: action.payload.metadata.project_metadata.id,
        operator: getDefaultOperator(operatorType),
        value: getValue(action.payload.metadata)!,
      },
    ];
  },
  deleteFilter: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string }>) => {
    state.filter = deleteInFilter(state.filter, action.payload.filterId);
  },
  changeLogicalOperator: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; operator: LogicalOperator }>,
  ) => {
    const filterItem = findInFilter(state.filter, action.payload.filterId);
    if (filterItem && isFilter(filterItem)) {
      filterItem.logic_operator = action.payload.operator;
    }
  },
  changeColumn: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string; columnValue: string }>) => {
    const filterItem = findInFilter(state.filter, action.payload.filterId);
    if (filterItem && isFilterExpression(filterItem)) {
      if (Object.values<string>(DBColumns).includes(action.payload.columnValue)) {
        // it is a DBColumn
        filterItem.column = action.payload.columnValue as DBColumns;
      } else {
        // it is a Metadata column
        filterItem.column = DBColumns.METADATA;
        filterItem.project_metadata_id = parseInt(action.payload.columnValue);
      }
      filterItem.operator = getDefaultOperator(state.columnValue2Operator[action.payload.columnValue]);
      filterItem.value = "";
    }
  },
  changeOperator: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; operator: FilterOperator }>,
  ) => {
    const filterItem = findInFilter(state.filter, action.payload.filterId);
    if (filterItem && isFilterExpression(filterItem)) {
      filterItem.operator = action.payload.operator;
    }
  },
  changeValue: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string; value: any }>) => {
    const filterItem = findInFilter(state.filter, action.payload.filterId);
    if (filterItem && isFilterExpression(filterItem)) {
      filterItem.value = action.payload.value;
    }
  },
  setDefaultFilterExpression: (
    state: Draft<FilterState>,
    action: PayloadAction<{ defaultFilterExpression: FilterExpression }>,
  ) => {
    state.defaultFilterExpression = action.payload.defaultFilterExpression;
  },
  setColumns: (state: Draft<FilterState>, action: PayloadAction<{ columns: { label: string; value: string }[] }>) => {
    state.columns = action.payload.columns;
  },
  setColumnValue2Operator: (
    state: Draft<FilterState>,
    action: PayloadAction<{ columnValue2Operator: Record<string, FilterOperatorType> }>,
  ) => {
    state.columnValue2Operator = action.payload.columnValue2Operator;
  },
  setProjectMetadata: (
    state: Draft<FilterState>,
    action: PayloadAction<{ projectMetadata: ProjectMetadataRead[] }>,
  ) => {
    state.projectMetadata = action.payload.projectMetadata;
  },
  resetFilter: (state: Draft<FilterState>) => {
    state.filter = {
      id: "root",
      logic_operator: LogicalOperator.AND,
      items: [],
    };
  },
};

export type FilterReducer = typeof filterReducer;

const createFilterSlice = ({ name, initialState }: { name: string; initialState: FilterState }) =>
  createSlice({
    name,
    initialState,
    reducers: filterReducer,
  });

export const searchFilterSlice = createFilterSlice({
  name: "searchFilter",
  initialState: {
    filter: {
      id: "root",
      logic_operator: LogicalOperator.AND,
      items: [],
    },
    defaultFilterExpression: {
      column: DBColumns.SOURCE_DOCUMENT_FILENAME,
      operator: StringOperator.STRING_CONTAINS,
      value: "",
    },
    columns: [],
    columnValue2Operator: {},
    projectMetadata: [],
  },
});

export const annotatedSegmentsFilterSlice = createFilterSlice({
  name: "annotatedSegments",
  initialState: {
    filter: {
      id: "root",
      logic_operator: LogicalOperator.AND,
      items: [],
    },
    defaultFilterExpression: {
      column: DBColumns.SOURCE_DOCUMENT_FILENAME,
      operator: StringOperator.STRING_CONTAINS,
      value: "",
    },
    columns: [],
    columnValue2Operator: {},
    projectMetadata: [],
  },
});
