import AddReactionOutlinedIcon from "@mui/icons-material/AddReactionOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import { Box, Button, ButtonBase, Popover, Stack, Tooltip, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import type { EmojiPickerListCategoryHeaderProps, EmojiPickerListEmojiProps, EmojiPickerListRowProps } from "frimousse";
import { EmojiPicker as FrimoussePicker } from "frimousse";
import { MouseEvent, useCallback, useState } from "react";

import { EmojiRenderer } from "./EmojiRenderer";

const EMOJI_DATA_URL = "/assets/emojis";
const PICKER_COLUMNS = 9;

const EmojiSearch = styled(FrimoussePicker.Search)(({ theme }) => ({
  width: "100%",
  minWidth: 0,
  height: 40,
  boxSizing: "border-box",
  padding: theme.spacing(1, 1.5),
  color: theme.palette.text.primary,
  background: "transparent",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  font: "inherit",
  outline: 0,
  "&:focus": {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
  },
  "&::placeholder": {
    color: theme.palette.text.secondary,
    opacity: 1,
  },
  "&::-webkit-search-cancel-button": {
    display: "none",
  },
}));

const EmojiViewport = styled(FrimoussePicker.Viewport)({
  height: 320,
  overflowX: "hidden",
});

const SkinToneButton = styled(FrimoussePicker.SkinToneSelector)(({ theme }) => ({
  width: 40,
  height: 40,
  padding: 0,
  flexShrink: 0,
  color: theme.palette.text.primary,
  background: "transparent",
  border: 0,
  borderRadius: "50%",
  cursor: "pointer",
  fontSize: "1.4rem",
  lineHeight: 1,
  "&:hover": {
    background: theme.palette.action.hover,
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

function PickerCategoryHeader({ category, style, ...props }: EmojiPickerListCategoryHeaderProps) {
  return (
    <Box
      {...props}
      style={style}
      sx={{
        zIndex: 1,
        display: "flex",
        alignItems: "center",
        px: 1.5,
        bgcolor: "background.paper",
        color: "text.secondary",
        typography: "caption",
      }}
    >
      {category.label}
    </Box>
  );
}

function PickerRow({ style, ...props }: EmojiPickerListRowProps) {
  return (
    <Box
      {...props}
      style={style}
      sx={{
        display: "grid !important",
        gridTemplateColumns: `repeat(${PICKER_COLUMNS}, minmax(0, 1fr))`,
        alignItems: "center",
      }}
    />
  );
}

function PickerEmoji({ emoji, style, ...props }: EmojiPickerListEmojiProps) {
  return (
    <Tooltip title={emoji.label} placement="top" enterDelay={500}>
      <ButtonBase
        {...props}
        type="button"
        style={style}
        sx={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          justifySelf: "center",
          opacity: 1,
          "&[data-active]": { bgcolor: "action.hover" },
          "&:focus-visible": {
            outline: 2,
            outlineColor: "primary.main",
            outlineOffset: 2,
          },
        }}
      >
        <EmojiRenderer emoji={emoji.emoji} fontSize="1.4rem" />
      </ButtonBase>
    </Tooltip>
  );
}

const pickerListComponents = {
  CategoryHeader: PickerCategoryHeader,
  Emoji: PickerEmoji,
  Row: PickerRow,
};

interface EmojiPickerProps {
  value?: string | null;
  onChange: (emoji: string | null) => void;
  disabled?: boolean;
  tooltip?: string;
}

export function EmojiPicker({ value, onChange, disabled = false, tooltip = "Add icon" }: EmojiPickerProps) {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

  const handleOpen = useCallback((event: MouseEvent<HTMLElement>) => {
    setAnchorElement(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorElement(null);
  }, []);

  const handleSelect = useCallback(
    ({ emoji }: { emoji: string }) => {
      onChange(emoji);
      handleClose();
    },
    [handleClose, onChange],
  );

  const handleClear = useCallback(() => {
    onChange(null);
    handleClose();
  }, [handleClose, onChange]);

  return (
    <>
      <Tooltip title={value ? "Change icon" : tooltip}>
        <ButtonBase
          onClick={handleOpen}
          disabled={disabled}
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            flexShrink: 0,
            opacity: 1,
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          {value ? <EmojiRenderer emoji={value} fontSize="2rem" /> : <AddReactionOutlinedIcon />}
        </ButtonBase>
      </Tooltip>
      <Popover
        open={Boolean(anchorElement)}
        anchorEl={anchorElement}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 440, maxWidth: "calc(100vw - 32px)", overflow: "hidden" } } }}
      >
        <FrimoussePicker.Root columns={PICKER_COLUMNS} emojibaseUrl={EMOJI_DATA_URL} onEmojiSelect={handleSelect}>
          <Stack direction="row" spacing={1} p={1} alignItems="center">
            <EmojiSearch autoFocus placeholder="Search emojis" />
            <Tooltip title="Change skin tone">
              <SkinToneButton />
            </Tooltip>
          </Stack>
          <EmojiViewport>
            <FrimoussePicker.Loading style={{ display: "block", padding: 24, textAlign: "center" }}>
              Loading emojis…
            </FrimoussePicker.Loading>
            <FrimoussePicker.Empty style={{ display: "block", padding: 24, textAlign: "center" }}>
              No emojis found
            </FrimoussePicker.Empty>
            <FrimoussePicker.List components={pickerListComponents} />
          </EmojiViewport>
          <Stack direction="row" alignItems="center" minHeight={44} px={1} borderTop={1} borderColor="divider">
            <Box flex={1} minWidth={0}>
              <FrimoussePicker.ActiveEmoji>
                {({ emoji }) =>
                  emoji ? (
                    <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
                      <EmojiRenderer emoji={emoji.emoji} fontSize="1.25rem" />
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {emoji.label}
                      </Typography>
                    </Stack>
                  ) : null
                }
              </FrimoussePicker.ActiveEmoji>
            </Box>
            {value && (
              <Button startIcon={<DeleteIcon />} onClick={handleClear}>
                Remove icon
              </Button>
            )}
          </Stack>
        </FrimoussePicker.Root>
      </Popover>
    </>
  );
}
