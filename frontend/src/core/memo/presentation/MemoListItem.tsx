import { MemoRow } from "@models/MemoRow";
import { Box, CardActionArea, Stack, Typography } from "@mui/material";
import { formatOptionLabel } from "@utils/StringUtils";
import { memo } from "react";
import { MemoFavoriteIconButton } from "../MemoFavoriteIconButton";

interface MemoListItemProps {
  memo: MemoRow;
  onSelect: (memoId: number) => void;
}

export const MemoListItem = memo(({ memo, onSelect }: MemoListItemProps) => {
  return (
    <CardActionArea onClick={() => onSelect(memo.id)}>
      <Stack direction="row" p={1.5} alignItems="center">
        <Box flex={1} minWidth={0}>
          <Typography fontWeight={600}>{memo.title}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {memo.content_excerpt || formatOptionLabel(memo.attached_object_type)}
          </Typography>
        </Box>
        <MemoFavoriteIconButton memo={memo} />
      </Stack>
    </CardActionArea>
  );
});
