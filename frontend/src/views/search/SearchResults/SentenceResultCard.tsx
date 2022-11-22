import {
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  Stack,
  styled,
  Tooltip,
  Typography,
} from "@mui/material";
import { SearchResultItem } from "./SearchResultItem";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import SdocHooks from "../../../api/SdocHooks";
import * as React from "react";
import { useMemo } from "react";
import MemoButton from "../../../features/memo-dialog/MemoButton";
import SearchResultTag from "./SearchResultTag";
import { AttachedObjectType, DocType, SimSearchSentenceHit } from "../../../api/openapi";
import Checkbox from "@mui/material/Checkbox";
import AnnotateButton from "../ToolBar/ToolBarElements/AnnotateButton";
import * as d3 from "d3";
import { toThumbnailUrl } from "../utils";

const colorScale = d3.scaleLinear([0, 1 / 3, 2 / 3, 1], ["red", "orange", "gold", "green"]);

interface ContextSentence {
  id: number;
  score: number;
  text: string;
}

const StyledCardHeader = styled(CardHeader)(() => ({
  color: "inherit",
  "& .MuiCardHeader-content": {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
}));

interface SentenceResultCardProps extends SearchResultItem {
  sentenceHits: SimSearchSentenceHit[];
}

function SentenceResultCard({
  sentenceHits,
  sdocId,
  handleClick,
  handleOnContextMenu,
  handleOnCheckboxChange,
}: SentenceResultCardProps) {
  // router
  const { projectId, sdocId: urlSdocId } = useParams() as { projectId: string; sdocId: string | undefined };

  // redux (global client state)
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);
  const isShowTags = useAppSelector((state) => state.search.isShowTags);

  // query (global server state)
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const tags = SdocHooks.useGetAllDocumentTags(sdocId);
  const sentences = SdocHooks.useGetDocumentSentences(sdocId);

  // computed
  const contextSentences: ContextSentence[] = useMemo(() => {
    if (sentences.data) {
      // mapping of sentence array index to SimSearchSentenceHit
      const myMap = new Map<number, SimSearchSentenceHit>();
      sentenceHits.forEach((hit) => {
        myMap.set(hit.sentence_id, hit);
      });

      const contextSentenceIds = new Set<number>();
      Array.from(myMap.keys()).forEach((index) => {
        contextSentenceIds.add(index);
        if (index - 1 >= 0) contextSentenceIds.add(index - 1);
        if (index + 1 < sentences.data.sentences.length) contextSentenceIds.add(index + 1);
      });

      const result: ContextSentence[] = [];
      sentences.data.sentences.forEach((sentence, index) => {
        // check if sentence is a highlighted sentence
        if (myMap.has(index)) {
          result.push({
            id: index,
            score: myMap.get(index)!.score,
            text: sentence,
          });
          // check if sentence is near a highlighted sentence
        } else if (contextSentenceIds.has(index)) {
          result.push({
            id: index,
            score: -1,
            text: sentence,
          });
          // only add empty sentence if it is the first sentence or if the previous sentence was not irrelevant
        } else if (result.length === 0 || result[result.length - 1].score !== -99) {
          result.push({
            id: index,
            score: -99,
            text: "[...]",
          });
        }
      });
      return result;
    }
    return [];
  }, [sentences.data, sentenceHits]);

  const isSelected = useMemo(() => {
    return selectedDocumentIds.indexOf(sdocId) !== -1;
  }, [sdocId, selectedDocumentIds]);

  const title = sdoc.isLoading ? "Loading" : sdoc.isError ? "Error: " : sdoc.isSuccess ? sdoc.data.filename : "";

  const labelId = `enhanced-table-checkbox-${sdocId}`;

  return (
    <Card
      sx={{ width: "100%" }}
      onContextMenu={handleOnContextMenu ? handleOnContextMenu(sdocId) : undefined}
      raised={isSelected || (parseInt(urlSdocId || "") === sdocId && selectedDocumentIds.length === 0)}
    >
      <CardActionArea onClick={() => handleClick(sdocId)}>
        <StyledCardHeader
          title={
            <Tooltip title={title} placement="top-start" enterDelay={500} followCursor>
              <Typography variant="h5">{title}</Typography>
            </Tooltip>
          }
          disableTypography
          action={
            <Tooltip title="Select document">
              <Checkbox
                color="primary"
                checked={isSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={handleOnCheckboxChange ? (event) => handleOnCheckboxChange(event, sdocId) : undefined}
                inputProps={{
                  "aria-labelledby": labelId,
                }}
                sx={{ flexShrink: 0 }}
                disabled={!sdoc.isSuccess}
              />
            </Tooltip>
          }
        />
        <CardContent sx={{ pt: 0 }}>
          {sdoc.isLoading && (
            <Typography sx={{ mb: 1.5 }} variant="body2">
              ...
            </Typography>
          )}
          {sdoc.isError && (
            <Typography sx={{ mb: 1.5 }} variant="body2">
              {sdoc.error.message}
            </Typography>
          )}
          {sdoc.isSuccess && sdoc.data.doctype === DocType.TEXT && (
            <Typography sx={{ mb: 1.5, overflow: "hidden", textOverflow: "ellipsis" }} variant="body2">
              {contextSentences.map((sentence) => (
                <span key={sentence.id}>
                  {sentence.score >= 0 ? (
                    <span style={{ backgroundColor: colorScale(sentence.score) }}>{sentence.text}</span>
                  ) : (
                    <>{sentence.text}</>
                  )}{" "}
                </span>
              ))}
            </Typography>
          )}
          {sdoc.isSuccess && sdoc.data.doctype === DocType.IMAGE && (
            <CardMedia
              sx={{ mb: 1.5 }}
              component="img"
              height="200"
              image={toThumbnailUrl(sdoc.data.content)}
              alt="Paella dish"
            />
          )}

          {tags.isLoading && <>...</>}
          {tags.isError && <>{tags.error.message}</>}
          {tags.isSuccess && isShowTags && tags.data.length > 0 && (
            <Stack direction={"row"} sx={{ alignItems: "center", height: 22 }}>
              {tags.data.map((tag) => (
                <SearchResultTag key={tag.id} tagId={tag.id} />
              ))}
            </Stack>
          )}
        </CardContent>
      </CardActionArea>
      <CardActions>
        <AnnotateButton projectId={projectId} sdocId={sdocId} />
        <MemoButton attachedObjectId={sdocId} attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT} />
      </CardActions>
    </Card>
  );
}

export default SentenceResultCard;
