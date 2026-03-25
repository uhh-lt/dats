import { FolderHooks } from "@api/hooks/FolderHooks";
import { FolderType } from "@api/models/FolderType";
import { HierarchicalElasticSearchHit } from "@api/models/HierarchicalElasticSearchHit";
import { ProjectMetadataRead } from "@api/models/ProjectMetadataRead";
import { SdocColumns } from "@api/models/SdocColumns";
import { SourceDocumentMetadataUpdate } from "@api/models/SourceDocumentMetadataUpdate";
import { SpanEntityStat } from "@api/models/SpanEntityStat";
import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { PercentageResizablePanel, useLayoutPercentage } from "@components/resizable-panels";
import { FILTER_PARAM, useFilterURLConnector } from "@core/filter";
import { FolderExplorer, FolderInformation, FolderRenderer } from "@core/folder";
import { DocumentInfoPanel } from "@core/source-document";
import { TagExplorer } from "@core/tag";
import { DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { useURLConnector } from "@hooks/useURLConnector";
import { Stack } from "@mui/material";
import { selectSelectedRows } from "@store/generic/tableSlice";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { projectMetadataListQueryOptions } from "../../_api/searchQueryOptions";
import { SearchStatistics } from "../../_components/statistics/SearchStatistics";
import {
  addKeywordFilter,
  addMetadataFilter,
  addSpanAnnotationFilter,
  addTagFilter,
} from "../../_utils/searchFilterUtils";
import { SearchActions } from "../../store/documentSearchSlice";
import { documentSearchQueryOptions } from "./_api/documentSearchQueryOptions";
import { SearchDocumentTable } from "./_components/SearchDocumentTable";
import { DocumentSearchRouteAPI } from "./_hooks/documentSearchRouteAPI";

const filterName = "root";

export function DocumentSearchView() {
  // router
  const projectId = DocumentSearchRouteAPI.useParams({ select: (params) => params.projectId });
  const { searchQuery, filterExpertMode, sortingModel, fetchSize } = DocumentSearchRouteAPI.useSearch();
  const [filter, setFilter] = useFilterURLConnector(DocumentSearchRouteAPI, filterName, FILTER_PARAM, SdocColumns);
  const [selectedFolderId, setSelectedFolderId] = useURLConnector(DocumentSearchRouteAPI, "selectedFolderId");

  // redux (global client state)
  const selectedDocumentId = useAppSelector((state) => state.search.selectedDocumentId);
  const selectedSdocFolderId = useAppSelector((state) => state.search.selectedSdocFolderId);
  const rowSelectionModel = useAppSelector((state) => selectSelectedRows(state.search));
  const expandedFolderIds = useAppSelector((state) => state.search.expandedFolderIds);
  const expandedTagIds = useAppSelector((state) => state.search.expandedTagIds);
  const showFolders = useAppSelector((state) => state.search.showFolders);
  const column2Info = useAppSelector((state) => state.search.column2Info);
  const dispatch = useAppDispatch();

  // filter
  const { data: projectMetadata } = useSuspenseQuery(projectMetadataListQueryOptions(projectId));

  // computed (local client state)
  const keywordMetadataIds = useMemo(() => {
    return projectMetadata.filter((m) => m.key === "keywords").map((m) => m.id);
  }, [projectMetadata]);

  // handle filtering
  const handleAddCodeFilter = useCallback(
    (stat: SpanEntityStat) => {
      setFilter((filter) => addSpanAnnotationFilter(filter, stat.code_id, stat.span_text));
    },
    [setFilter],
  );
  const handleAddKeywordFilter = useCallback(
    (keyword: string) => {
      setFilter((filter) => addKeywordFilter(filter, keywordMetadataIds, keyword));
    },
    [keywordMetadataIds, setFilter],
  );
  const handleAddTagFilter = useCallback(
    (tagId: number) => {
      setFilter((filter) => addTagFilter(filter, tagId));
    },
    [setFilter],
  );

  // folder explorer handlers
  const handleExpandedFolderIdsChange = useCallback(
    (ids: string[]) => dispatch(SearchActions.setExpandedFolderIds(ids)),
    [dispatch],
  );
  const handleSelectedFolderIdChange = useCallback(
    (folderId: number) => {
      setSelectedFolderId(folderId);
    },
    [setSelectedFolderId],
  );
  const handleToggleShowFolders = useCallback(() => dispatch(SearchActions.onToggleShowFolders()), [dispatch]);

  // tag explorer handlers
  const handleExpandedTagIdsChange = useCallback(
    (ids: string[]) => dispatch(SearchActions.setExpandedTagIds(ids)),
    [dispatch],
  );

  // metadata filter handler
  const handleAddMetadataFilter = useCallback(
    (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => {
      setFilter((filter) => addMetadataFilter(filter, metadata, projectMetadata, column2Info));
    },
    [column2Info, setFilter],
  );

  // search results
  const [sdocIds, setSdocIds] = useState<number[]>([]);
  const handleSearchResultsChange = useCallback((sdocIds: number[]) => {
    console.log("Search results changed", sdocIds);
    setSdocIds(sdocIds);
  }, []);

  const documentSearchQuery = useSuspenseInfiniteQuery(
    documentSearchQueryOptions({
      projectId,
      selectedFolderId,
      searchQuery,
      filter: filter,
      expertMode: filterExpertMode,
      sortingModel,
      fetchSize,
    }),
  );

  // vertical sidebar percentage
  const { percentage, handleResize } = useLayoutPercentage("search-vertical-sidebar");

  // folder handler
  const { mutate: moveFoldersMutation } = FolderHooks.useMoveFolders();
  const handleMoveFolders = useCallback(
    (folderIds: number[], targetFolderId: number) => {
      moveFoldersMutation(
        {
          targetFolderId,
          requestBody: folderIds,
        },
        {
          onSuccess: () => {
            dispatch(SearchActions.onMoveFolders());
          },
        },
      );
    },
    [dispatch, moveFoldersMutation],
  );

  // Drag and drop handler for moving sdoc_folders into normal folders (dnd-kit)
  const [activeDragItem, setActiveDragItem] = useState<HierarchicalElasticSearchHit | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current as HierarchicalElasticSearchHit);
    document.body.classList.add("dnd-dragging-invalid");
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      // setActiveDragItem(null);
      document.body.classList.remove("dnd-dragging-valid");
      document.body.classList.remove("dnd-dragging-invalid");

      const { active, over } = event;
      if (!active || !over) return;
      if (
        typeof active.id === "string" &&
        typeof over.id === "string" &&
        active.id.startsWith("sdoc-folder-") &&
        over.id.startsWith("folder-")
      ) {
        const targetFolderId = parseInt(over.id.replace("folder-", ""));
        // moved folders are: the active drag item + all selected folders
        const movedFolderIds = new Set<number>();
        if (active.id.startsWith("sdoc-folder-")) {
          const sdocFolderId = parseInt(active.id.replace("sdoc-folder-", ""));
          movedFolderIds.add(sdocFolderId);
        }
        rowSelectionModel.forEach((key) => {
          if (key.startsWith("folder-")) {
            const folderId = parseInt(key.replace("folder-", ""));
            movedFolderIds.add(folderId);
          }
        });
        handleMoveFolders(Array.from(movedFolderIds), targetFolderId);
      }
    },
    [handleMoveFolders, rowSelectionModel],
  );

  // Change cursor on drag over
  const handleDragMove = useCallback((event: DragOverEvent) => {
    const { active, over } = event;

    if (!active || !over) {
      document.body.classList.add("dnd-dragging-invalid");
      document.body.classList.remove("dnd-dragging-valid");
      return;
    }
    if (
      typeof active.id === "string" &&
      typeof over.id === "string" &&
      active.id.startsWith("sdoc-folder-") &&
      over.id.startsWith("folder-")
    ) {
      document.body.classList.remove("dnd-dragging-invalid");
      document.body.classList.add("dnd-dragging-valid");
    }
  }, []);

  // render
  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragMove}>
      <SidebarContentSidebarLayout
        leftSidebar={
          <PercentageResizablePanel
            firstContent={
              <FolderExplorer
                className="h100"
                expandedFolderIds={expandedFolderIds}
                onExpandedFolderIdsChange={handleExpandedFolderIdsChange}
                selectedFolderId={selectedFolderId}
                onSelectedFolderIdChange={handleSelectedFolderIdChange}
                showFolders={showFolders}
                onToggleShowFolders={handleToggleShowFolders}
              />
            }
            secondContent={
              <TagExplorer
                className="h100"
                onTagClick={handleAddTagFilter}
                expandedTagIds={expandedTagIds}
                onExpandedTagIdsChange={handleExpandedTagIdsChange}
              />
            }
            contentPercentage={percentage}
            onResize={handleResize}
          />
        }
        content={
          <SearchDocumentTable
            projectId={projectId}
            searchData={documentSearchQuery.data}
            isError={documentSearchQuery.isError}
            isFetching={documentSearchQuery.isFetching}
            isLoading={false}
            onFetchNextPage={() => {
              void documentSearchQuery.fetchNextPage();
            }}
            onSearchResultsChange={handleSearchResultsChange}
          />
        }
        rightSidebar={
          selectedDocumentId != undefined ? (
            <DocumentInfoPanel sdocId={selectedDocumentId} onAddMetadataFilter={handleAddMetadataFilter} />
          ) : selectedSdocFolderId != undefined ? (
            <FolderInformation sdocFolderId={selectedSdocFolderId} onAddMetadataFilter={handleAddMetadataFilter} />
          ) : (
            <SearchStatistics
              className="h100"
              projectId={projectId}
              sdocIds={sdocIds}
              handleKeywordClick={handleAddKeywordFilter}
              handleTagClick={handleAddTagFilter}
              handleCodeClick={handleAddCodeFilter}
            />
          )
        }
      />
      <DragOverlay>
        {activeDragItem && (
          <Stack
            display="inline-flex"
            alignItems="center"
            padding={1}
            spacing={1}
            bgcolor="background.paper"
            boxShadow={2}
            whiteSpace={"nowrap"}
          >
            {(() => {
              if (rowSelectionModel.length === 0) {
                return (
                  <FolderRenderer
                    folder={activeDragItem.id}
                    folderType={FolderType.SDOC_FOLDER}
                    renderIcon
                    renderName
                  />
                );
              } else {
                let folders: React.ReactNode[] = [];
                rowSelectionModel.forEach((key) => {
                  if (key.startsWith("folder-")) {
                    const folderId = parseInt(key.replace("folder-", ""));
                    folders.push(
                      <FolderRenderer
                        key={key}
                        folder={folderId}
                        folderType={FolderType.SDOC_FOLDER}
                        renderIcon
                        renderName
                      />,
                    );
                  }
                });
                // active drag item is not in row selection
                if (rowSelectionModel.findIndex((key) => key === `folder-${activeDragItem.id}`) === -1) {
                  folders = [
                    <FolderRenderer
                      key={`folder-${activeDragItem.id}`}
                      folder={activeDragItem.id}
                      folderType={FolderType.SDOC_FOLDER}
                      renderIcon
                      renderName
                    />,
                    ...folders,
                  ];
                }
                return folders;
              }
            })()}
          </Stack>
        )}
      </DragOverlay>
    </DndContext>
  );
}
