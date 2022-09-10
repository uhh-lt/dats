import React, { useMemo } from "react";
import { Card, CardActions, CardContent, CardHeader, Typography } from "@mui/material";
import Avatar from "@mui/material/Avatar";
import "./MemoCard.css";
import { MemoColors, MemoNames, MemoShortnames } from "./MemoEnumUtils";
import MemoHooks from "../../api/MemoHooks";
import useGetMemosAttachedObject from "../../features/memo-dialog/useGetMemosAttachedObject";
import AttachedObjectLink from "./AttachedObjectLink";
import { AttachedObjectType } from "../../api/openapi";
import MemoEditButton from "../../features/memo-dialog/MemoEditButton";
import MemoStarButton from "../../features/memo-dialog/MemoStarButton";
import { MemoCardContextMenuData } from "./MemoResults";

interface MemoCardProps {
  memoId: number;
  filter: string | undefined;
  onContextMenu: (data: MemoCardContextMenuData) => (event: React.MouseEvent) => void;
}

function MemoCard({ memoId, filter, onContextMenu }: MemoCardProps) {
  // query
  const memo = MemoHooks.useGetMemo(memoId);
  const attachedObject = useGetMemosAttachedObject(memo.data?.attached_object_type)(memo.data?.attached_object_id);

  // computed
  // todo: the filtering should happen in the backend?
  const isFilteredOut = useMemo(() => {
    if (filter === undefined) {
      return false;
    }

    if (!memo.data) {
      return false;
    }

    if (filter === "important") {
      return !memo.data.starred;
    }

    return MemoNames[memo.data.attached_object_type] !== filter;
  }, [memo.data, filter]);

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
    <>
      {isFilteredOut ? null : (
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
        >
          {memo.isSuccess && attachedObject.isSuccess ? (
            <>
              <CardHeader
                avatar={
                  <Avatar sx={{ width: 32, height: 32, bgcolor: MemoColors[memo.data.attached_object_type] }}>
                    {MemoShortnames[memo.data.attached_object_type]}
                  </Avatar>
                }
                action={<MemoStarButton memoId={memo.data.id} isStarred={memo.data.starred} />}
                title={memo.data.title}
                sx={{ pb: 0, pt: 1 }}
                titleTypographyProps={{
                  variant: "h5",
                }}
              />
              <CardContent sx={{ py: 0, my: 1, maxHeight: 300, overflowY: "hidden" }}>
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
      )}
    </>
  );
}

export default MemoCard;
