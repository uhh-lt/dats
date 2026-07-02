import { FolderHooks } from "@api/hooks/FolderHooks";
import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { PercentageResizablePanel, useLayoutPercentage } from "@components/resizable-panels";
import { FILTER_PARAM } from "@core/filter";
import { FolderExplorer, FolderInformation, FolderRenderer } from "@core/folder";
import { DocumentInfoPanel } from "@core/source-document";
import { TagExplorer } from "@core/tag";
import { DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { useResetStateOnSearch } from "@hooks/useResetStateOnSearch";
import { useURLConnector } from "@hooks/useURLConnector";
import { FolderType } from "@models/FolderType";
import { HierarchicalElasticSearchHit } from "@models/HierarchicalElasticSearchHit";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { SourceDocumentMetadataUpdate } from "@models/SourceDocumentMetadataUpdate";
import { SpanEntityStat } from "@models/SpanEntityStat";
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

export function DocumentSearchView() {
  // router
  const projectId = DocumentSearchRouteAPI.useParams({ select: (params) => params.projectId });
  const { searchQuery, searchExpertMode, sortingModel, fetchSize } = DocumentSearchRouteAPI.useSearch();
  const [filter, setFilter] = useURLConnector(DocumentSearchRouteAPI, FILTER_PARAM);
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

  const documentSearchQuery = useSuspenseInfiniteQuery(
    documentSearchQueryOptions({
      projectId,
      selectedFolderId,
      searchQuery,
      filter: filter,
      expertMode: searchExpertMode,
      sortingModel,
      fetchSize,
    }),
  );

  const { flatData, totalFetchedSdocs, totalFetchedFolders, totalResults, sdocIds } = useMemo(() => {
    const searchData = documentSearchQuery.data;
    const totalResults = searchData?.pages?.[0]?.total_results ?? 0;
    if (!searchData || searchData.pages.length === 0) {
      return {
        flatData: [] as HierarchicalElasticSearchHit[],
        totalFetchedSdocs: 0,
        totalFetchedFolders: 0,
        totalResults,
        sdocIds: [] as number[],
      };
    }

    // Keep parity with SearchDocumentTable's flatData transformation logic.
    if (!showFolders) {
      const flatData = searchData.pages.flatMap((page) =>
        page.hits.reduce((acc, hit) => {
          acc.push(...hit.sub_rows);
          return acc;
        }, [] as HierarchicalElasticSearchHit[]),
      );
      return {
        flatData,
        totalFetchedSdocs: flatData.length,
        totalFetchedFolders: 0,
        totalResults,
        sdocIds: flatData.map((sdoc) => sdoc.id),
      };
    }

    const hits: Record<number, HierarchicalElasticSearchHit> = {};
    const sortedHitIds: number[] = [];
    searchData.pages.forEach((page) => {
      page.hits.forEach((hit) => {
        if (hits[hit.id]) {
          hits[hit.id].sub_rows.push(...hit.sub_rows);
        } else {
          hits[hit.id] = JSON.parse(JSON.stringify(hit));
        }
        if (!sortedHitIds.includes(hit.id)) {
          sortedHitIds.push(hit.id);
        }
      });
    });

    const flatData = sortedHitIds.map((id) => hits[id]);
    return {
      flatData,
      totalFetchedSdocs: flatData.reduce((acc, hit) => acc + hit.sub_rows.length, 0),
      totalFetchedFolders: flatData.length,
      totalResults,
      sdocIds: flatData.flatMap((folder) => folder.sub_rows.map((sdoc) => sdoc.id)),
    };
  }, [documentSearchQuery.data, showFolders]);

  // resetting search-parameter-dependant state
  useResetStateOnSearch([projectId, selectedFolderId, searchQuery, filter, searchExpertMode, sortingModel], () =>
    dispatch(SearchActions.onSearchParamsChange()),
  );

  // filtering feature
  const { data: projectMetadata } = useSuspenseQuery(projectMetadataListQueryOptions(projectId));
  const keywordMetadataIds = useMemo(() => {
    return projectMetadata.filter((m) => m.key === "keywords").map((m) => m.id);
  }, [projectMetadata]);
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
  const handleAddMetadataFilter = useCallback(
    (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => {
      setFilter((filter) => addMetadataFilter(filter, metadata, projectMetadata, column2Info));
    },
    [column2Info, setFilter],
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
  const { percentage, handleResize } = useLayoutPercentage("search-vertical-sidebar");
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
            flatData={flatData}
            totalFetchedSdocs={totalFetchedSdocs}
            totalFetchedFolders={totalFetchedFolders}
            totalResults={totalResults}
            isError={documentSearchQuery.isError}
            isFetching={documentSearchQuery.isFetching}
            isLoading={documentSearchQuery.isLoading}
            onFetchNextPage={() => {
              void documentSearchQuery.fetchNextPage();
            }}
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
