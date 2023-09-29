import { Box, Tooltip } from "@mui/material";
import ReactPlayer from "react-player";
import React, { useMemo, useRef, useState } from "react";
import { SourceDocumentRead, AnnotationDocumentRead } from "../../../api/openapi";
import { OnProgressProps } from "react-player/base";
import SdocHooks from "../../../api/SdocHooks";

interface AudioVideoViewerProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead | null;
  showEntities: boolean;
  width?: number;
  height?: number;
}

function AudioVideoViewer({ sdoc, width, height }: AudioVideoViewerProps) {
  // local client state
  const [highlightedWordId, setHighlightedWordId] = useState(-1);
  const playerRef = useRef<ReactPlayer>(null);
  const currentHighlightedWordSpanRef = useRef<HTMLSpanElement>(null);

  // global server state (react-query)
  const transcriptWords = SdocHooks.useGetWordLevelTranscriptions(sdoc.id);

  // ui events
  const handleProgress = (state: OnProgressProps) => {
    if (!transcriptWords.data) return;

    // TODO: this is not very efficient!
    let time = state.playedSeconds * 1000;
    let wordId = transcriptWords.data.findIndex((word) => word.start_ms >= time && time <= word.end_ms);
    setHighlightedWordId(wordId);
    if (currentHighlightedWordSpanRef.current) {
      currentHighlightedWordSpanRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  const handleJumpToTimestamp = (timestamp: number, wordId: number) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(timestamp / 1000);
    setHighlightedWordId(wordId);
  };

  const transcript = useMemo(() => {
    if (!transcriptWords.data) return null;

    return transcriptWords.data.map((word, index) => {
      return (
        <Tooltip title={`Click to jump to ${(word.start_ms / 1000).toFixed(2)} sec`} key={index}>
          <span
            key={index}
            style={{
              color: index === highlightedWordId ? "red" : undefined,
              fontSize: index === highlightedWordId ? "1.5em" : undefined,
              fontWeight: index === highlightedWordId ? "bold" : undefined,
              cursor: "pointer"
            }}
            onClick={() => handleJumpToTimestamp(word.start_ms, index)}
            ref={index === highlightedWordId ? currentHighlightedWordSpanRef : undefined}
          >
            {word.text}{" "}
          </span>
        </Tooltip>
      );
    });
  }, [transcriptWords.data, highlightedWordId]);

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <ReactPlayer
          url={sdoc.content}
          controls={true}
          width={width ?? 640}
          height={height ?? 360}
          onProgress={handleProgress}
          ref={playerRef}
        />
      </Box>
      <h3>Automatic Transcription:</h3>
      <Box sx={{ maxHeight: 200, height: 200, overflowY: "scroll", border: "1px solid grey", borderRadius: 1}} >
          {transcript}
      </Box>
    </>
  );
}

export default AudioVideoViewer;
