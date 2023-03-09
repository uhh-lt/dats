import { Card, CardActions, CardContent, CardHeader, Typography } from "@mui/material";
import Avatar from "@mui/material/Avatar";
import React, { forwardRef } from "react";
import MemoHooks from "../../api/MemoHooks";
import { AttachedObjectType } from "../../api/openapi";
import MemoEditButton from "../../features/memo-dialog/MemoEditButton";
import MemoStarButton from "../../features/memo-dialog/MemoStarButton";
import useGetMemosAttachedObject from "../../features/memo-dialog/useGetMemosAttachedObject";
import AttachedObjectLink from "./AttachedObjectLink";
import "./MemoCard.css";
import { MemoColors, MemoShortnames } from "./MemoEnumUtils";
import { MemoCardContextMenuData } from "./MemoResults";

interface MemoCardProps {
  memoId: number;
  onContextMenu: (data: MemoCardContextMenuData) => (event: React.MouseEvent) => void;
  style: any;
  dataIndex: number;
}

const MemoCard = forwardRef<any, MemoCardProps>(({ memoId, onContextMenu, style, dataIndex }, ref) => {
  // query
  const memo = MemoHooks.useGetMemo(memoId);
  const attachedObject = useGetMemosAttachedObject(memo.data?.attached_object_type)(memo.data?.attached_object_id);

  // ui event handlers
  const handleHoverEnter = () => {
    switch (memo.data?.attached_object_type) {
      case AttachedObjectType.SPAN_ANNOTATION:
        const spans = Array.from(document.getElementsByClassName(`span-${memo.data.attached_object_id}`));
        spans.forEach((element) => {
          element.classList.add("hovered");
        });
        break;
      case AttachedObjectType.BBOX_ANNOTATION:
        const boxes = Array.from(document.getElementsByClassName(`bbox-${memo.data.attached_object_id}`));
        boxes.forEach((element) => {
          element.classList.add("hovered");
        });
        break;
    }
  };

  const handleHoverLeave = () => {
    const elements = Array.from(document.getElementsByClassName(`hovered`));
    elements.forEach((element) => {
      element.classList.remove("hovered");
    });
  };

  // rendering
  return (
    <Card
      variant="outlined"
      className="myMemoCard"
      onMouseEnter={() => handleHoverEnter()}
      onMouseLeave={() => handleHoverLeave()}
      onContextMenu={onContextMenu({
        memoId: memo.data?.id,
        memoStarred: memo.data?.starred,
        attachedObjectType: memo.data?.attached_object_type,
      })}
      style={style}
      ref={ref}
      data-index={dataIndex}
    >
      {memo.isSuccess && attachedObject.isSuccess ? (
        <>
          <CardHeader
            avatar={
              <Avatar sx={{ bgcolor: MemoColors[memo.data.attached_object_type] }}>
                {MemoShortnames[memo.data.attached_object_type]}
              </Avatar>
            }
            action={<MemoStarButton memoId={memo.data.id} isStarred={memo.data.starred} />}
            title={memo.data.title}
            subheader={`Created: ${new Date(memo.data.created).toLocaleDateString("en-CA")} Updated: ${new Date(
              memo.data.updated
            ).toLocaleDateString("en-CA")}`}
            sx={{ pb: 0, pt: 1 }}
            titleTypographyProps={{
              variant: "h5",
            }}
          />
          <CardContent sx={{ py: 0, my: 1, maxHeight: 300, overflowY: "hidden" }}>
            <Typography color="text.secondary"></Typography>
            <Typography sx={{ mb: 1.5 }} color="text.secondary">
              <AttachedObjectLink
                attachedObject={attachedObject.data}
                attachedObjectType={memo.data.attached_object_type}
              />
            </Typography>
            <Typography variant="body1">{memo.data.content}</Typography>
          </CardContent>
          <CardActions sx={{ px: 0.5, pt: 0, pb: 0.5 }}>
            <MemoEditButton
              memoId={memo.data.id}
              attachedObjectType={memo.data.attached_object_type}
              attachedObjectId={memo.data.attached_object_id}
            />
          </CardActions>
        </>
      ) : memo.isError ? (
        <CardHeader
          title={`Error: ${memo.error.message}`}
          sx={{ pb: 1, pt: 1 }}
          titleTypographyProps={{
            variant: "h5",
          }}
        />
      ) : (
        <CardHeader
          title="Loading..."
          sx={{ pb: 1, pt: 1 }}
          titleTypographyProps={{
            variant: "h5",
          }}
        />
      )}
    </Card>
  );
});

export default MemoCard;
