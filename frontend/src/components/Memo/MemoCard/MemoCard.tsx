import { Card, CardContent, CardHeader, CircularProgress, Typography } from "@mui/material";
import React from "react";
import MemoHooks from "../../../api/MemoHooks.ts";
import { MemoRead } from "../../../api/openapi/models/MemoRead.ts";
import { dateToLocaleString } from "../../../utils/DateUtils.ts";
import AttachedObjectLink from "../../../views/logbook/AttachedObjectLink.tsx";
import { attachedObjectTypeToIcon } from "../attachedObjectTypeToIcon.tsx";
import useGetMemosAttachedObject from "../useGetMemosAttachedObject.ts";
import MemoCardActionsMenu from "./MemoCardActionsMenu.tsx";

interface MemoCardSharedProps {
  onMouseEnter?: (memo: MemoRead) => (event: React.MouseEvent) => void;
  onMouseLeave?: (memo: MemoRead) => (event: React.MouseEvent) => void;
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

function MemoCardWithContent({ memo, onMouseEnter, onMouseLeave }: MemoCardSharedProps & { memo: MemoRead }) {
  // query
  const attachedObject = useGetMemosAttachedObject(memo.attached_object_type)(memo.attached_object_id);

  // TODO: implement hover highlighting
  // // ui event handlers
  // const handleHoverEnter = () => {
  //   switch (memo.data?.attached_object_type) {
  //     case AttachedObjectType.SPAN_ANNOTATION: {
  //       const spans = Array.from(document.getElementsByClassName(`span-${memo.data.attached_object_id}`));
  //       spans.forEach((element) => {
  //         element.classList.add("hovered");
  //       });
  //       break;
  //     }
  //     case AttachedObjectType.BBOX_ANNOTATION: {
  //       const boxes = Array.from(document.getElementsByClassName(`bbox-${memo.data.attached_object_id}`));
  //       boxes.forEach((element) => {
  //         element.classList.add("hovered");
  //       });
  //       break;
  //     }
  //   }
  // };

  // const handleHoverLeave = () => {
  //   const elements = Array.from(document.getElementsByClassName(`hovered`));
  //   elements.forEach((element) => {
  //     element.classList.remove("hovered");
  //   });
  // };

  // rendering
  return (
    <Card
      variant="outlined"
      onMouseEnter={onMouseEnter ? onMouseEnter(memo) : undefined}
      onMouseLeave={onMouseLeave ? onMouseLeave(memo) : undefined}
    >
      <CardHeader
        title={
          <>
            {attachedObjectTypeToIcon[memo.attached_object_type]}
            {memo.title}
          </>
        }
        action={<MemoCardActionsMenu memo={memo} />}
        subheader={
          <Typography variant="body2" color="text.secondary">
            {attachedObject.isSuccess ? (
              <AttachedObjectLink attachedObject={attachedObject.data} attachedObjectType={memo.attached_object_type} />
            ) : (
              <>...</>
            )}
          </Typography>
        }
        titleTypographyProps={{
          variant: "body1",
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
        }}
      />
      <CardContent sx={{ py: 0, pb: "16px !important" }}>
        <Typography
          variant="body1"
          sx={{
            wordBreak: "break-word",
          }}
        >
          {memo.content}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={600} fontSize={11} mt={1}>
          {"Last modified: " +
            dateToLocaleString(memo.updated).substring(0, dateToLocaleString(memo.updated).indexOf(","))}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default MemoCard;
