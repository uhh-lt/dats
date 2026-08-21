import { UserRenderer } from "@core/user";
import { MemoRow } from "@models/MemoRow";
import { TableCell, TableRow } from "@mui/material";
import { dateToLocaleString } from "@utils/DateUtils";
import { formatOptionLabel } from "@utils/StringUtils";
import { memo } from "react";
import { MemoFavoriteIconButton } from "../MemoFavoriteIconButton";

interface MemoTableRowProps {
  memo: MemoRow;
  onSelect: (memoId: number) => void;
}

export const MemoTableRow = memo(({ memo, onSelect }: MemoTableRowProps) => {
  return (
    <TableRow hover onClick={() => onSelect(memo.id)} sx={{ cursor: "pointer" }}>
      <TableCell>{memo.title}</TableCell>
      <TableCell>{formatOptionLabel(memo.attached_object_type)}</TableCell>
      <TableCell>
        <UserRenderer user={memo.user_id} />
      </TableCell>
      <TableCell>{dateToLocaleString(memo.updated)}</TableCell>
      <TableCell>
        <MemoFavoriteIconButton memo={memo} />
      </TableCell>
    </TableRow>
  );
});
