import { Box, Card, CardContent, CardHeader, Typography } from "@mui/material";
import React, { forwardRef } from "react";
import MemoHooks from "../../api/MemoHooks.ts";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import useGetMemosAttachedObject from "../../features/Memo/useGetMemosAttachedObject.ts";
import { dateToLocaleString } from "../../utils/DateUtils.ts";
import AttachedObjectLink from "./AttachedObjectLink.tsx";
import "./MemoCard.css";
import { MemoCardContextMenuData } from "./MemoResults.tsx";

import SdocHooks from "../../api/SdocHooks.ts";
import { DocType } from "../../api/openapi/models/DocType.ts";
import { docTypeToIcon } from "../../features/DocumentExplorer/docTypeToIcon.tsx";
import MemoCardActionsMenu from "./MemoCardActionsMenu.tsx";
interface MemoCardProps {
  memoId: number;
  onContextMenu: (data: MemoCardContextMenuData) => (event: React.MouseEvent) => void;
  style: React.CSSProperties;
  dataIndex: number;
}

const MemoCard = forwardRef<HTMLDivElement, MemoCardProps>(({ memoId, onContextMenu, style, dataIndex }, ref) => {
  // query
  const memo = MemoHooks.useGetMemo(memoId);
  const attachedObject = useGetMemosAttachedObject(memo.data?.attached_object_type)(memo.data?.attached_object_id);
  const sdoc = SdocHooks.useGetDocumentByAdocId(attachedObject.data?.id);
  // ui event handlers
  const handleHoverEnter = () => {
    switch (memo.data?.attached_object_type) {
      case AttachedObjectType.SPAN_ANNOTATION: {
        const spans = Array.from(document.getElementsByClassName(`span-${memo.data.attached_object_id}`));
        spans.forEach((element) => {
          element.classList.add("hovered");
        });
        break;
      }
      case AttachedObjectType.BBOX_ANNOTATION: {
        const boxes = Array.from(document.getElementsByClassName(`bbox-${memo.data.attached_object_id}`));
        boxes.forEach((element) => {
          element.classList.add("hovered");
        });
        break;
      }
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
    <Box style={style} ref={ref} data-index={dataIndex}>
      <Card
        variant="outlined"
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
              title={
                <>
                  {docTypeToIcon[sdoc.data ? sdoc.data.doctype : DocType.FILE]}
                  {memo.data.title}
                </>
              }
              action={<MemoCardActionsMenu memo={memo} />}
              subheader={
                <Typography variant="body2" color="text.secondary">
                  <AttachedObjectLink
                    attachedObject={attachedObject.data}
                    attachedObjectType={memo.data.attached_object_type}
                  />
                </Typography>
              }
              titleTypographyProps={{
                variant: "body1",
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
              }}
            />
            <CardContent sx={{ py: 0, my: 0, pb: "16px !important" }}>
              <Typography
                variant="body1"
                sx={{
                  wordBreak: "break-word",
                }}
              >
                {memo.data.content}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} fontSize={11} mt={1}>
                {"Last modified: " +
                  dateToLocaleString(memo.data.updated).substring(
                    0,
                    dateToLocaleString(memo.data.updated).indexOf(","),
                  )}
              </Typography>
            </CardContent>
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
    </Box>
  );
});

export default MemoCard;
