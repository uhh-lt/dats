import { Stack } from "@mui/material";
import {
  MRT_ShowHideColumnsButton,
  MRT_TableInstance,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleGlobalFilterButton,
} from "material-react-table";
import React from "react";
import { ElasticSearchDocumentHit } from "../../api/openapi/models/ElasticSearchDocumentHit.ts";
import { DocumentTableFilterProps } from "./DocumentTable.tsx";
import DocumentTableFilterDialog from "./DocumentTableFilterDialog.tsx";

export interface DocumentTableToolbarProps extends DocumentTableFilterProps {
  table: MRT_TableInstance<ElasticSearchDocumentHit>;
  anchor: React.RefObject<HTMLElement>;
}

function DocumentTableToolbar({ anchor, table, ...filterProps }: DocumentTableToolbarProps) {
  return (
    <Stack direction="row" spacing={1}>
      <DocumentTableFilterDialog anchorEl={anchor.current} buttonProps={{ size: "small" }} {...filterProps} />
      <MRT_ToggleGlobalFilterButton table={table} />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
    </Stack>
  );
}

export default DocumentTableToolbar;
