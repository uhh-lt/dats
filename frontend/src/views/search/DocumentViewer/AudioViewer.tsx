import { Box } from "@mui/material";
import ReactPlayer from "react-player";
import React, { useMemo, useRef, useState } from "react";
import { SourceDocumentRead, AnnotationDocumentRead } from "../../../api/openapi";
import { OnProgressProps } from "react-player/base";
import SdocHooks from "../../../api/SdocHooks";

interface AudioViewerProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead | null;
  showEntities: boolean;
  width?: number;
  height?: number;
}

function AudioViewer({ sdoc, width, height }: AudioViewerProps) {
  // local client state
  const [highlightedWordId, setHighlightedWordId] = useState(-1);
  const audioPlayerRef = useRef<ReactPlayer>(null);

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
    if (!audioPlayerRef.current) return;
    audioPlayerRef.current.seekTo(timestamp / 1000);
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
          width={width ?? 640}
          height={height ?? 360}
          onProgress={handleProgress}
          ref={audioPlayerRef}
        />
      </Box>
      <h3>Transcript:</h3>
      <div>{transcript}</div>
    </>
  );
}

export default AudioViewer;
