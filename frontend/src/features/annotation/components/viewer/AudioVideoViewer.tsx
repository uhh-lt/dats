import { Box, Tooltip } from "@mui/material";
import { useMemo, useRef, useState } from "react";
import ReactPlayer from "react-player";
import type { OnProgressProps } from "react-player/base.d.ts";
import { SourceDocumentDataRead } from "../../../../api/openapi/models/SourceDocumentDataRead.ts";

interface AudioVideoViewerProps {
  sdocData: SourceDocumentDataRead;
  showEntities: boolean;
  width?: string | number;
  height?: string | number;
}

export function AudioVideoViewer({ sdocData, width, height }: AudioVideoViewerProps) {
  // local client state
  const [highlightedWordId, setHighlightedWordId] = useState(-1);
  const playerRef = useRef<ReactPlayer>(null);
  const currentHighlightedWordSpanRef = useRef<HTMLSpanElement>(null);

  // ui events
  const handleProgress = (state: OnProgressProps) => {
    if (!sdocData.word_level_transcriptions) return;

    // TODO: this is not very efficient!
    const time = state.playedSeconds * 1000;
    const wordId = sdocData.word_level_transcriptions.findIndex((word) => word.start_ms >= time && time <= word.end_ms);
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
    if (!sdocData.word_level_transcriptions) return null;

    return sdocData.word_level_transcriptions.map((word, index) => {
      return (
        <Tooltip title={`Click to jump to ${(word.start_ms / 1000).toFixed(2)} sec`} key={index}>
          <span
            key={index}
            style={{
              color: index === highlightedWordId ? "red" : undefined,
              fontSize: index === highlightedWordId ? "1.5em" : undefined,
              fontWeight: index === highlightedWordId ? "bold" : undefined,
              cursor: "pointer",
            }}
            onClick={() => handleJumpToTimestamp(word.start_ms, index)}
            ref={index === highlightedWordId ? currentHighlightedWordSpanRef : undefined}
          >
            {word.text}{" "}
          </span>
        </Tooltip>
      );
    });
  }, [sdocData.word_level_transcriptions, highlightedWordId]);

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <ReactPlayer
          url={encodeURI("/content/" + sdocData.repo_url)}
          controls={true}
          width={width}
          height={height}
          onProgress={handleProgress}
          ref={playerRef}
        />
      </Box>
      <h3>Automatic Transcription:</h3>
      <Box sx={{ maxHeight: 200, height: 200, overflowY: "scroll", border: "1px solid grey", borderRadius: 1 }}>
        {transcript}
      </Box>
    </>
  );
}
