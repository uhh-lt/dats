import { Stack } from "@mui/material";
import { MRT_ShowHideColumnsButton, MRT_TableInstance, MRT_ToggleDensePaddingButton } from "material-react-table";
import React from "react";
import { BBoxAnnotationRow } from "../../../api/openapi/models/BBoxAnnotationRow.ts";
import { RootState } from "../../../store/store.ts";
import ReduxFilterDialog from "../../FilterDialog/ReduxFilterDialog.tsx";
import { BBoxFilterActions } from "./bboxFilterSlice.ts";

const filterStateSelector = (state: RootState) => state.bboxFilter;

export interface BBoxToolbarProps {
  filterName: string;
  table: MRT_TableInstance<BBoxAnnotationRow>;
  anchor: React.RefObject<HTMLElement>;
  selectedUserId: number;
  selectedAnnotations: BBoxAnnotationRow[];
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
      <ReduxFilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        filterStateSelector={filterStateSelector}
        filterActions={BBoxFilterActions}
      />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      {rightChildren}
    </Stack>
  );
}

export default BBoxToolbar;
