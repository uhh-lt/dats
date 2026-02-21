import CloudIcon from "@mui/icons-material/Cloud";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import { scaleLog } from "@visx/scale";
import { Text } from "@visx/text";
import { Wordcloud } from "@visx/wordcloud";
import { toPng } from "html-to-image";
import { useCallback, useRef, useState } from "react";
import { WordFrequencyStat } from "../../../api/openapi/models/WordFrequencyStat.ts";
import { DATSToolbar } from "../../../components/MUI/DATSToolbar.tsx";

interface WordCloudProps {
  width: number;
  height: number;
  words: WordFrequencyStat[];
}

const colors = ["#143059", "#2F6B9A", "#82a6c2"];

function getRotationDegree() {
  const rand = Math.random();
  const degree = rand > 0.5 ? 60 : -60;
  return rand * degree;
}

const fixedValueGenerator = () => 0.5;

type SpiralType = "archimedean" | "rectangular";

export function WordCloud({ width, height, words }: WordCloudProps) {
  const [spiralType, setSpiralType] = useState<SpiralType>("archimedean");
  const [withRotation, setWithRotation] = useState<boolean>(false);
  const wordCloudRef = useRef<HTMLDivElement>(null);

  const fontSizeSetter = useCallback(
    (datum: { text: string; value: number }) => {
      const fontScale = scaleLog({
        domain: [Math.min(...words.map((w) => w.count)), Math.max(...words.map((w) => w.count))],
        range: [10, 100],
      });

      return fontScale(datum.value);
    },
    [words],
  );

  const hasWords = words.length > 0;

  const handleExport = () => {
    if (wordCloudRef.current === null) return;

    toPng(wordCloudRef.current, {
      backgroundColor: "white",
    }).then((dataUrl) => {
      const link = document.createElement("a");
      link.download = "word-cloud.png";
      link.href = dataUrl;
      link.click();
    });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <DATSToolbar variant="dense">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select value={spiralType} onChange={(e) => setSpiralType(e.target.value as SpiralType)} displayEmpty>
            <MenuItem value="archimedean">Archimedean Spiral</MenuItem>
            <MenuItem value="rectangular">Rectangular Spiral</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Checkbox checked={withRotation} onChange={(e) => setWithRotation(e.target.checked)} size="small" />}
          label="Enable Rotation"
        />
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Export Word Cloud">
          <IconButton onClick={handleExport} size="small">
            <SaveAltIcon />
          </IconButton>
        </Tooltip>
      </DATSToolbar>
      <Box
        ref={wordCloudRef}
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {hasWords ? (
          <Wordcloud
            words={words.map((w) => ({ text: w.word, value: w.count }))}
            width={width}
            height={height}
            fontSize={fontSizeSetter}
            font={"Impact"}
            padding={2}
            spiral={spiralType}
            rotate={withRotation ? getRotationDegree : 0}
            random={fixedValueGenerator}
          >
            {(cloudWords) =>
              cloudWords.map((w, i) => (
                <Text
                  key={w.text}
                  fill={colors[i % colors.length]}
                  textAnchor={"middle"}
                  transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
                  fontSize={w.size}
                  fontFamily={w.font}
                >
                  {w.text}
                </Text>
              ))
            }
          </Wordcloud>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: height,
              width: width,
              p: 3,
              textAlign: "center",
            }}
          >
            <CloudIcon
              sx={{
                fontSize: "64px",
                color: "text.secondary",
              }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No words selected
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select words from the table to visualize them as a word cloud
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
