import {
  MRT_ColumnDef,
  MRT_ColumnFiltersState,
  MRT_RowSelectionState,
  MRT_SortingState,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useState } from "react";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks.ts";
import { SpanAnnotationReadResolved } from "../../api/openapi/models/SpanAnnotationReadResolved.ts";

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";

const columns: MRT_ColumnDef<SpanAnnotationReadResolved>[] = [
  { accessorKey: "id", header: "ID", accessorFn: (params) => params.id },
  // {
  //   header: "Document",
  //   // flex: 1,
  //   id: "document",
  //   accessorFn: (params) => params.sdoc.filename,
  //   Cell: ({ row }) => <>{row.original.sdoc.filename}</>,
  // },
  // {
  //   header: "Code",
  //   // flex: 1,
  //   id: "code",
  //   accessorFn: (params) => params.code.name,
  //   Cell: ({ row }) => <CodeRenderer code={row.original.code} />,
  // },
  {
    accessorKey: "span_text",
    header: "Text",
  },
  {
    header: "Created",
    id: "created",
    accessorFn: (originalRow) => new Date(originalRow.created), //convert to date for sorting and filtering
    filterVariant: "date-range",
    Cell: ({ cell }) => cell.getValue<Date>().toLocaleDateString(), // convert back to string for display
  },
  {
    accessorKey: "updated",
    header: "Updated",
  },
];

// interface AnnotationSelectorProps {
//   projectId: number;
//   userIds: number[];
//   setSelectedAnnotations: (annotations: AnnotationOccurrence[]) => void;
// }

function AnnotationSelector() {
  // local state
  const [rowSelectionModel] = useState<MRT_RowSelectionState>({});
  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>();
  const [sorting, setSorting] = useState<MRT_SortingState>([]);

  console.log("sorting", sorting);
  console.log("columnFilters", columnFilters);
  console.log("globalFilter", globalFilter);

  // global server state
  // todo: use projectId and userIds
  const { isLoading, isError, isFetching, data: annotationOccurrences } = SpanAnnotationHooks.useGetByCodeAndUser(1, 1);

  // table
  const table = useMaterialReactTable({
    data: annotationOccurrences || [],
    columns: columns,
    getRowId: (row) => `${row.id}`,
    enablePagination: false,
    // state
    state: {
      rowSelection: rowSelectionModel,
      columnFilters,
      globalFilter,
      isLoading,
      showAlertBanner: isError,
      showProgressBars: isFetching,
      sorting,
    },
    // filtering
    manualFiltering: true,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    // sorting
    manualSorting: true,
    onSortingChange: setSorting,
    // selection
    // enableRowSelection: true,
    // onRowSelectionChange: (rowSelectionUpdater) => {
    //   let newRowSelectionModel: MRT_RowSelectionState;
    //   if (typeof rowSelectionUpdater === "function") {
    //     newRowSelectionModel = rowSelectionUpdater(rowSelectionModel);
    //   } else {
    //     newRowSelectionModel = rowSelectionUpdater;
    //   }
    //   setRowSelectionModel(newRowSelectionModel);
    //   setSelectedAnnotations(
    //     Object.entries(newRowSelectionModel)
    //       .filter(([, selected]) => selected)
    //       .map(([annotationId]) => annotationOccurrencesMap[annotationId]),
    //   );
    // },
  });

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MaterialReactTable table={table} />
    </LocalizationProvider>
  );
}
export default AnnotationSelector;
