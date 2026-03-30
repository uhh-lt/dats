import { WordFrequencyStat } from "@api/models/WordFrequencyStat";
import { DATSToolbar } from "@components/DATSToolbar";
import { ReactWordcloud } from "@cp949/react-wordcloud";
import CloudIcon from "@mui/icons-material/Cloud";
import PaletteIcon from "@mui/icons-material/Palette";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import TuneIcon from "@mui/icons-material/Tune";
import TypeSpecimenIcon from "@mui/icons-material/TypeSpecimen";
import { Box, Button, IconButton, MenuItem, Popover, Stack, TextField, Tooltip, Typography } from "@mui/material";
import * as d3 from "d3";
import { toPng } from "html-to-image";
import { useMemo, useRef, useState } from "react";

interface WordCloudProps {
  width: number;
  height: number;
  words: WordFrequencyStat[];
}

const colorScales = {
  viridis: d3.interpolateViridis,
  cividis: d3.interpolateCividis,
  inferno: d3.interpolateInferno,
  magma: d3.interpolateMagma,
  plasma: d3.interpolatePlasma,
  turbo: d3.interpolateTurbo,
  warm: d3.interpolateWarm,
  cool: d3.interpolateCool,
  ylOrRd: d3.interpolateYlOrRd,
  rdBu: d3.interpolateRdBu,
  rdYlBu: d3.interpolateRdYlBu,
  spectral: d3.interpolateSpectral,
  cubehelix: d3.interpolateCubehelixDefault,
  sinebow: d3.interpolateSinebow,
} as const;

const colorScaleLabels: Record<keyof typeof colorScales, string> = {
  viridis: "Viridis",
  cividis: "Cividis",
  inferno: "Inferno",
  magma: "Magma",
  plasma: "Plasma",
  turbo: "Turbo",
  warm: "Warm",
  cool: "Cool",
  ylOrRd: "Yellow-Orange-Red",
  rdBu: "Red-Blue",
  rdYlBu: "Red-Yellow-Blue",
  spectral: "Spectral",
  cubehelix: "Cubehelix",
  sinebow: "Sinebow",
};

const FONT_FAMILIES = ["Impact", "Arial", "Verdana", "Trebuchet MS", "Georgia", "Times New Roman", "Palatino"] as const;

const FONT_STYLE_OPTIONS = ["normal", "italic", "bold", "boldItalic"] as const;
const ROTATION_OPTIONS = [0, 30, 60, 90] as const;
const ROTATIONS_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
const SCALE_OPTIONS = ["linear", "log", "sqrt"] as const;
const SPIRAL_OPTIONS = ["archimedean", "rectangular"] as const;

const FONT_SIZE_MIN = 4;
const FONT_SIZE_MAX = 200;
const PADDING_MIN = 0;
const PADDING_MAX = 20;
const COLOR_STEPS_MIN = 3;
const COLOR_STEPS_MAX = 20;
const PREVIEW_STEPS = 11;

type ColorScaleKey = keyof typeof colorScales;
type RotationOption = (typeof ROTATION_OPTIONS)[number];
type ScaleType = (typeof SCALE_OPTIONS)[number];
type SpiralType = (typeof SPIRAL_OPTIONS)[number];
type FontStyleType = (typeof FONT_STYLE_OPTIONS)[number];
type RotationsType = (typeof ROTATIONS_OPTIONS)[number];
type PanelType = "colors" | "typography" | "layout";

const FONT_STYLE_OPTION_LABELS: Record<FontStyleType, string> = {
  normal: "Normal",
  italic: "Italic",
  bold: "Bold",
  boldItalic: "Bold & Italic",
};

const FONT_STYLE_TO_TEXT_ATTRIBUTES: Record<
  FontStyleType,
  { "font-style": "normal" | "italic"; "font-weight": "normal" | "bold" }
> = {
  normal: { "font-style": "normal", "font-weight": "normal" },
  italic: { "font-style": "italic", "font-weight": "normal" },
  bold: { "font-style": "normal", "font-weight": "bold" },
  boldItalic: { "font-style": "italic", "font-weight": "bold" },
};

const toBoundedNumber = (value: string, min: number, max: number): number | undefined => {
  const nextValue = Number.parseInt(value, 10);
  if (Number.isNaN(nextValue)) return undefined;
  return Math.min(max, Math.max(min, nextValue));
};

const sampleColorScale = (interpolator: (t: number) => string, steps: number): string[] => {
  if (steps <= 1) return [interpolator(0.5)];
  return Array.from({ length: steps }, (_, index) => interpolator(index / (steps - 1)));
};

const asGradient = (colors: string[]): string => {
  return `linear-gradient(90deg, ${colors.join(", ")})`;
};

export function WordCloud({ width, height, words }: WordCloudProps) {
  const [colorScale, setColorScale] = useState<ColorScaleKey>("viridis");
  const [colorSteps, setColorSteps] = useState<number>(9);
  const [fontFamily, setFontFamily] = useState<string>("Impact");
  const [fontStyle, setFontStyle] = useState<FontStyleType>("normal");
  const [fontSizes, setFontSizes] = useState<[number, number]>([20, 100]);
  const [padding, setPadding] = useState<number>(2);
  const [scaleType, setScaleType] = useState<ScaleType>("log");
  const [spiralType, setSpiralType] = useState<SpiralType>("archimedean");
  const [rotationLimit, setRotationLimit] = useState<RotationOption>(0);
  const [rotations, setRotations] = useState<RotationsType>(3);
  const [panelAnchor, setPanelAnchor] = useState<HTMLElement | null>(null);
  const [openPanel, setOpenPanel] = useState<PanelType | null>(null);
  const wordCloudRef = useRef<HTMLDivElement>(null);

  const cloudWords = useMemo(() => words.map((w) => ({ text: w.word, value: w.count })), [words]);
  const selectedColors = useMemo(() => sampleColorScale(colorScales[colorScale], colorSteps), [colorScale, colorSteps]);
  const colorScalePreviewOptions = useMemo(() => {
    return Object.keys(colorScales).map((key) => {
      const name = key as ColorScaleKey;
      return {
        name,
        previewColors: sampleColorScale(colorScales[name], PREVIEW_STEPS),
      };
    });
  }, []);
  const textAttributes = useMemo(() => FONT_STYLE_TO_TEXT_ATTRIBUTES[fontStyle], [fontStyle]);

  const wordCloudOptions = useMemo(
    () => ({
      colors: selectedColors,
      deterministic: true,
      enableOptimizations: true,
      enableTooltip: false,
      fontFamily,
      fontSizes,
      padding,
      rotationAngles: [-rotationLimit, rotationLimit] as [number, number],
      rotations,
      scale: scaleType,
      spiral: spiralType,
      textAttributes,
    }),
    [fontFamily, fontSizes, padding, rotationLimit, rotations, scaleType, selectedColors, spiralType, textAttributes],
  );

  const hasWords = words.length > 0;

  const handleFontSizeMinChange = (value: string) => {
    const nextMin = toBoundedNumber(value, FONT_SIZE_MIN, FONT_SIZE_MAX);
    if (nextMin === undefined) return;

    setFontSizes((previous) => {
      const [, currentMax] = previous;
      return [Math.min(nextMin, currentMax), currentMax];
    });
  };

  const handleFontSizeMaxChange = (value: string) => {
    const nextMax = toBoundedNumber(value, FONT_SIZE_MIN, FONT_SIZE_MAX);
    if (nextMax === undefined) return;

    setFontSizes((previous) => {
      const [currentMin] = previous;
      return [currentMin, Math.max(nextMax, currentMin)];
    });
  };

  const handlePaddingChange = (value: string) => {
    const nextPadding = toBoundedNumber(value, PADDING_MIN, PADDING_MAX);
    if (nextPadding === undefined) return;
    setPadding(nextPadding);
  };

  const handleColorStepsChange = (value: string) => {
    const nextSteps = toBoundedNumber(value, COLOR_STEPS_MIN, COLOR_STEPS_MAX);
    if (nextSteps === undefined) return;
    setColorSteps(nextSteps);
  };

  const handleOpenPanel = (panel: PanelType) => (event: React.MouseEvent<HTMLElement>) => {
    setOpenPanel(panel);
    setPanelAnchor(event.currentTarget);
  };

  const handleClosePanel = () => {
    setOpenPanel(null);
    setPanelAnchor(null);
  };

  const handleReset = () => {
    setColorScale("viridis");
    setColorSteps(9);
    setFontFamily("Impact");
    setFontStyle("normal");
    setFontSizes([10, 100]);
    setPadding(2);
    setScaleType("log");
    setSpiralType("archimedean");
    setRotationLimit(0);
    setRotations(3);
    handleClosePanel();
  };

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

  const renderScaleOption = (schemeName: ColorScaleKey, colors: string[]) => {
    return (
      <Stack direction="row" spacing={1} alignItems="center" width="100%">
        <Typography width="140px" flexShrink={0} variant="body2">
          {colorScaleLabels[schemeName]}
        </Typography>
        <Box
          sx={{
            height: "12px",
            width: "100%",
            borderRadius: 999,
            background: asGradient(colors),
            border: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        />
      </Stack>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <DATSToolbar
        variant="dense"
        sx={{
          justifyContent: "space-between",
          rowGap: 0.75,
          columnGap: 1.5,
          py: 0.75,
          px: 1,
          minHeight: "unset",
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          background: (theme) =>
            `linear-gradient(180deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
        }}
      >
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
          <Button
            onClick={handleOpenPanel("colors")}
            variant={openPanel === "colors" ? "contained" : "outlined"}
            size="small"
            startIcon={<PaletteIcon fontSize="small" />}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2">Colors</Typography>
              <Box
                sx={{
                  width: 42,
                  height: 10,
                  borderRadius: 999,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  background: asGradient(selectedColors),
                }}
              />
            </Stack>
          </Button>

          <Button
            onClick={handleOpenPanel("typography")}
            variant={openPanel === "typography" ? "contained" : "outlined"}
            size="small"
            startIcon={<TypeSpecimenIcon fontSize="small" />}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Fonts
          </Button>

          <Button
            onClick={handleOpenPanel("layout")}
            variant={openPanel === "layout" ? "contained" : "outlined"}
            size="small"
            startIcon={<TuneIcon fontSize="small" />}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Layout
          </Button>

          <Button onClick={handleReset} size="small" sx={{ textTransform: "none" }}>
            Reset
          </Button>
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title="Export Word Cloud">
            <IconButton onClick={handleExport} size="small">
              <SaveAltIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </DATSToolbar>

      <Popover
        open={openPanel === "colors"}
        anchorEl={panelAnchor}
        onClose={handleClosePanel}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              width: 390,
              maxWidth: "calc(100vw - 24px)",
              borderRadius: 2,
            },
          },
        }}
      >
        <Stack spacing={2.5}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">Color Scale</Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a continuous scale and how many sampled colors should represent the frequency range.
            </Typography>
          </Stack>

          <TextField
            select
            label="Color Scale"
            size="small"
            value={colorScale}
            onChange={(event) => setColorScale(event.target.value as ColorScaleKey)}
            helperText="Continuous gradient used to map low-to-high word frequencies"
            slotProps={{
              select: {
                MenuProps: {
                  PaperProps: {
                    style: {
                      maxHeight: 340,
                    },
                  },
                },
                renderValue: (selected) => {
                  const selectedName = selected as ColorScaleKey;
                  const selectedPreview = sampleColorScale(colorScales[selectedName], PREVIEW_STEPS);
                  return renderScaleOption(selectedName, selectedPreview);
                },
              },
            }}
            fullWidth
          >
            {colorScalePreviewOptions.map(({ name, previewColors }) => (
              <MenuItem key={name} value={name}>
                {renderScaleOption(name, previewColors)}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Color Steps"
            size="small"
            type="number"
            value={colorSteps}
            onChange={(event) => handleColorStepsChange(event.target.value)}
            slotProps={{ htmlInput: { min: COLOR_STEPS_MIN, max: COLOR_STEPS_MAX } }}
            helperText={`Sample ${COLOR_STEPS_MIN}-${COLOR_STEPS_MAX} shades from the selected scale`}
            fullWidth
          />
        </Stack>
      </Popover>

      <Popover
        open={openPanel === "typography"}
        anchorEl={panelAnchor}
        onClose={handleClosePanel}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              width: 360,
              maxWidth: "calc(100vw - 24px)",
              borderRadius: 2,
            },
          },
        }}
      >
        <Stack spacing={2.5}>
          <Typography variant="subtitle2">Typography</Typography>
          <TextField
            select
            label="Font Family"
            size="small"
            value={fontFamily}
            onChange={(event) => setFontFamily(event.target.value)}
            helperText="Choose the typeface used for all words in the cloud"
            fullWidth
          >
            {FONT_FAMILIES.map((family) => (
              <MenuItem key={family} value={family}>
                {family}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Font Style"
            size="small"
            value={fontStyle}
            onChange={(event) => setFontStyle(event.target.value as FontStyleType)}
            helperText="Choose the text style for the words in the cloud"
            fullWidth
          >
            {FONT_STYLE_OPTIONS.map((style) => (
              <MenuItem key={style} value={style}>
                {FONT_STYLE_OPTION_LABELS[style]}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              type="number"
              label="Min Font Size"
              value={fontSizes[0]}
              onChange={(event) => handleFontSizeMinChange(event.target.value)}
              slotProps={{ htmlInput: { min: FONT_SIZE_MIN, max: FONT_SIZE_MAX } }}
              helperText="Lower bound for word sizes in pixels"
              fullWidth
            />
            <TextField
              size="small"
              type="number"
              label="Max Font Size"
              value={fontSizes[1]}
              onChange={(event) => handleFontSizeMaxChange(event.target.value)}
              slotProps={{ htmlInput: { min: FONT_SIZE_MIN, max: FONT_SIZE_MAX } }}
              helperText="Upper bound for word sizes in pixels"
              fullWidth
            />
          </Stack>
        </Stack>
      </Popover>

      <Popover
        open={openPanel === "layout"}
        anchorEl={panelAnchor}
        onClose={handleClosePanel}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              width: 340,
              maxWidth: "calc(100vw - 24px)",
              borderRadius: 2,
            },
          },
        }}
      >
        <Stack spacing={2.5}>
          <Typography variant="subtitle2">Layout</Typography>

          <TextField
            select
            label="Scale"
            size="small"
            value={scaleType}
            onChange={(event) => setScaleType(event.target.value as ScaleType)}
            helperText="How frequency values are mapped to font sizes"
            fullWidth
          >
            {SCALE_OPTIONS.map((scale) => (
              <MenuItem key={scale} value={scale}>
                {scale}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Spiral"
            size="small"
            value={spiralType}
            onChange={(event) => setSpiralType(event.target.value as SpiralType)}
            helperText="Controls how words are packed while filling space"
            fullWidth
          >
            {SPIRAL_OPTIONS.map((spiral) => (
              <MenuItem key={spiral} value={spiral}>
                {spiral[0].toUpperCase() + spiral.slice(1)}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Rotation Angle"
            size="small"
            value={rotationLimit}
            onChange={(event) => setRotationLimit(Number(event.target.value) as RotationOption)}
            helperText="Angle used for rotation"
            fullWidth
          >
            {ROTATION_OPTIONS.map((angle) => (
              <MenuItem key={angle} value={angle}>
                {angle === 0 ? "0° (off)" : `${angle}°`}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Rotations"
            size="small"
            value={rotations}
            onChange={(event) => setRotations(Number(event.target.value) as RotationsType)}
            helperText="Evenly splits the [-angle, angle] range. For example, with angle=60 and rotations=3, words will be rotated at -60°, 0° and 60°."
            fullWidth
          >
            {ROTATIONS_OPTIONS.map((rotationCount) => (
              <MenuItem key={rotationCount} value={rotationCount}>
                {rotationCount}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            type="number"
            label="Padding"
            value={padding}
            onChange={(event) => handlePaddingChange(event.target.value)}
            slotProps={{ htmlInput: { min: PADDING_MIN, max: PADDING_MAX } }}
            helperText="Space between words in pixels to reduce overlap"
            fullWidth
          />
        </Stack>
      </Popover>

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
          <ReactWordcloud key={fontStyle} words={cloudWords} options={wordCloudOptions} size={[width, height]} />
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
