import { Stack } from "@mui/material";
import { MRT_ShowHideColumnsButton, MRT_TableInstance, MRT_ToggleDensePaddingButton } from "material-react-table";
import React from "react";
import { AnnotationTableRow } from "../../api/openapi/models/AnnotationTableRow.ts";
import SATFilterDialog from "./SATFilterDialog.tsx";

export interface SATToolbarProps {
  filterName: string;
  table: MRT_TableInstance<AnnotationTableRow>;
  anchor: React.RefObject<HTMLElement>;
  selectedUserId: number;
  selectedAnnotations: AnnotationTableRow[];
}

function SATToolbar({
  anchor,
  filterName,
  table,
  leftChildren,
  rightChildren,
}: SATToolbarProps & { leftChildren?: React.ReactNode; rightChildren?: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {leftChildren}
      <SATFilterDialog anchorEl={anchor.current} buttonProps={{ size: "small" }} filterName={filterName} />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      {rightChildren}
    </Stack>
  );
}

export default SATToolbar;
