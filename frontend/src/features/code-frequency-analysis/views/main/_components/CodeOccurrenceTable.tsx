import { CodeHooks } from "@api/hooks/CodeHooks";
import { CodeOccurrence } from "@api/models/CodeOccurrence";
import { CardContainer } from "@components/CardContainer";
import { DocTypeIcons, getIconComponent } from "@components/icons";
import { SdocRenderer } from "@core/source-document";
import { UserRenderer } from "@core/user";
import { CardContent, CardHeader, FormControlLabel, FormGroup, Switch } from "@mui/material";
import {
  MRT_ColumnDef,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleFiltersButton,
  MRT_ToggleGlobalFilterButton,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { ChangeEventHandler, Fragment, useRef, useState } from "react";
import { useCodeOccurrencesQuery } from "../../../_api/codeFrequencyAnalysisQueryOptions";

const columns: MRT_ColumnDef<CodeOccurrence>[] = [
  {
    header: "Type",
    id: "type",
    accessorFn: (params) => params.sdoc.doctype,
    Cell: ({ row }) => getIconComponent(DocTypeIcons[row.original.sdoc.doctype]),
  },
  {
    header: "Document",
    id: "document",
    accessorFn: (params) => params.sdoc.name,
    Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdoc} link renderName />,
  },
  {
    header: "Code",
    id: "code",
    accessorFn: (params) => params.code.name,
  },
  {
    header: "Text",
    accessorKey: "text",
  },
  {
    header: "Count",
    accessorKey: "count",
  },
];

interface CodeOccurrenceTableProps {
  projectId: number;
  codeId: number;
  userIds: number[];
}

export function CodeOccurrenceTable({ projectId, codeId, userIds }: CodeOccurrenceTableProps) {
  // with children toggle
  const [withChildren, setWithChildren] = useState(false);
  const handleWithChildrenChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    setWithChildren(event.target.checked);
  };

  // global server state (react-query)
  const code = CodeHooks.useGetCode(codeId);

  // computed
  const codeOccurrences = useCodeOccurrencesQuery(projectId, userIds, codeId, withChildren);

  // virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table
  const table = useMaterialReactTable<CodeOccurrence>({
    data: codeOccurrences.data || [],
    columns: columns,
    getRowId: (row) => `sdoc-${row?.sdoc?.id}-code-${row?.code?.id}-${row?.text}`,
    // state
    state: {
      isLoading: codeOccurrences.isLoading,
      showAlertBanner: codeOccurrences.isError,
      showProgressBars: codeOccurrences.isFetching,
    },
    // selection
    enableRowSelection: false,
    // pagination
    enablePagination: false,
    // virtualization
    enableRowVirtualization: true,
    rowVirtualizerInstanceRef: rowVirtualizerInstanceRef,
    rowVirtualizerOptions: { overscan: 2 },
    // toolbars
    enableBottomToolbar: false,
    renderToolbarInternalActions: ({ table }) => (
      <>
        <MRT_ToggleGlobalFilterButton table={table} />
        <MRT_ToggleFiltersButton table={table} />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </>
    ),
    renderTopToolbarCustomActions: () => (
      <>
        <FormGroup>
          <FormControlLabel
            control={<Switch checked={withChildren} onChange={handleWithChildrenChange} />}
            label="Show Children?"
          />
        </FormGroup>
      </>
    ),
    // mui components
    muiTablePaperProps: {
      elevation: 0,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      ref: tableContainerRef, //get access to the table container element
      style: { flexGrow: 1 },
    },
    muiToolbarAlertBannerProps: codeOccurrences.isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,
  });

  return (
    <CardContainer className="h100 myFlexContainer">
      <CardHeader
        className="myFlexFitContentContainer"
        title={`Occurrences of code '${code.data?.name || ""}'`}
        subheader={
          <>
            annotated by{" "}
            {userIds.map((userId, index) => (
              <Fragment key={userId}>
                <UserRenderer user={userId} />
                {index < userIds.length - 1 ? ", " : ""}
              </Fragment>
            ))}
          </>
        }
      />
      <CardContent className="myFlexFillAllContainer" style={{ padding: 0 }}>
        <MaterialReactTable table={table} />
      </CardContent>
    </CardContainer>
  );
}
