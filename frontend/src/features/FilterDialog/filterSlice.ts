import { createSlice, Draft, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import {
  DBColumns,
  DocType,
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
  column2operator,
  deleteInFilter,
  FilterOperator,
  FilterOperatorType,
  findInFilter,
  getDefaultOperator,
  isFilter,
  isFilterExpression,
  metaType2operator,
  MyFilter,
  MyFilterExpression,
} from "./filterUtils";

export interface FilterState {
  filter: Record<string, MyFilter>;
  editableFilter: MyFilter;
  defaultFilterExpression: FilterExpression;
  columns: { label: string; value: string }[];
  columnValue2Operator: Record<string, FilterOperatorType>;
  projectMetadata: ProjectMetadataRead[];
  metadataModalities: DocType[];
}

const filterReducer = {
  onStartFilterEdit: (state: Draft<FilterState>, action: PayloadAction<{ rootFilterId: string }>) => {
    state.editableFilter = state.filter[action.payload.rootFilterId];
  },
  onFinishFilterEdit: (state: Draft<FilterState>) => {
    state.filter = {
      ...state.filter,
      [state.editableFilter.id]: state.editableFilter,
    };
    state.editableFilter = {
      id: "root",
      logic_operator: LogicalOperator.AND,
      items: [],
    };
  },
  addRootFilter: (state: Draft<FilterState>, action: PayloadAction<{ rootFilterId: string }>) => {
    state.filter[action.payload.rootFilterId] = {
      id: action.payload.rootFilterId,
      items: [],
      logic_operator: LogicalOperator.AND,
    };
  },
  deleteRootFilter: (state: Draft<FilterState>, action: PayloadAction<{ rootFilterId: string }>) => {
    delete state.filter[action.payload.rootFilterId];
  },
  addDefaultFilter: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string }>) => {
    // const newFilter = JSON.parse(JSON.stringify(filter)) as MyFilter;
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
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
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
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
  addKeywordFilterExpression: (
    state: Draft<FilterState>,
    action: PayloadAction<{ keyword: string; rootFilterId?: string }>,
  ) => {
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

    state.filter[action.payload.rootFilterId || "root"].items = [
      ...state.filter[action.payload.rootFilterId || "root"].items,
      {
        id: uuidv4(),
        logic_operator: LogicalOperator.OR,
        items: filterItems,
      },
    ];
  },
  addTagFilterExpression: (
    state: Draft<FilterState>,
    action: PayloadAction<{ tagId: number | string; rootFilterId?: string }>,
  ) => {
    state.filter[action.payload.rootFilterId || "root"].items = [
      ...state.filter[action.payload.rootFilterId || "root"].items,
      {
        id: uuidv4(),
        column: DBColumns.DOCUMENT_TAG_ID_LIST,
        operator: IDListOperator.ID_LIST_CONTAINS,
        value: action.payload.tagId,
      },
    ];
  },
  addFilenameFilterExpression: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filename: string; rootFilterId?: string }>,
  ) => {
    state.filter[action.payload.rootFilterId || "root"].items = [
      ...state.filter[action.payload.rootFilterId || "root"].items,
      {
        id: uuidv4(),
        column: DBColumns.SOURCE_DOCUMENT_FILENAME,
        operator: StringOperator.STRING_CONTAINS,
        value: action.payload.filename,
      },
    ];
  },
  addContentFilterExpression: (
    state: Draft<FilterState>,
    action: PayloadAction<{ text: string; rootFilterId?: string }>,
  ) => {
    state.filter[action.payload.rootFilterId || "root"].items = [
      ...state.filter[action.payload.rootFilterId || "root"].items,
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
    action: PayloadAction<{ codeId: number; spanText: string; rootFilterId?: string }>,
  ) => {
    state.filter[action.payload.rootFilterId || "root"].items = [
      ...state.filter[action.payload.rootFilterId || "root"].items,
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
    action: PayloadAction<{ metadata: SourceDocumentMetadataReadResolved; rootFilterId?: string }>,
  ) => {
    // the column value of a metadata filter is the project_metadata.id
    const operatorType = state.columnValue2Operator[action.payload.metadata.project_metadata.id.toString()];

    state.filter[action.payload.rootFilterId || "root"].items = [
      ...state.filter[action.payload.rootFilterId || "root"].items,
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
    state.editableFilter = deleteInFilter(state.editableFilter, action.payload.filterId);
  },
  changeLogicalOperator: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; operator: LogicalOperator }>,
  ) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilter(filterItem)) {
      filterItem.logic_operator = action.payload.operator;
    }
  },
  changeColumn: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string; columnValue: string }>) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
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
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilterExpression(filterItem)) {
      filterItem.operator = action.payload.operator;
    }
  },
  changeValue: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string; value: any }>) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
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
  resetEditFilter: (state: Draft<FilterState>) => {
    state.editableFilter = {
      id: state.editableFilter.id,
      logic_operator: LogicalOperator.AND,
      items: [],
    };
  },
  resetFilter: (state: Draft<FilterState>, action: PayloadAction<{ rootFilterId?: string }>) => {
    state.filter[action.payload.rootFilterId || "root"] = {
      id: action.payload.rootFilterId || "root",
      logic_operator: LogicalOperator.AND,
      items: [],
    };
  },
  init: (state: Draft<FilterState>, action: PayloadAction<{ projectMetadata: ProjectMetadataRead[] }>) => {
    // 1. set project metadata
    state.projectMetadata = action.payload.projectMetadata;

    // 2. compute & set columns (the provided columns + metadata columns if metadata in the provided column)
    if (state.columns.map((column) => column.value).includes(DBColumns.METADATA)) {
      // remove metadata column
      state.columns = state.columns.filter((column) => column.value !== DBColumns.METADATA);
      // add project metadata columns (filtered by metadataModalities)
      state.projectMetadata
        .filter((metadata) => state.metadataModalities.includes(metadata.doctype))
        .forEach((metadata) => {
          state.columns.push({ label: `${metadata.doctype}-${metadata.key}`, value: metadata.id.toString() });
        });
    }

    // 3. compute & set column value 2 operator map (the default column2operator + operator based on metadata type)
    state.columnValue2Operator = state.projectMetadata.reduce(
      (acc, metadata) => {
        acc[`${metadata.id}`] = metaType2operator[metadata.metatype];
        return acc;
      },
      { ...(column2operator as Record<string, FilterOperatorType>) },
    );
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
      column: DBColumns.SOURCE_DOCUMENT_FILENAME,
      operator: StringOperator.STRING_CONTAINS,
      value: "",
    },
    columns: [
      { label: "Document name", value: DBColumns.SOURCE_DOCUMENT_FILENAME },
      { label: "Document content", value: DBColumns.SOURCE_DOCUMENT_CONTENT },
      { label: "Tags", value: DBColumns.DOCUMENT_TAG_ID_LIST },
      { label: "User", value: DBColumns.USER_ID_LIST },
      { label: "Code", value: DBColumns.CODE_ID_LIST },
      { label: "Span Annotation", value: DBColumns.SPAN_ANNOTATIONS },
      { label: "Metadata", value: DBColumns.METADATA },
    ],
    columnValue2Operator: {},
    projectMetadata: [],
    metadataModalities: [DocType.TEXT, DocType.IMAGE, DocType.AUDIO, DocType.VIDEO],
  },
});

export const annotatedSegmentsFilterSlice = createFilterSlice({
  name: "annotatedSegmentsFilter",
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
      column: DBColumns.SOURCE_DOCUMENT_FILENAME,
      operator: StringOperator.STRING_CONTAINS,
      value: "",
    },
    columns: [
      { label: "Document name", value: DBColumns.SOURCE_DOCUMENT_FILENAME },
      { label: "Tags", value: DBColumns.DOCUMENT_TAG_ID_LIST },
      { label: "Code", value: DBColumns.CODE_ID },
      { label: "Annotated text", value: DBColumns.SPAN_TEXT },
      { label: "Memo content", value: DBColumns.MEMO_CONTENT },
      { label: "Metadata", value: DBColumns.METADATA },
    ],
    columnValue2Operator: {},
    projectMetadata: [],
    metadataModalities: [DocType.TEXT],
  },
});

export const timelineAnalysisFilterSlice = createFilterSlice({
  name: "timelineAnalysisFilter",
  initialState: {
    filter: {},
    editableFilter: {
      id: "root",
      logic_operator: LogicalOperator.AND,
      items: [],
    },
    defaultFilterExpression: {
      column: DBColumns.SOURCE_DOCUMENT_FILENAME,
      operator: StringOperator.STRING_CONTAINS,
      value: "",
    },
    columns: [
      { label: "Document name", value: DBColumns.SOURCE_DOCUMENT_FILENAME },
      { label: "Document content", value: DBColumns.SOURCE_DOCUMENT_CONTENT },
      { label: "Tags", value: DBColumns.DOCUMENT_TAG_ID_LIST },
      { label: "User", value: DBColumns.USER_ID_LIST },
      { label: "Code", value: DBColumns.CODE_ID_LIST },
      { label: "Span Annotation", value: DBColumns.SPAN_ANNOTATIONS },
      { label: "Metadata", value: DBColumns.METADATA },
    ],
    columnValue2Operator: {},
    projectMetadata: [],
    metadataModalities: [DocType.TEXT],
  },
});
