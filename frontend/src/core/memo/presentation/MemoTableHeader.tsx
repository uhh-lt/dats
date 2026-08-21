import { TableCell, TableHead, TableRow } from "@mui/material";
import { memo } from "react";

export const MemoTableHeader = memo(() => {
  return (
    <TableHead>
      <TableRow>
        <TableCell>Title</TableCell>
        <TableCell>Attached to</TableCell>
        <TableCell>Author</TableCell>
        <TableCell>Updated</TableCell>
        <TableCell />
      </TableRow>
    </TableHead>
  );
});
