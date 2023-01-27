import { CardMedia, CardProps, Typography } from "@mui/material";
import { SearchResultProps } from "../SearchResultProps";
import SdocHooks from "../../../../api/SdocHooks";
import * as React from "react";
import { DocType } from "../../../../api/openapi";
import { toThumbnailUrl } from "../../utils";
import SearchResultCardBase from "./SearchResultCardBase";
import { useAppSelector } from "../../../../plugins/ReduxHooks";
import ReactWordcloud, { OptionsProp, Word } from "react-wordcloud";

function LexicalSearchResultCard({
  sdocId,
  handleClick,
  handleOnContextMenu,
  handleOnCheckboxChange,
  ...props
}: SearchResultProps & CardProps) {

  const searchResStyle = useAppSelector((state) => state.settings.search.SearchResStyle);

  // query (global server state)
  const content = SdocHooks.useGetDocumentContent(sdocId);
  const wordFrequencies = SdocHooks.useGetWordFrequencies(sdocId);

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

  const frequenciesToWordCloudInput = () => {
    let entries: [string, number][] = Object.entries(JSON.parse(wordFrequencies.data!.value))
    // sort array descending
    entries.sort(function(a, b){return b[1] - a[1]})
    return entries.slice(0, 20).map(e => {return {text: e[0], value: e[1]} as Word})
  }

  return (
    <SearchResultCardBase
      sdocId={sdocId}
      handleClick={handleClick}
      handleOnContextMenu={handleOnContextMenu}
      handleOnCheckboxChange={handleOnCheckboxChange}
      {...props}
      renderContent={(sdoc) => {
        if (content.isSuccess) {
          return (
            <>
              {sdoc.doctype === DocType.TEXT ? (
                  searchResStyle === "text" ?
                    <Typography sx={{ mb: 1.5, overflow: "hidden", height: 200, textOverflow: "ellipsis" }} variant="body2">
                      {content.data.content}
                    </Typography> :
                    <div style={{ width: 350, height: 200 }}>
                      <ReactWordcloud options={wordCloudOptions}
                                        size={[300, 200]}
                                        words={frequenciesToWordCloudInput()} />
                    </div>
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
                  DOC TYPE IS NOT SUPPORTED :(
                </Typography>
              )}
            </>
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
      }}
    />
  );
}

export default LexicalSearchResultCard;
