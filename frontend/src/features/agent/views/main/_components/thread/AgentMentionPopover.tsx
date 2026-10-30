import { ComposerPrimitive } from "@assistant-ui/react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { ButtonBase, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { datsLinkFormatter } from "../../_utils/datsLinkUtils";
import { useMentionAdapter } from "../../_hooks/useMentionAdapter";

const rowSx = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 1,
  width: "100%",
  px: 1.5,
  py: 0.75,
  borderRadius: 1,
  textAlign: "left",
  "&:hover, &[data-highlighted]": { bgcolor: "action.hover" },
};

/**
 * The popover of the composer's @-mentions: pick a category (documents, codes,
 * tags) or type to search; the chosen entity is inserted as a DATS link.
 * Arrow keys and Enter select, Escape closes.
 */
export function AgentMentionPopover() {
  const { adapter, isLoading } = useMentionAdapter();

  return (
    <ComposerPrimitive.TriggerPopover
      char="@"
      adapter={adapter}
      isLoading={isLoading}
      render={
        <Paper
          elevation={6}
          sx={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            mb: 1,
            width: 360,
            maxHeight: 320,
            overflowY: "auto",
            p: 0.5,
            zIndex: (theme) => theme.zIndex.modal,
          }}
        />
      }
    >
      <ComposerPrimitive.TriggerPopover.Directive formatter={datsLinkFormatter} />
      <ComposerPrimitive.TriggerPopoverBack render={<ButtonBase sx={rowSx} />}>
        <Stack direction="row" alignItems="center" gap={0.5} color="text.secondary">
          <ChevronLeftIcon fontSize="small" />
          <Typography variant="body2">Back</Typography>
        </Stack>
      </ComposerPrimitive.TriggerPopoverBack>
      <ComposerPrimitive.TriggerPopoverCategories>
        {(categories) =>
          categories.map((category) => (
            <ComposerPrimitive.TriggerPopoverCategoryItem
              key={category.id}
              categoryId={category.id}
              render={<ButtonBase sx={rowSx} />}
            >
              <Typography variant="body2">{category.label}</Typography>
              <ChevronRightIcon fontSize="small" color="action" />
            </ComposerPrimitive.TriggerPopoverCategoryItem>
          ))
        }
      </ComposerPrimitive.TriggerPopoverCategories>
      <ComposerPrimitive.TriggerPopoverItems>
        {(items) =>
          items.length === 0 ? (
            <Stack direction="row" alignItems="center" gap={1} sx={{ px: 1.5, py: 1, color: "text.secondary" }}>
              {isLoading && <CircularProgress size={14} />}
              <Typography variant="body2">{isLoading ? "Searching…" : "Nothing found"}</Typography>
            </Stack>
          ) : (
            items.map((item) => (
              <ComposerPrimitive.TriggerPopoverItem
                key={`${item.type}/${item.id}`}
                item={item}
                render={<ButtonBase sx={rowSx} />}
              >
                <Typography variant="body2" noWrap>
                  {item.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" flexShrink={0}>
                  {item.description}
                </Typography>
              </ComposerPrimitive.TriggerPopoverItem>
            ))
          )
        }
      </ComposerPrimitive.TriggerPopoverItems>
    </ComposerPrimitive.TriggerPopover>
  );
}
