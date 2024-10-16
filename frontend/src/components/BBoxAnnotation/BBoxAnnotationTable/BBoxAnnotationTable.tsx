import { Card, CardContent, CardHeader, CardProps, Stack, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_SortingState,
  MRT_TableOptions,
  MRT_VisibilityState,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { AnnotatedImageResult } from "../../../api/openapi/models/AnnotatedImageResult.ts";
import { AnnotatedImagesColumns } from "../../../api/openapi/models/AnnotatedImagesColumns.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { BBoxAnnotationTableRow } from "../../../api/openapi/models/BBoxAnnotationTableRow.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { useTableInfiniteScroll } from "../../../utils/useTableInfiniteScroll.ts";
import ImageCropper from "../../../views/whiteboard/nodes/ImageCropper.tsx";
import CodeRenderer from "../../Code/CodeRenderer.tsx";
import { MyFilter, createEmptyFilter } from "../../FilterDialog/filterUtils.ts";
import MemoRenderer2 from "../../Memo/MemoRenderer2.tsx";
import SdocMetadataRenderer from "../../Metadata/SdocMetadataRenderer.tsx";
import SdocTagsRenderer from "../../SourceDocument/SdocTagRenderer.tsx";
import UserSelectorSingle from "../../User/UserSelectorSingle.tsx";
import BBoxToolbar, { BBoxToolbarProps } from "./BBoxToolbar.tsx";
import { useInitBBoxFilterSlice } from "./useInitBBoxFilterSlice.ts";

const fetchSize = 20;
const flatMapData = (page: AnnotatedImageResult) => page.data;

export interface BBoxAnnotationTableProps {
  title?: string;
  projectId: number;
  filterName: string;
  // selection
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<BBoxAnnotationTableRow>["onRowSelectionChange"];
  // sorting
  sortingModel: MRT_SortingState;
  onSortingChange: MRT_TableOptions<BBoxAnnotationTableRow>["onSortingChange"];
  // column visibility
  columnVisibilityModel: MRT_VisibilityState;
  onColumnVisibilityChange: MRT_TableOptions<BBoxAnnotationTableRow>["onColumnVisibilityChange"];
  // components
  cardProps?: CardProps;
  positionToolbarAlertBanner?: MRT_TableOptions<BBoxAnnotationTableRow>["positionToolbarAlertBanner"];
  renderToolbarInternalActions?: (props: BBoxToolbarProps) => React.ReactNode;
  renderTopToolbarCustomActions?: (props: BBoxToolbarProps) => React.ReactNode;
  renderBottomToolbarCustomActions?: (props: BBoxToolbarProps) => React.ReactNode;
}

function BBoxAnnotationTable({
  title = "BBox Annotation Table",
  projectId,
  filterName,
  rowSelectionModel,
  onRowSelectionChange,
  sortingModel,
  onSortingChange,
  columnVisibilityModel,
  onColumnVisibilityChange,
  cardProps,
  positionToolbarAlertBanner = "top",
  renderToolbarInternalActions = BBoxToolbar,
  renderTopToolbarCustomActions,
  renderBottomToolbarCustomActions,
}: BBoxAnnotationTableProps) {
  // global client state (react router)
  const { user } = useAuth();

  // user id selector
  const [selectedUserId, setSelectedUserId] = useState<number>(user?.id || 1);

  // filtering
  const filter = useAppSelector((state) => state.bboxFilter.filter[filterName]) || createEmptyFilter(filterName);

  // virtualization
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitBBoxFilterSlice({ projectId });
  const columns: MRT_ColumnDef<BBoxAnnotationTableRow>[] = useMemo(() => {
    if (!tableInfo || !user) return [];

    const result = tableInfo.map((column) => {
      const colDef = {
        id: column.column,
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case AnnotatedImagesColumns.AIC_SOURCE_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            accessorFn: (row) => row.sdoc.filename,
          } as MRT_ColumnDef<BBoxAnnotationTableRow>;
        case AnnotatedImagesColumns.AIC_DOCUMENT_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.sdoc.id} tags={row.original.tags} />,
          } as MRT_ColumnDef<BBoxAnnotationTableRow>;
        case AnnotatedImagesColumns.AIC_CODE_ID:
          return {
            ...colDef,
            Cell: ({ row }) => <CodeRenderer code={row.original.code} />,
          } as MRT_ColumnDef<BBoxAnnotationTableRow>;
        case AnnotatedImagesColumns.AIC_MEMO_CONTENT:
          return {
            ...colDef,
            Cell: ({ row }) =>
              user ? (
                <MemoRenderer2
                  attachedObjectType={AttachedObjectType.BBOX_ANNOTATION}
                  attachedObjectId={row.original.id}
                  showTitle={false}
                  showContent
                  showIcon={false}
                />
              ) : null,
          } as MRT_ColumnDef<BBoxAnnotationTableRow>;
        default:
          if (!isNaN(parseInt(column.column))) {
            return {
              ...colDef,
              Cell: ({ row }) => (
                <SdocMetadataRenderer sdocId={row.original.sdoc.id} projectMetadataId={parseInt(column.column)} />
              ),
            } as MRT_ColumnDef<BBoxAnnotationTableRow>;
          } else {
            return {
              ...colDef,
              Cell: () => <i>Cannot render column {column.column}</i>,
            } as MRT_ColumnDef<BBoxAnnotationTableRow>;
          }
      }
    });

    // custom columns
    const previewCell = {
      id: "bbox",
      header: "Preview",
      enableSorting: false,
      accessorFn: (row) => row.x,
      Cell: ({ row }) => (
        <ImageCropper
          imageUrl={encodeURI(import.meta.env.VITE_APP_CONTENT + "/" + row.original.url)}
          x={row.original.x}
          y={row.original.y}
          width={row.original.width}
          targetWidth={(row.original.width * 100) / row.original.height}
          height={row.original.height}
          targetHeight={100}
          style={{
            border: "4px solid " + row.original.code.color,
          }}
        />
      ),
    } as MRT_ColumnDef<BBoxAnnotationTableRow>;

    return [previewCell, ...result];
  }, [tableInfo, user]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<AnnotatedImageResult>({
    queryKey: [
      "bbox-table-data",
      projectId,
      selectedUserId,
      filter, //refetch when columnFilters changes
      sortingModel, //refetch when sorting changes
    ],
    queryFn: ({ pageParam }) =>
      AnalysisService.annotatedImages({
        projectId: projectId!,
        userId: selectedUserId,
        requestBody: {
          filter: filter as MyFilter<AnnotatedImagesColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as AnnotatedImagesColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
        page: pageParam as number,
        pageSize: fetchSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (_lastGroup, groups) => {
      return groups.length;
    },
    refetchOnWindowFocus: false,
  });

  // infinite scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { flatData, totalResults, totalFetched, fetchMoreOnScroll } = useTableInfiniteScroll({
    tableContainerRef,
    data,
    isFetching,
    fetchNextPage,
    flatMapData,
  });

  // infinite scrolling reset:
  // scroll to top of table when sorting or userId changes
  useEffect(() => {
    try {
      rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
    } catch (error) {
      console.error(error);
    }
  }, [projectId, selectedUserId, sortingModel]);

  // table
  const table = useMaterialReactTable<BBoxAnnotationTableRow>({
    data: flatData,
    columns: columns,
    getRowId: (row) => `${row.id}`,
    // state
    state: {
      rowSelection: rowSelectionModel,
      sorting: sortingModel,
      columnVisibility: columnVisibilityModel,
      isLoading: isLoading || columns.length === 0,
      showAlertBanner: isError,
      showProgressBars: isFetching,
    },
    // selection
    enableRowSelection: true,
    onRowSelectionChange,
    // virtualization
    enableRowVirtualization: true,
    rowVirtualizerInstanceRef: rowVirtualizerInstanceRef,
    rowVirtualizerOptions: { overscan: 4 },
    // filtering
    manualFiltering: true,
    enableColumnFilters: false,
    // pagination
    enablePagination: false,
    // sorting
    manualSorting: true,
    onSortingChange,
    // column visiblility
    onColumnVisibilityChange,
    // mui components
    muiTablePaperProps: {
      elevation: 0,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      ref: tableContainerRef, //get access to the table container element
      onScroll: (event: UIEvent<HTMLDivElement>) => fetchMoreOnScroll(event.target as HTMLDivElement), //add an event listener to the table container element
      style: { flexGrow: 1 },
    },
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,
    // toolbar
    positionToolbarAlertBanner,
    renderTopToolbarCustomActions: renderTopToolbarCustomActions
      ? (props) =>
          renderTopToolbarCustomActions({
            table: props.table,
            filterName,
            anchor: tableContainerRef,
            selectedUserId: selectedUserId,
            selectedAnnotations: flatData.filter((row) => rowSelectionModel[row.id]),
          })
      : undefined,
    renderToolbarInternalActions: (props) =>
      renderToolbarInternalActions({
        table: props.table,
        filterName,
        anchor: tableContainerRef,
        selectedUserId: selectedUserId,
        selectedAnnotations: flatData.filter((row) => rowSelectionModel[row.id]),
      }),
    renderBottomToolbarCustomActions: (props) => (
      <Stack direction={"row"} spacing={1} alignItems="center">
        <Typography>
          Fetched {totalFetched} of {totalResults} total rows.
        </Typography>
        {renderBottomToolbarCustomActions &&
          renderBottomToolbarCustomActions({
            table: props.table,
            filterName,
            anchor: tableContainerRef,
            selectedUserId: selectedUserId,
            selectedAnnotations: flatData.filter((row) => rowSelectionModel[row.id]),
          })}
      </Stack>
    ),
  });

  return (
    <Card className="myFlexContainer" {...cardProps}>
      <CardHeader
        title={title}
        action={
          <UserSelectorSingle
            title="Annotations"
            projectId={projectId}
            userId={selectedUserId}
            onUserIdChange={setSelectedUserId}
          />
        }
      />
      <CardContent className="myFlexFillAllContainer" style={{ padding: 0 }}>
        <MaterialReactTable table={table} />
      </CardContent>
    </Card>
  );
}

export default BBoxAnnotationTable;
