import { CardMedia, CardProps, Typography } from "@mui/material";
import { SearchResultProps } from "../SearchResultProps";
import SdocHooks from "../../../../api/SdocHooks";
import * as React from "react";
import { DocType, SourceDocumentRead } from "../../../../api/openapi";
import { toThumbnailUrl } from "../../utils";
import SearchResultCardBase from "./SearchResultCardBase";
import { useAppSelector } from "../../../../plugins/ReduxHooks";
import ReactWordcloud, { OptionsProp, Word } from "react-wordcloud";
import { useMemo } from "react";

function LexicalSearchResultCard({
  sdocId,
  handleClick,
  handleOnContextMenu,
  handleOnCheckboxChange,
  ...props
}: SearchResultProps & CardProps) {
  return (
    <SearchResultCardBase
      sdocId={sdocId}
      handleClick={handleClick}
      handleOnContextMenu={handleOnContextMenu}
      handleOnCheckboxChange={handleOnCheckboxChange}
      {...props}
      renderContent={(sdoc) => (
        <>
          {sdoc.doctype === DocType.TEXT ? (
            <LexicalSearchResultCardTextContent sdoc={sdoc} />
          ) : sdoc.doctype === DocType.IMAGE ? (
            <CardMedia
              sx={{ mb: 1.5 }}
              component="img"
              height="200"
              image={toThumbnailUrl(sdoc.content)}
              alt="Paella dish"
            />
          ) : (
            <Typography sx={{ mb: 1.5, overflow: "hidden", height: 200, textOverflow: "ellipsis" }} variant="body2">
              DOC TYPE IS NOT SUPPORTED
            </Typography>
          )}
        </>
      )}
    />
  );
}

const wordCloudOptions: OptionsProp = {
  enableTooltip: true,
  deterministic: true,
  fontFamily: "impact",
  fontSizes: [15, 35],
  padding: 1,
  scale: "sqrt",
  transitionDuration: 0,
  rotations: 2,
  rotationAngles: [-90, 0],
};

function LexicalSearchResultCardTextContent({ sdoc }: { sdoc: SourceDocumentRead }) {
  // global client state (redux)
  const searchResStyle = useAppSelector((state) => state.settings.search.SearchResStyle);

  // rendering
  if (searchResStyle === "text") {
    return <TextContent sdoc={sdoc} />;
  }
  return <WordCloudContent sdoc={sdoc} />;
}

function WordCloudContent({ sdoc }: { sdoc: SourceDocumentRead }) {
  // global server state (react-query)
  const wordFrequencies = SdocHooks.useGetWordFrequencies(sdoc.id);

  // computed
  const wordCloudInput = useMemo(() => {
    if (!wordFrequencies.data) return [];

    let entries: [string, number][] = Object.entries(JSON.parse(wordFrequencies.data.value));
    entries.sort((a, b) => b[1] - a[1]); // sort array descending
    return entries.slice(0, 20).map((e) => {
      return { text: e[0], value: e[1] } as Word;
    });
  }, [wordFrequencies.data]);

  // rendering
  return (
    <div style={{ width: 350, height: 200 }}>
      <ReactWordcloud options={wordCloudOptions} size={[300, 200]} words={wordCloudInput} />
    </div>
  );
}

function TextContent({ sdoc }: { sdoc: SourceDocumentRead }) {
  // global server state (react-query)
  const content = SdocHooks.useGetDocumentContent(sdoc.id);

  // rendering
  if (content.isSuccess) {
    return (
      <Typography sx={{ mb: 1.5, overflow: "hidden", height: 200, textOverflow: "ellipsis" }} variant="body2">
        {content.data.content}
      </Typography>
    );
  }

  if (content.isError) {
    return (
      <Typography sx={{ mb: 1.5 }} variant="body2">
        {content.error.message}
      </Typography>
    );
  }

  return (
    <Typography sx={{ mb: 1.5 }} variant="body2">
      Loading ...
    </Typography>
  );
}

export default LexicalSearchResultCard;
