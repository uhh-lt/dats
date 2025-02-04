import { Stack } from "@mui/material";
import { MRT_ShowHideColumnsButton, MRT_TableInstance, MRT_ToggleDensePaddingButton } from "material-react-table";
import React from "react";
import { SpanAnnotationRow } from "../../../api/openapi/models/SpanAnnotationRow.ts";
import { RootState } from "../../../store/store.ts";
import ReduxFilterDialog from "../../FilterDialog/ReduxFilterDialog.tsx";
import { SATFilterActions } from "./satFilterSlice.ts";

const filterStateSelector = (state: RootState) => state.satFilter;

export interface SATToolbarProps {
  filterName: string;
  table: MRT_TableInstance<SpanAnnotationRow>;
  anchor: React.RefObject<HTMLElement>;
  selectedAnnotations: SpanAnnotationRow[];
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
      <ReduxFilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        filterStateSelector={filterStateSelector}
        filterActions={SATFilterActions}
      />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      {rightChildren}
    </Stack>
  );
}

export default SATToolbar;
