import { Close } from "@mui/icons-material";
import {
  Box,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { scaleLog } from "@visx/scale";
import { Text } from "@visx/text";
import { Wordcloud } from "@visx/wordcloud";
import { useState } from "react";
import { WordFrequencyStat } from "../../../api/openapi/models/WordFrequencyStat.ts";

interface WordCloudProps {
  width: number;
  height: number;
  words: WordFrequencyStat[];
  showControls?: boolean;
  onClose: () => void;
}

const colors = ["#143059", "#2F6B9A", "#82a6c2"];

function getRotationDegree() {
  const rand = Math.random();
  const degree = rand > 0.5 ? 60 : -60;
  return rand * degree;
}

const fixedValueGenerator = () => 0.5;

type SpiralType = "archimedean" | "rectangular";

export default function WordCloud({ width, height, words, showControls = true, onClose }: WordCloudProps) {
  const [spiralType, setSpiralType] = useState<SpiralType>("archimedean");
  const [withRotation, setWithRotation] = useState<boolean>(false);

  const fontScale = scaleLog({
    domain: [Math.min(...words.map((w) => w.count)), Math.max(...words.map((w) => w.count))],
    range: [10, 100],
  });

  const fontSizeSetter = (datum: { text: string; value: number }) => {
    return fontScale(datum.value);
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
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          p: 3,
        }}
      >
        <Typography variant="h5">Word Cloud</Typography>
        <IconButton onClick={onClose} size="small" sx={{ position: "absolute", top: 3, right: 3 }}>
          <Close />
        </IconButton>
      </Box>
      <Divider />
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
      {showControls && (
        <Box sx={{ mt: 2, display: "flex", gap: 3, alignItems: "center" }}>
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
        </Box>
      )}
    </Box>
  );
}
