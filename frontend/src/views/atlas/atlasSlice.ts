import { createSlice, Draft, PayloadAction } from "@reduxjs/toolkit";
import * as d3 from "d3";
import { v4 as uuidv4 } from "uuid";
import { IDListOperator } from "../../api/openapi/models/IDListOperator.ts";
import { ListOperator } from "../../api/openapi/models/ListOperator.ts";
import { LogicalOperator } from "../../api/openapi/models/LogicalOperator.ts";
import { ProjectMetadataRead } from "../../api/openapi/models/ProjectMetadataRead.ts";
import { SdocColumns } from "../../api/openapi/models/SdocColumns.ts";
import { SourceDocumentMetadataRead } from "../../api/openapi/models/SourceDocumentMetadataRead.ts";
import { StringOperator } from "../../api/openapi/models/StringOperator.ts";
import {
  createInitialFilterState,
  filterReducer,
  FilterState,
  getOrCreateFilter,
  resetProjectFilterState,
} from "../../components/FilterDialog/filterSlice.ts";
import {
  filterOperator2FilterOperatorType,
  getDefaultOperator,
  MyFilterExpression,
} from "../../components/FilterDialog/filterUtils.ts";
import { ProjectActions } from "../../components/Project/projectSlice.ts";
import { getValue } from "../search/metadataUtils.ts";

export interface AtlasState {
  lastMapId: number | undefined;
  selectedSdocIds: number[];
  selectedSdocIdsIndex: number;
  // view settings
  colorBy: string;
  colorSchemeName: string;
  colorScheme: string[];
  pointSize: number;
  showLabels: boolean;
  // position settings
  xAxis: string;
  yAxis: string;
  showTicks: boolean;
  showGrid: boolean;
  // highlighting
  highlightedTopicId: number | undefined;
  highlightReviewedDocs: boolean;
  // search state
  searchQuery: string; // This can be used to store the search query if needed
  // statistics
  pinnedStatistics: string[]; // "keywords", "tags", "<codeId>", etc.
}

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: SdocColumns.SD_SOURCE_DOCUMENT_FILENAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState: AtlasState & FilterState = {
  ...createInitialFilterState(defaultFilterExpression),
  lastMapId: undefined,
  selectedSdocIds: [],
  selectedSdocIdsIndex: 0,
  // view settings
  colorBy: "topic-broad",
  colorSchemeName: "category",
  colorScheme: d3.schemeCategory10 as string[],
  pointSize: 10,
  showLabels: true,
  // position settings
  xAxis: "Topic Dimension 1",
  yAxis: "Topic Dimension 2",
  showTicks: false,
  showGrid: true,
  // highlighting
  highlightedTopicId: undefined,
  highlightReviewedDocs: false,
  // search state
  searchQuery: "",
  // statistics
  pinnedStatistics: ["keywords", "tags"],
};

const resetAtlasState = (state: Draft<AtlasState>) => {
  state.lastMapId = initialState.lastMapId;
  state.highlightedTopicId = initialState.highlightedTopicId;
  state.selectedSdocIds = initialState.selectedSdocIds;
};

export const atlasSlice = createSlice({
  name: "atlas",
  initialState,
  reducers: {
    ...filterReducer,
    // selection
    onSelectionChange: (state, action: PayloadAction<number[]>) => {
      state.selectedSdocIds = action.payload.slice();
    },
    onResetSelection: (state) => {
      if (state.selectedSdocIds.length > 0) {
        state.selectedSdocIds = [];
      }
    },
    // navigate through the selection
    onSelectionIndexChange: (state, action: PayloadAction<number>) => {
      state.selectedSdocIdsIndex = action.payload;
    },
    onScatterPlotDotClick: (state, action: PayloadAction<number>) => {
      const index = state.selectedSdocIds.indexOf(action.payload);
      if (index !== -1) {
        // If the ID is already selected, remove it from the selection
        state.selectedSdocIds.splice(index, 1);
      } else {
        // If the ID is not selected, add it to the selection
        state.selectedSdocIds.push(action.payload);
      }
    },
    onOpenMap: (state, action: PayloadAction<{ projectId: number; aspectId: number }>) => {
      if (state.lastMapId !== action.payload.aspectId) {
        console.log("Atlas changed! Resetting 'atlas' state.");
        resetAtlasState(state);
        // create empty filter for the new map
        state.filter[`aspect-${action.payload.aspectId}`] = {
          id: `aspect-${action.payload.aspectId}`,
          logic_operator: LogicalOperator.AND,
          items: [],
        };
        state.lastMapId = action.payload.aspectId;
      }
    },
    // View settings
    onChangeColorBy: (state, action: PayloadAction<string>) => {
      state.colorBy = action.payload;
    },
    onChangeColorScheme: (state, action: PayloadAction<{ colorSchemeName: string; colorScheme: string[] }>) => {
      state.colorSchemeName = action.payload.colorSchemeName;
      state.colorScheme = action.payload.colorScheme;
    },
    onChangePointSize: (state, action: PayloadAction<number>) => {
      state.pointSize = action.payload;
    },
    onChangeShowLabels: (state, action: PayloadAction<boolean>) => {
      state.showLabels = action.payload;
    },
    // Position settings
    onChangeXAxis: (state, action: PayloadAction<string>) => {
      state.xAxis = action.payload;
    },
    onChangeYAxis: (state, action: PayloadAction<string>) => {
      state.yAxis = action.payload;
    },
    onChangeShowTicks: (state, action: PayloadAction<boolean>) => {
      state.showTicks = action.payload;
    },
    onChangeShowGrid: (state, action: PayloadAction<boolean>) => {
      state.showGrid = action.payload;
    },
    // Highlighting
    onSelectTopic: (state, action: PayloadAction<number>) => {
      if (state.highlightedTopicId === action.payload) {
        state.highlightedTopicId = undefined;
        return;
      }
      state.highlightedTopicId = action.payload;
      // only one highlight at a time
      if (state.highlightedTopicId) {
        state.highlightReviewedDocs = false;
      }
    },
    onChangeHighlightReviewedDocs: (state, action: PayloadAction<boolean>) => {
      state.highlightReviewedDocs = action.payload;
      // only one highlight at a time
      if (state.highlightReviewedDocs) {
        state.highlightedTopicId = undefined;
      }
    },
    // Search state
    onChangeSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
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
      console.log(currentFilter);
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
          column: SdocColumns.SD_DOCUMENT_TAG_ID_LIST,
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
          column: SdocColumns.SD_SPAN_ANNOTATIONS,
          operator: ListOperator.LIST_CONTAINS,
          value: [action.payload.codeId.toString(), action.payload.spanText],
        },
      ];
    },
    onAddMetadataFilter: (
      state,
      action: PayloadAction<{
        metadata: SourceDocumentMetadataRead;
        projectMetadata: ProjectMetadataRead;
        filterName: string;
      }>,
    ) => {
      // the column of a metadata filter is the project_metadata_id
      const filterOperator = state.column2Info[action.payload.metadata.project_metadata_id.toString()].operator;
      const filterOperatorType = filterOperator2FilterOperatorType[filterOperator];

      const currentFilter = getOrCreateFilter(state, action.payload.filterName);
      currentFilter.items = [
        ...currentFilter.items,
        {
          id: uuidv4(),
          column: action.payload.metadata.project_metadata_id,
          operator: getDefaultOperator(filterOperatorType),
          value: getValue(action.payload.metadata, action.payload.projectMetadata)!,
        },
      ];
    },
    // statistics
    onPinStatistics: (state, action: PayloadAction<string>) => {
      if (!state.pinnedStatistics.includes(action.payload)) {
        state.pinnedStatistics.push(action.payload);
      }
    },
    onUnpinStatistics: (state, action: PayloadAction<string>) => {
      state.pinnedStatistics = state.pinnedStatistics.filter((stat) => stat !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(ProjectActions.changeProject, (state, action) => {
        console.log("Project changed! Resetting 'atlas' state.");
        resetAtlasState(state);
        resetProjectFilterState({ state, defaultFilterExpression, projectId: action.payload, sliceName: "atlas" });
      })
      .addMatcher(
        (action) =>
          (action.type.startsWith("atlas/onAdd") && action.type.toLowerCase().includes("filter")) || // add filter
          (action.type.startsWith("atlas/") && action.type.includes("onFinishFilterEdit")), // edit filter
        (state) => {
          console.log("Atlas search filters changed! Resetting search parameter dependent variables.");
          // reset variables that depend on search parameters
          state.selectedSdocIds = [];
        },
      );
  },
});

export const AtlasActions = atlasSlice.actions;

export default atlasSlice.reducer;
