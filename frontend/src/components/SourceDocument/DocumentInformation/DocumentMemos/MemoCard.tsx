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
import MemoHooks from "../../../../api/MemoHooks.ts";
import { MemoRead } from "../../../../api/openapi/models/MemoRead.ts";
import { dateToLocaleString } from "../../../../utils/DateUtils.ts";
import AttachedObjectLink from "../../../../views/logbook/AttachedObjectLink.tsx";
import MemoActionsMenu from "../../../Memo/MemoActionsMenu.tsx";
import useGetMemosAttachedObject from "../../../Memo/useGetMemosAttachedObject.ts";
import UserName from "../../../User/UserName.tsx";

interface MemoCardSharedProps {
  onClick?: (memo: MemoRead) => void;
  onDeleteClick?: () => void;
  onStarredClick?: () => void;
}

function MemoCard({ memo, ...props }: MemoCardSharedProps & { memo: number | MemoRead | undefined }) {
  if (memo === undefined || typeof memo === "number") {
    return <MemoCardWithoutContent memoId={memo} {...props} />;
  } else {
    return <MemoCardWithContent memo={memo} {...props} />;
  }
}

function MemoCardWithoutContent({ memoId, ...props }: MemoCardSharedProps & { memoId: number | undefined }) {
  // query
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
        titleTypographyProps={{ variant: "h5" }}
      />
    );
  } else {
    return null;
  }
}

function MemoCardWithContent({
  memo,
  onClick,
  onDeleteClick,
  onStarredClick,
}: MemoCardSharedProps & { memo: MemoRead }) {
  // query
  const attachedObject = useGetMemosAttachedObject(memo.attached_object_type)(memo.attached_object_id);

  const handleClick = () => {
    if (onClick) {
      onClick(memo);
    }
  };

  // rendering
  return (
    <Card variant="outlined">
      <CardHeader
        title={
          <>
            {attachedObject.isSuccess ? (
              <AttachedObjectLink attachedObject={attachedObject.data} attachedObjectType={memo.attached_object_type} />
            ) : (
              <>...</>
            )}
          </>
        }
        action={<MemoActionsMenu memo={memo} onDeleteClick={onDeleteClick} onStarredClick={onStarredClick} />}
        titleTypographyProps={{
          variant: "body1",
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
        }}
        sx={{ px: 1, py: 0.5 }}
      />
      <Divider />
      <CardActionArea onClick={handleClick}>
        <CardContent sx={{ p: 1, pb: "8px !important" }}>
          <Typography
            variant="body1"
            sx={{
              wordBreak: "break-word",
            }}
          >
            {memo.title}
          </Typography>
          <Stack direction="row" alignItems="center" mt={1} justifyContent="space-between">
            <Typography variant="subtitle2" color="textSecondary" fontWeight={600} fontSize={12}>
              {"Last modified: " +
                dateToLocaleString(memo.updated).substring(0, dateToLocaleString(memo.updated).indexOf(","))}
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

export default MemoCard;
