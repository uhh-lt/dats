import { createSlice, Draft, PayloadAction } from "@reduxjs/toolkit";
import * as d3 from "d3";
import { v4 as uuidv4 } from "uuid";
import { ChatSessionResponse } from "../../api/openapi/models/ChatSessionResponse.ts";
import { IDListOperator } from "../../api/openapi/models/IDListOperator.ts";
import { ListOperator } from "../../api/openapi/models/ListOperator.ts";
import { LogicalOperator } from "../../api/openapi/models/LogicalOperator.ts";
import { ProjectMetadataRead } from "../../api/openapi/models/ProjectMetadataRead.ts";
import { SdocColumns } from "../../api/openapi/models/SdocColumns.ts";
import { SourceDocumentMetadataUpdate } from "../../api/openapi/models/SourceDocumentMetadataUpdate.ts";
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
import { ProjectActions } from "../../core/project/projectSlice.ts";
import { getValue } from "../search/metadataUtils.ts";

interface ChatMessage {
  id: string;
  message: string;
  speaker: "user" | "agent";
}

export interface PerspectivesState {
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
  highlightedClusterId: number | undefined;
  highlightReviewedDocs: boolean;
  // search state
  searchQuery: string; // This can be used to store the search query if needed
  // statistics
  pinnedStatistics: string[]; // "keywords", "tags", "<codeId>", etc.
  // dialog
  isClusterDialogOpen: boolean;
  clusterDialogClusterId: number | undefined;
  // chat
  chatSessionId?: string;
  chatMessages: ChatMessage[];
  lastDeletedChatMessages: ChatMessage[]; // For redo functionality
}

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: SdocColumns.SD_SOURCE_DOCUMENT_NAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState: PerspectivesState & FilterState = {
  ...createInitialFilterState(defaultFilterExpression),
  lastMapId: undefined,
  selectedSdocIds: [],
  selectedSdocIdsIndex: 0,
  // view settings
  colorBy: "cluster-broad",
  colorSchemeName: "category",
  colorScheme: d3.schemeCategory10 as string[],
  pointSize: 10,
  showLabels: true,
  // position settings
  xAxis: "Cluster Dimension 1",
  yAxis: "Cluster Dimension 2",
  showTicks: false,
  showGrid: true,
  // highlighting
  highlightedClusterId: undefined,
  highlightReviewedDocs: false,
  // search state
  searchQuery: "",
  // statistics
  pinnedStatistics: ["keywords", "tags"],
  // dialog
  isClusterDialogOpen: false,
  clusterDialogClusterId: undefined,
  // chat
  chatSessionId: undefined,
  chatMessages: [],
  lastDeletedChatMessages: [],
};

const resetPerspectivesState = (state: Draft<PerspectivesState>) => {
  state.lastMapId = initialState.lastMapId;
  state.highlightedClusterId = initialState.highlightedClusterId;
  state.selectedSdocIds = initialState.selectedSdocIds;
};

export const perspectivesSlice = createSlice({
  name: "perspectives",
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
        console.log("Perspectives changed! Resetting 'perspectives' state.");
        resetPerspectivesState(state);
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
    onSelectCluster: (state, action: PayloadAction<number>) => {
      if (state.highlightedClusterId === action.payload) {
        state.highlightedClusterId = undefined;
        return;
      }
      state.highlightedClusterId = action.payload;
      // only one highlight at a time
      if (state.highlightedClusterId) {
        state.highlightReviewedDocs = false;
      }
    },
    onChangeHighlightReviewedDocs: (state, action: PayloadAction<boolean>) => {
      state.highlightReviewedDocs = action.payload;
      // only one highlight at a time
      if (state.highlightReviewedDocs) {
        state.highlightedClusterId = undefined;
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
          column: SdocColumns.SD_TAG_ID_LIST,
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
        metadata: SourceDocumentMetadataUpdate;
        projectMetadata: ProjectMetadataRead;
        filterName: string;
      }>,
    ) => {
      // the column of a metadata filter is the project_metadata_id
      const filterOperator = state.column2Info[action.payload.projectMetadata.id.toString()].operator;
      const filterOperatorType = filterOperator2FilterOperatorType[filterOperator];

      const currentFilter = getOrCreateFilter(state, action.payload.filterName);
      currentFilter.items = [
        ...currentFilter.items,
        {
          id: uuidv4(),
          column: action.payload.projectMetadata.id,
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
    // dialog
    onOpenClusterDialog: (state, action: PayloadAction<number | undefined>) => {
      state.isClusterDialogOpen = true;
      state.clusterDialogClusterId = action.payload;
    },
    onCloseClusterDialog: (state) => {
      state.isClusterDialogOpen = false;
      state.clusterDialogClusterId = undefined;
    },
    // chat
    onChatReset: (state) => {
      state.chatSessionId = undefined;
      state.chatMessages = [];
      state.lastDeletedChatMessages = [];
    },
    onChatMessageSent: (state, action: PayloadAction<ChatMessage>) => {
      state.chatMessages.push(action.payload);
      state.lastDeletedChatMessages = [];
    },
    onChatResponseReceived: (state, action: PayloadAction<ChatSessionResponse>) => {
      const agentMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        message: action.payload.response,
        speaker: "agent",
      };
      state.chatSessionId = action.payload.session_id;
      state.chatMessages.push(agentMessage);
      state.lastDeletedChatMessages = [];
    },
    onChatRevert: (state) => {
      if (state.chatMessages.length === 0) return;
      let messagesToRevert: ChatMessage[] = [];
      const lastMessage = state.chatMessages[state.chatMessages.length - 1];
      if (lastMessage.speaker === "agent" && state.chatMessages.length > 1) {
        const userMessageBeforeAgent = state.chatMessages[state.chatMessages.length - 2];
        if (userMessageBeforeAgent.speaker === "user") {
          messagesToRevert = [userMessageBeforeAgent, lastMessage];
          state.chatMessages.splice(-2, 2);
        } else {
          messagesToRevert = [lastMessage];
          state.chatMessages.splice(-1, 1);
        }
      } else if (lastMessage.speaker === "user") {
        messagesToRevert = [lastMessage];
        state.chatMessages.splice(-1, 1);
      } else {
        messagesToRevert = [lastMessage];
        state.chatMessages.splice(-1, 1);
      }
      state.lastDeletedChatMessages = messagesToRevert;
    },
    onChatRedo: (state) => {
      if (state.lastDeletedChatMessages.length > 0) {
        state.chatMessages.push(...state.lastDeletedChatMessages);
        state.lastDeletedChatMessages = [];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(ProjectActions.changeProject, (state, action) => {
        console.log("Project changed! Resetting 'perspectives' state.");
        resetPerspectivesState(state);
        resetProjectFilterState({
          state,
          defaultFilterExpression,
          projectId: action.payload,
          sliceName: "perspectives",
        });
      })
      .addMatcher(
        (action) =>
          (action.type.startsWith("perspectives/onAdd") && action.type.toLowerCase().includes("filter")) || // add filter
          (action.type.startsWith("perspectives/") && action.type.includes("onFinishFilterEdit")), // edit filter
        (state) => {
          console.log("Perspectives search filters changed! Resetting search parameter dependent variables.");
          // reset variables that depend on search parameters
          state.selectedSdocIds = [];
        },
      );
  },
});

export const PerspectivesActions = perspectivesSlice.actions;
export const perspectivesReducer = perspectivesSlice.reducer;
