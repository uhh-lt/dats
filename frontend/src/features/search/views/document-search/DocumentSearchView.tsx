import { FolderHooks } from "@api/hooks/FolderHooks";
import { MetadataHooks } from "@api/hooks/MetadataHooks";
import { FolderType } from "@api/models/FolderType";
import { HierarchicalElasticSearchHit } from "@api/models/HierarchicalElasticSearchHit";
import { SpanEntityStat } from "@api/models/SpanEntityStat";
import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { PercentageResizablePanel, useLayoutPercentage } from "@components/resizable-panels";
import { FolderExplorer, FolderInformation, FolderRenderer } from "@core/folder";
import { DocumentInfoPanel } from "@core/source-document";
import { TagExplorer } from "@core/tag";
import { DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { Stack } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { selectSelectedRows } from "@store/generic/tableSlice";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { SearchStatistics } from "../../_components/statistics/SearchStatistics";
import { SearchActions } from "../../store/documentSearchSlice";
import { SearchDocumentTable } from "./_components/SearchDocumentTable";

const filterName = "root";
const routeApi = getRouteApi("/_auth/project/$projectId/search");

export function DocumentSearchView() {
  // router
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  // redux (global client state)
  const selectedDocumentId = useAppSelector((state) => state.search.selectedDocumentId);
  const selectedSdocFolderId = useAppSelector((state) => state.search.selectedSdocFolderId);
  const rowSelectionModel = useAppSelector((state) => selectSelectedRows(state.search));
  const dispatch = useAppDispatch();

  // filter
  const projectMetadata = MetadataHooks.useGetProjectMetadataList();

  // computed (local client state)
  const keywordMetadataIds = useMemo(() => {
    if (!projectMetadata.data) return [];
    return projectMetadata.data.filter((m) => m.key === "keywords").map((m) => m.id);
  }, [projectMetadata.data]);

  // handle filtering
  const handleAddCodeFilter = useCallback(
    (stat: SpanEntityStat) => {
      dispatch(SearchActions.onAddSpanAnnotationFilter({ codeId: stat.code_id, spanText: stat.span_text, filterName }));
    },
    [dispatch],
  );
  const handleAddKeywordFilter = useCallback(
    (keyword: string) => {
      dispatch(SearchActions.onAddKeywordFilter({ keywordMetadataIds, keyword, filterName }));
    },
    [dispatch, keywordMetadataIds],
  );
  const handleAddTagFilter = useCallback(
    (tagId: number) => {
      dispatch(SearchActions.onAddTagFilter({ tagId, filterName }));
    },
    [dispatch],
  );

  // search results
  const [sdocIds, setSdocIds] = useState<number[]>([]);
  const handleSearchResultsChange = useCallback((sdocIds: number[]) => {
    console.log("Search results changed", sdocIds);
    setSdocIds(sdocIds);
  }, []);

  // vertical sidebar percentage
  const { percentage, handleResize } = useLayoutPercentage("search-vertical-sidebar");

  // folder handler
  const { mutate: moveFoldersMutation } = FolderHooks.useMoveFolders();
  const handleMoveFolders = useCallback(
    (folderIds: number[], targetFolderId: number) => {
      moveFoldersMutation({
        targetFolderId,
        requestBody: folderIds,
      });
    },
    [moveFoldersMutation],
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
            firstContent={<FolderExplorer className="h100" />}
            secondContent={<TagExplorer className="h100" onTagClick={handleAddTagFilter} />}
            contentPercentage={percentage}
            onResize={handleResize}
          />
        }
        content={<SearchDocumentTable projectId={projectId} onSearchResultsChange={handleSearchResultsChange} />}
        rightSidebar={
          selectedDocumentId != undefined ? (
            <DocumentInfoPanel sdocId={selectedDocumentId} filterName={filterName} />
          ) : selectedSdocFolderId != undefined ? (
            <FolderInformation sdocFolderId={selectedSdocFolderId} filterName={filterName} />
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
                let folders: JSX.Element[] = [];
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
