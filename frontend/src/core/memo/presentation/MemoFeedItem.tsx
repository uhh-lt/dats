import { UserRenderer } from "@core/user";
import { MemoRow } from "@models/MemoRow";
import { Paper, Stack, Typography } from "@mui/material";
import { dateToLocaleString } from "@utils/DateUtils";
import { formatOptionLabel } from "@utils/StringUtils";
import { memo } from "react";
import { MemoFavoriteIconButton } from "../MemoFavoriteIconButton";

interface MemoFeedItemProps {
  memo: MemoRow;
  onSelect: (memoId: number) => void;
}

export const MemoFeedItem = memo(({ memo, onSelect }: MemoFeedItemProps) => {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row">
        <Typography variant="h6" flex={1} onClick={() => onSelect(memo.id)} sx={{ cursor: "pointer" }}>
          {memo.title}
        </Typography>
        <MemoFavoriteIconButton memo={memo} />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        <UserRenderer user={memo.user_id} /> · {dateToLocaleString(memo.updated)} ·{" "}
        {formatOptionLabel(memo.attached_object_type)}
      </Typography>
      <Typography mt={1} whiteSpace="pre-wrap">
        {memo.content_excerpt}
      </Typography>
    </Paper>
  );
});
