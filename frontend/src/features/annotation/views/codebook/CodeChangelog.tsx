import { CodeBranchHooks } from "@api/hooks/CodeBranchHooks";
import { CodeHooks } from "@api/hooks/CodeHooks";
import { UserHooks } from "@api/hooks/UserHooks";
import { CodeSnapshotDiff } from "@core/code/CodeSnapshotDiff";
import { CodeChangeKind } from "@models/CodeChangeKind";
import { CodeChangelogEntry } from "@models/CodeChangelogEntry";
import { ChevronRight, ExpandMore } from "@mui/icons-material";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Pagination,
  Stack,
  Typography,
} from "@mui/material";
import { dateToLocaleString } from "@utils/DateUtils";
import { useEffect, useState } from "react";

interface CodeChangelogProps {
  projectId: number;
  branchId: number | null;
}

const PAGE_SIZE = 10;
const MAIN_COLOR = "#64748b";
const BRANCH_COLORS = ["#7c3aed", "#0891b2", "#db2777", "#ca8a04", "#059669", "#ea580c"];

const changeKindLabels: Record<CodeChangeKind, string> = {
  [CodeChangeKind.CREATE]: "Created",
  [CodeChangeKind.UPDATE]: "Updated",
  [CodeChangeKind.DELETE]: "Deleted",
  [CodeChangeKind.MERGE]: "Merged",
  [CodeChangeKind.CONFLICT_RESOLUTION]: "Resolved conflict",
};

export function CodeChangelog({ projectId, branchId }: CodeChangelogProps) {
  const [page, setPage] = useState(1);
  const [expandedChangeSets, setExpandedChangeSets] = useState<string[]>([]);
  const changelog = CodeHooks.useGetChangelog(projectId, branchId, page, PAGE_SIZE);
  const branches = CodeBranchHooks.useListBranches(projectId, true);
  const users = UserHooks.useGetAllUsers();
  const selectedBranch = branches.data?.find((branch) => branch.id === branchId);
  const pageCount = Math.max(1, Math.ceil((changelog.data?.total ?? 0) / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
    setExpandedChangeSets([]);
  }, [branchId]);

  useEffect(() => {
    setExpandedChangeSets([]);
  }, [page]);

  const handleToggle = (changeSetId: string) => {
    setExpandedChangeSets((current) =>
      current.includes(changeSetId)
        ? current.filter((candidate) => candidate !== changeSetId)
        : [...current, changeSetId],
    );
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <div>
            <Typography variant="h6">Codebook changelog</Typography>
            <Typography variant="body2" color="text.secondary">
              {branchId === null
                ? "Recent changes on Main."
                : "Recent changes from Main and " + (selectedBranch?.name ?? "the selected branch") + "."}
            </Typography>
          </div>

          {changelog.isLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {changelog.isError && (
            <Alert severity="error">The codebook changelog could not be loaded. Please try again.</Alert>
          )}

          {!changelog.isLoading && changelog.data?.items.length === 0 && (
            <Typography color="text.secondary">Code changes will appear here.</Typography>
          )}

          <Stack>
            {changelog.data?.items.map((entry, index) => {
              const isExpanded = expandedChangeSets.includes(entry.change_set_id);
              const author = users.data?.find((user) => user.id === entry.author_id);
              const sourceBranch = branches.data?.find((branch) => branch.id === entry.source_branch_id);
              const targetBranch = branches.data?.find((branch) => branch.id === entry.branch_id);
              const color = branchColor(entry.source_branch_id ?? entry.branch_id);
              return (
                <Box key={entry.change_set_id} sx={{ display: "flex", minWidth: 0 }}>
                  <TimelineRail color={color} first={index === 0} last={index === changelog.data.items.length - 1} />
                  <Box sx={{ flex: 1, minWidth: 0, pb: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <IconButton
                        size="small"
                        aria-label={isExpanded ? "Collapse code changes" : "Expand code changes"}
                        onClick={() => handleToggle(entry.change_set_id)}
                      >
                        {isExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                      </IconButton>
                      <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography variant="subtitle2">{entryTitle(entry)}</Typography>
                          <Chip size="small" label={changeKindLabels[entry.change_kind]} />
                          <BranchChip
                            color={color}
                            label={
                              entry.change_kind === CodeChangeKind.MERGE
                                ? (sourceBranch?.name ?? "Branch") + " → Main"
                                : (targetBranch?.name ?? "Main")
                            }
                          />
                          {entry.changes.length > 1 && (
                            <Chip size="small" variant="outlined" label={entry.changes.length + " codes"} />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {author ? author.first_name + " " + author.last_name : "System"} ·{" "}
                          {dateToLocaleString(entry.created)}
                        </Typography>
                        <Collapse in={isExpanded} unmountOnExit>
                          <Stack
                            spacing={2}
                            divider={<Divider flexItem />}
                            sx={{ mt: 1.5, p: 2, bgcolor: "background.default", borderRadius: 1 }}
                          >
                            {entry.changes.map((change) => (
                              <Box key={change.after.id}>
                                {change.merged_from && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                                    Promoted branch snapshot #{change.merged_from.id} into Main
                                  </Typography>
                                )}
                                <CodeSnapshotDiff
                                  before={change.before}
                                  after={change.after}
                                  changedFields={change.changed_fields}
                                />
                              </Box>
                            ))}
                          </Stack>
                        </Collapse>
                      </Box>
                    </Stack>
                  </Box>
                </Box>
              );
            })}
          </Stack>

          {(changelog.data?.total ?? 0) > PAGE_SIZE && (
            <Pagination
              count={pageCount}
              page={page}
              onChange={(_event, value) => setPage(value)}
              sx={{ alignSelf: "center" }}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function TimelineRail({ color, first, last }: { color: string; first: boolean; last: boolean }) {
  return (
    <Box sx={{ width: 28, flexShrink: 0, position: "relative" }}>
      <Box
        sx={{
          position: "absolute",
          left: 9,
          top: first ? 14 : 0,
          bottom: last ? "calc(100% - 15px)" : 0,
          width: 2,
          bgcolor: color,
          opacity: 0.55,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          left: 5,
          top: 10,
          width: 10,
          height: 10,
          borderRadius: "50%",
          bgcolor: color,
          border: 2,
          borderColor: "background.paper",
          boxSizing: "border-box",
        }}
      />
    </Box>
  );
}

function BranchChip({ color, label }: { color: string; label: string }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={label}
      sx={{ borderColor: color, color, "& .MuiChip-label": { fontWeight: 500 } }}
    />
  );
}

function entryTitle(entry: CodeChangelogEntry) {
  const message = entry.message?.trim();
  if (message) return message;

  const firstCodeName = entry.changes[0]?.after.name ?? "codebook";
  if (entry.change_kind === CodeChangeKind.MERGE) {
    return entry.changes.length === 1
      ? "Merge " + firstCodeName + " into Main"
      : "Merge " + entry.changes.length + " codes into Main";
  }
  if (entry.changes.length > 1) {
    return changeKindLabels[entry.change_kind] + " " + entry.changes.length + " codes";
  }
  return changeKindLabels[entry.change_kind] + " " + firstCodeName;
}

function branchColor(branchId: number | null) {
  if (branchId === null) return MAIN_COLOR;
  return BRANCH_COLORS[Math.abs(branchId) % BRANCH_COLORS.length];
}
