import { Stack } from "@mui/material";
import { MRT_ShowHideColumnsButton, MRT_TableInstance, MRT_ToggleDensePaddingButton } from "material-react-table";
import React from "react";
import { BBoxAnnotationTableRow } from "../../../api/openapi/models/BBoxAnnotationTableRow.ts";
import BBoxFilterDialog from "./BBoxFilterDialog.tsx";

export interface BBoxToolbarProps {
  filterName: string;
  table: MRT_TableInstance<BBoxAnnotationTableRow>;
  anchor: React.RefObject<HTMLElement>;
  selectedUserId: number;
  selectedAnnotations: BBoxAnnotationTableRow[];
}

function BBoxToolbar({
  anchor,
  filterName,
  table,
  leftChildren,
  rightChildren,
}: BBoxToolbarProps & { leftChildren?: React.ReactNode; rightChildren?: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {leftChildren}
      <BBoxFilterDialog anchorEl={anchor.current} buttonProps={{ size: "small" }} filterName={filterName} />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      {rightChildren}
    </Stack>
  );
}

export default BBoxToolbar;
