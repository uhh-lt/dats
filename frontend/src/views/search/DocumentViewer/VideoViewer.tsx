import { Box } from "@mui/material";
import React, { useMemo, useRef, useState } from "react";
import ReactPlayer from "react-player";
import SdocHooks from "../../../api/SdocHooks";
import { AnnotationDocumentRead, SourceDocumentRead } from "../../../api/openapi";
import { OnProgressProps } from "react-player/base";

interface VideoViewerProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead | null;
  showEntities: boolean;
  width?: number;
  height?: number;
}

function VideoViewer({ sdoc, width, height }: VideoViewerProps) {
  // local client state
  const [highlightedWordId, setHighlightedWordId] = useState(-1);
  const videoPlayerRef = useRef<ReactPlayer>(null);

  // global server state (react-query)
  const transcriptWords = SdocHooks.useGetWordLevelTranscriptions(sdoc.id);

  // ui events
  const handleProgress = (state: OnProgressProps) => {
    if (!transcriptWords.data) return;

    // TODO: this is not very efficient!
    let time = state.playedSeconds * 1000;
    let wordId = transcriptWords.data.findIndex((word) => word.start_ms >= time && time <= word.end_ms);
    setHighlightedWordId(wordId);
  };

  const handleJumpToTimestamp = (timestamp: number, wordId: number) => {
    if (!videoPlayerRef.current) return;
    videoPlayerRef.current.seekTo(timestamp / 1000);
    setHighlightedWordId(wordId);
  };

  const transcript = useMemo(() => {
    if (!transcriptWords.data) return null;

    return transcriptWords.data.map((word, index) => {
      return (
        <span
          key={index}
          style={{ color: index === highlightedWordId ? "red" : undefined, cursor: "pointer" }}
          onClick={() => handleJumpToTimestamp(word.start_ms, index)}
        >
          {word.text}{" "}
        </span>
      );
    });
  }, [transcriptWords.data, highlightedWordId]);

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <ReactPlayer
          url={sdoc.content}
          controls={true}
          width={width ?? 800}
          height={height ?? 600}
          onProgress={handleProgress}
          ref={videoPlayerRef}
        />
      </Box>
      <h3>Transcript:</h3>
      <div>{transcript}</div>
    </>
  );
}

export default VideoViewer;
