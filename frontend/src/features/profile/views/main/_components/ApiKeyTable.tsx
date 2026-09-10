import { ApiKeyHooks } from "@api/hooks/ApiKeyHooks";
import { getIconComponent, Icon } from "@components/icons";
import { useOpenConfirmationDialog } from "@core/notification";
import { ApiKeyRead } from "@models/ApiKeyRead";
import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import { dateToLocaleString } from "@utils/DateUtils";
import { MaterialReactTable, MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { memo, useCallback, useMemo } from "react";

const isExpired = (apiKey: ApiKeyRead): boolean =>
  apiKey.expires_at !== null && new Date(apiKey.expires_at).getTime() < Date.now();

const columns: MRT_ColumnDef<ApiKeyRead>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "prefix",
    header: "Key",
    Cell: ({ row }) => (
      <Typography variant="body2" fontFamily="monospace">
        {row.original.prefix}
      </Typography>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    Cell: ({ row }) => dateToLocaleString(row.original.created_at),
  },
  {
    accessorKey: "expires_at",
    header: "Expires at",
    Cell: ({ row }) => {
      const { expires_at } = row.original;
      if (expires_at === null) {
        return <Typography variant="body2">Never</Typography>;
      }
      if (isExpired(row.original)) {
        return <Chip label={`Expired (${dateToLocaleString(expires_at)})`} color="error" size="small" />;
      }
      return dateToLocaleString(expires_at);
    },
  },
];

export const ApiKeyTable = memo(() => {
  // global server state
  const apiKeys = ApiKeyHooks.useGetApiKeys();

  // mutations
  const { mutate: deleteApiKey, isPending: isDeleting } = ApiKeyHooks.useDeleteApiKey();

  // actions
  const openConfirmationDialog = useOpenConfirmationDialog();
  const handleDeleteApiKey = useCallback(
    (apiKey: ApiKeyRead) => {
      openConfirmationDialog({
        text: `Do you really want to delete the API key "${apiKey.name}"? This action cannot be undone!`,
        type: "DELETE",
        onAccept: () => {
          deleteApiKey({ keyId: apiKey.id });
        },
      });
    },
    [openConfirmationDialog, deleteApiKey],
  );

  // computed
  const sortedApiKeys = useMemo(
    () => (apiKeys.data ? [...apiKeys.data].sort((a, b) => b.created_at.localeCompare(a.created_at)) : []),
    [apiKeys.data],
  );

  // table
  const table = useMaterialReactTable<ApiKeyRead>({
    data: sortedApiKeys,
    columns: columns,
    getRowId: (row) => `${row.id}`,
    // style
    muiTablePaperProps: {
      elevation: 0,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      style: { flexGrow: 1 },
    },
    // state
    state: {
      isLoading: apiKeys.isLoading,
      showAlertBanner: apiKeys.isError,
      showProgressBars: apiKeys.isFetching,
    },
    // handle error
    muiToolbarAlertBannerProps: apiKeys.isError
      ? {
          color: "error",
          children: apiKeys.error.message,
        }
      : undefined,
    // scrolling instead of pagination
    enablePagination: false,
    enableRowVirtualization: true,
    // actions
    enableRowActions: true,
    positionActionsColumn: "last",
    renderRowActions: ({ row }) => (
      <Box sx={{ display: "flex", flexWrap: "nowrap", gap: "8px" }}>
        <Tooltip title="Delete">
          <span>
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteApiKey(row.original);
              }}
              disabled={isDeleting}
            >
              {getIconComponent(Icon.DELETE)}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    ),
    displayColumnDefOptions: {
      "mrt-row-actions": {
        size: 80,
        grow: 0,
      },
    },
    // hide toolbars (the section header provides the actions)
    enableTopToolbar: false,
    enableBottomToolbar: false,
  });

  return <MaterialReactTable table={table} />;
});
