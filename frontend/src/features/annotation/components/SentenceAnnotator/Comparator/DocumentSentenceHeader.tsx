import { Button, Stack, Typography } from "@mui/material";
import { UserRenderer } from "../../../../../core/user/renderer/UserRenderer.tsx";
import { UseGetSentenceAnnotator } from "../useGetSentenceAnnotator.ts";

interface DocumentSentenceHeaderProps {
  leftUserId: number | undefined;
  rightUserId: number | undefined;
  numSentenceDigits: number;
  annotatorLeft: UseGetSentenceAnnotator;
  annotatorRight: UseGetSentenceAnnotator;
  showBulkActions: boolean;
  onClickRevertAll: () => void;
  onClickApplyAll: () => void;
  isDirectionLeft: boolean;
}

export function DocumentSentenceHeader({
  leftUserId,
  rightUserId,
  numSentenceDigits,
  annotatorLeft,
  annotatorRight,
  showBulkActions,
  onClickApplyAll,
  onClickRevertAll,
  isDirectionLeft,
}: DocumentSentenceHeaderProps) {
  return (
    <Stack direction="row" width="100%">
      <DocumentSentenceHeaderPart userId={leftUserId} numSentenceDigits={numSentenceDigits} annotator={annotatorLeft} />
      {showBulkActions && (
        <>
          <div
            style={{
              paddingRight: "8px",
              borderRight: "1px solid #e8eaed",
            }}
          />
          <div
            style={{
              flexShrink: 0,
              width: 164,
              alignSelf: "center",
            }}
          >
            <Stack direction="row" alignItems="center">
              {isDirectionLeft ? (
                <Button onClick={onClickApplyAll}>Apply</Button>
              ) : (
                <Button onClick={onClickRevertAll}>Revert</Button>
              )}
              <Typography variant="button" color="primary">
                |
              </Typography>
              {isDirectionLeft ? (
                <Button onClick={onClickRevertAll}>Revert</Button>
              ) : (
                <Button onClick={onClickApplyAll}>Apply</Button>
              )}
              <Typography variant="button" color="primary" sx={{ pr: 1 }}>
                All
              </Typography>
            </Stack>
          </div>
        </>
      )}
      <DocumentSentenceHeaderPart
        userId={rightUserId}
        numSentenceDigits={numSentenceDigits}
        annotator={annotatorRight}
      />
    </Stack>
  );
}

interface DocumentSentenceHeaderPartProps {
  userId: number | undefined;
  numSentenceDigits: number;
  annotator: UseGetSentenceAnnotator;
}

function DocumentSentenceHeaderPart({ userId, numSentenceDigits, annotator }: DocumentSentenceHeaderPartProps) {
  return (
    <>
      <div
        style={{
          paddingRight: "8px",
          borderLeft: "1px solid #e8eaed",
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        }}
      />
      <div
        style={{
          flexShrink: 0,
          color: "transparent",
          alignSelf: "stretch",
          paddingTop: "8px",
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        }}
      >
        {String(0).padStart(numSentenceDigits, "0")}
      </div>
      <div
        style={{
          paddingRight: "8px",
          borderRight: "1px solid #e8eaed",
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        }}
      />
      <Typography style={{ flexGrow: 1, flexBasis: 1, paddingLeft: "16px" }} variant="h6">
        {userId ? (
          <Stack direction="row" alignItems="center">
            <UserRenderer user={userId} />
            {"'s Annotations"}
          </Stack>
        ) : (
          "Select user first"
        )}
      </Typography>
      {Array.from({ length: annotator.numPositions + 1 }, (_, i) => i).map((annoPosition) => {
        return (
          <div
            key={annoPosition}
            style={{ flexShrink: 0, borderRight: "4px solid transparent", paddingLeft: "16px" }}
          />
        );
      })}
    </>
  );
}
