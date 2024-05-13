import { Box, Card, CardContent, CardHeader, Grid, Typography } from "@mui/material";
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
              title={
                <Grid container>
                  <Grid item xs={1}>
                    {docTypeToIcon[sdoc.data ? sdoc.data.doctype : DocType.FILE]}
                  </Grid>
                  <Grid item xs={10}>
                    <Typography variant={"body1"} fontWeight={600}>
                      {memo.data.title}
                    </Typography>
                  </Grid>
                  <Grid item xs={1}>
                    <MemoCardActionsMenu memo={memo} />
                  </Grid>
                </Grid>
              }
              subheader={
                <>
                  <Typography color="text.secondary"></Typography>
                  <Typography variant="body2" sx={{ mb: 1.5 }} color="text.secondary">
                    <AttachedObjectLink
                      attachedObject={attachedObject.data}
                      attachedObjectType={memo.data.attached_object_type}
                    />
                  </Typography>
                </>
              }
              sx={{ pb: 0, pt: 1 }}
              titleTypographyProps={{
                variant: "body1",
                fontWeight: 900,
              }}
            />
            <CardContent sx={{ py: 0, my: 0 }}>
              <Typography
                variant="body1"
                sx={{
                  wordBreak: "break-word",
                  // height: "5em",
                  // overflow: "auto",
                }}
              >
                {memo.data.content}
              </Typography>
            </CardContent>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} fontSize={11}>
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
