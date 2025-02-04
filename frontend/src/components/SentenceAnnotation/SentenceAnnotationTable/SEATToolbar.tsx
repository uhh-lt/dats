import { Stack } from "@mui/material";
import { MRT_ShowHideColumnsButton, MRT_TableInstance, MRT_ToggleDensePaddingButton } from "material-react-table";
import React from "react";
import { SentenceAnnotationRow } from "../../../api/openapi/models/SentenceAnnotationRow.ts";
import { RootState } from "../../../store/store.ts";
import ReduxFilterDialog from "../../FilterDialog/ReduxFilterDialog.tsx";
import { SEATFilterActions } from "./seatFilterSlice.ts";

const filterStateSelector = (state: RootState) => state.seatFilter;

export interface SEATToolbarProps {
  filterName: string;
  table: MRT_TableInstance<SentenceAnnotationRow>;
  anchor: React.RefObject<HTMLElement>;
  selectedAnnotations: SentenceAnnotationRow[];
}

function SEATToolbar({
  anchor,
  filterName,
  table,
  leftChildren,
  rightChildren,
}: SEATToolbarProps & { leftChildren?: React.ReactNode; rightChildren?: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {leftChildren}
      <ReduxFilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        filterStateSelector={filterStateSelector}
        filterActions={SEATFilterActions}
      />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      {rightChildren}
    </Stack>
  );
}

export default SEATToolbar;
