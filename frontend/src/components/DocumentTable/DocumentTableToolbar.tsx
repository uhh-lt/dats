import { Stack } from "@mui/material";
import {
  MRT_ShowHideColumnsButton,
  MRT_TableInstance,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleGlobalFilterButton,
} from "material-react-table";
import React from "react";
import { ElasticSearchDocumentHit } from "../../api/openapi/models/ElasticSearchDocumentHit.ts";
import ReduxFilterDialog from "../../features/FilterDialog/ReduxFilterDialog.tsx";
import { ReduxFilterDialogProps } from "../../features/FilterDialog/ReduxFilterDialogProps.ts";

export interface DocumentTableToolbarProps extends ReduxFilterDialogProps {
  table: MRT_TableInstance<ElasticSearchDocumentHit>;
  anchor: React.RefObject<HTMLElement>;
}

function DocumentTableToolbar({ anchor, table, ...filterProps }: DocumentTableToolbarProps) {
  return (
    <Stack direction="row" spacing={1}>
      <ReduxFilterDialog anchorEl={anchor.current} buttonProps={{ size: "small" }} {...filterProps} />
      <MRT_ToggleGlobalFilterButton table={table} />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
    </Stack>
  );
}

export default DocumentTableToolbar;
