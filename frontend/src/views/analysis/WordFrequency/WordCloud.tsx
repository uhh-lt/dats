import SaveAltIcon from "@mui/icons-material/SaveAlt";
import {
  Box,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { scaleLog } from "@visx/scale";
import { Text } from "@visx/text";
import { Wordcloud } from "@visx/wordcloud";
import { toPng } from "html-to-image";
import { useRef, useState } from "react";
import { WordFrequencyStat } from "../../../api/openapi/models/WordFrequencyStat.ts";

interface WordCloudProps {
  width: number;
  height: number;
  words: WordFrequencyStat[];
  showControls?: boolean;
}

const colors = ["#143059", "#2F6B9A", "#82a6c2"];

function getRotationDegree() {
  const rand = Math.random();
  const degree = rand > 0.5 ? 60 : -60;
  return rand * degree;
}

const fixedValueGenerator = () => 0.5;

type SpiralType = "archimedean" | "rectangular";

export default function WordCloud({ width, height, words, showControls = true }: WordCloudProps) {
  const [spiralType, setSpiralType] = useState<SpiralType>("archimedean");
  const [withRotation, setWithRotation] = useState<boolean>(false);
  const wordCloudRef = useRef<HTMLDivElement>(null);

  const fontScale = scaleLog({
    domain: [Math.min(...words.map((w) => w.count)), Math.max(...words.map((w) => w.count))],
    range: [10, 100],
  });

  const fontSizeSetter = (datum: { text: string; value: number }) => {
    return fontScale(datum.value);
  };

  const hasWords = words.length > 0;

  const handleExport = () => {
    if (wordCloudRef.current === null) return;

    toPng(wordCloudRef.current, {
      filter: (node) => !node?.classList?.contains("word-cloud-controls"),
      backgroundColor: "white",
    }).then((dataUrl) => {
      const link = document.createElement("a");
      link.download = "word-cloud.png";
      link.href = dataUrl;
      link.click();
    });
  };

  return (
    <Box
      component={"div"}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        userSelect: "none",
        backgroundColor: "white",
        height: "100%",
      }}
    >
      {showControls && (
        <Toolbar
          variant="dense"
          sx={{ width: "100%", justifyContent: "flex-end", gap: 2, mt: 1 }}
          className="word-cloud-controls"
        >
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select value={spiralType} onChange={(e) => setSpiralType(e.target.value as SpiralType)} displayEmpty>
              <MenuItem value="archimedean">Archimedean Spiral</MenuItem>
              <MenuItem value="rectangular">Rectangular Spiral</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox checked={withRotation} onChange={(e) => setWithRotation(e.target.checked)} size="small" />
            }
            label="Enable Rotation"
          />
          <Tooltip title="Export Word Cloud">
            <IconButton onClick={handleExport} size="small">
              <SaveAltIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      )}
      <Divider sx={{ width: "100%", mt: 1, mb: 1, boxShadow: 1 }} />
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
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No words selected
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select words from the table to visualize them in the word cloud
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
