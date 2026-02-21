import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import { IconButton, Tooltip } from "@mui/material";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";

interface StartRefreshButtonProps {
  isRefresh: boolean;
  onClick: () => void;
}

export function StartRefreshButton({ isRefresh, onClick }: StartRefreshButtonProps) {
  // global client state (redux)
  const aggregationGroups = useAppSelector((state) => state.documentSampler.aggregationGroups);

  // local state
  const groupsAreEmpty = Object.keys(aggregationGroups).length === 0;
  const containsEmptyKey = Object.keys(aggregationGroups).some((key) => key.length === 0);
  const containsEmptyTags = Object.values(aggregationGroups).some((tags) => tags.length === 0);

  const errorMessage =
    "" +
    (groupsAreEmpty ? "No groups defined: Define groups.\n" : "") +
    (containsEmptyKey ? "Empty group name: Give every group a name.\n" : "") +
    (containsEmptyTags ? "Empty group: Add tags to every group." : "");

  return (
    <Tooltip
      title={
        errorMessage.length > 0
          ? errorMessage
          : isRefresh
            ? "Re-fetch & re-sample documents"
            : "Fetch & sample documents"
      }
    >
      <span>
        <IconButton
          size="large"
          onClick={() => onClick()}
          disabled={groupsAreEmpty || containsEmptyKey || containsEmptyTags}
        >
          {isRefresh ? <RefreshIcon fontSize="large" /> : <PlayCircleIcon fontSize="large" />}
        </IconButton>
      </span>
    </Tooltip>
  );
}
