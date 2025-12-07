import {
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { memo, useCallback, useMemo } from "react";
import MemoHooks from "../../api/MemoHooks.ts";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";
import { dateToLocaleString } from "../../utils/DateUtils.ts";
import UserName from "../User/UserName.tsx";
import AttachedObjectRenderer from "./AttachedObjectRenderer.tsx";
import MemoActionsMenu from "./MemoActionsMenu.tsx";
import useGetMemosAttachedObject from "./useGetMemosAttachedObject.ts";

interface MemoCardSharedProps {
  onClick?: (memo: MemoRead) => void;
  onDeleteClick?: () => void;
  onStarredClick?: () => void;
}

function MemoCardWithContent({
  memo,
  onClick,
  onDeleteClick,
  onStarredClick,
}: MemoCardSharedProps & { memo: MemoRead }) {
  const attachedObject = useGetMemosAttachedObject(memo.attached_object_type, memo.attached_object_id);

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(memo);
    }
  }, [onClick, memo]);

  const lastModifiedDate = useMemo(() => {
    const fullDate = dateToLocaleString(memo.updated);
    return fullDate.substring(0, fullDate.indexOf(","));
  }, [memo.updated]);

  return (
    <Card variant="outlined">
      <CardHeader
        title={
          <>
            {attachedObject.isSuccess ? (
              <AttachedObjectRenderer
                attachedObject={attachedObject.data}
                attachedObjectType={memo.attached_object_type}
                link
              />
            ) : (
              <>...</>
            )}
          </>
        }
        action={
          <MemoActionsMenu
            memo={memo}
            onDeleteClick={onDeleteClick}
            onStarredClick={onStarredClick}
            iconButtonProps={{ size: "small" }}
          />
        }
        slotProps={{
          title: {
            variant: "body1",
            display: "flex",
            alignItems: "center",
          },
        }}
        sx={{ px: 1, py: 0.5 }}
      />
      <Divider />
      <CardActionArea onClick={handleClick}>
        <CardContent sx={{ p: 1, pb: "0px !important" }}>
          <Typography
            variant="body1"
            sx={{
              wordBreak: "break-word",
              fontWeight: 900,
            }}
          >
            {memo.title}
          </Typography>
          <Stack direction="row" alignItems="center" mt={1} justifyContent="space-between">
            <Typography variant="subtitle2" color="textSecondary" fontSize={12}>
              {"Last modified: " + lastModifiedDate}
            </Typography>
            <Typography variant="subtitle2" color="textDisabled" fontSize={12}>
              <UserName userId={memo.user_id} />
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function MemoCardWithoutContent({ memoId, ...props }: MemoCardSharedProps & { memoId: number | undefined }) {
  const memo = MemoHooks.useGetMemo(memoId);

  if (memo.isSuccess) {
    return <MemoCardWithContent memo={memo.data} {...props} />;
  } else if (memo.isLoading) {
    return <CircularProgress />;
  } else if (memo.isError) {
    return (
      <CardHeader
        title={`Error: ${memo.error.message}`}
        sx={{ pb: 1, pt: 1 }}
        slotProps={{
          title: {
            variant: "h5",
          },
        }}
      />
    );
  } else {
    return null;
  }
}

function MemoCard({ memo, ...props }: MemoCardSharedProps & { memo: number | MemoRead | undefined }) {
  if (memo === undefined || typeof memo === "number") {
    return <MemoCardWithoutContent memoId={memo} {...props} />;
  } else {
    return <MemoCardWithContent memo={memo} {...props} />;
  }
}

export default memo(MemoCard);
