import { MemoRow } from "@models/MemoRow";
import { Card, CardActionArea, CardContent, Stack, Typography } from "@mui/material";
import { formatOptionLabel } from "@utils/StringUtils";
import { memo } from "react";
import { MemoFavoriteIconButton } from "../MemoFavoriteIconButton";

interface MemoWorkspaceCardProps {
  memo: MemoRow;
  onSelect: (memoId: number) => void;
}

export const MemoWorkspaceCard = memo(({ memo, onSelect }: MemoWorkspaceCardProps) => {
  return (
    <Card variant="outlined">
      <CardActionArea onClick={() => onSelect(memo.id)}>
        <CardContent>
          <Stack direction="row">
            <Typography variant="h6" flex={1}>
              {memo.title}
            </Typography>
            <MemoFavoriteIconButton memo={memo} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {formatOptionLabel(memo.attached_object_type)}
          </Typography>
          <Typography mt={1}>{memo.content_excerpt}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
});
