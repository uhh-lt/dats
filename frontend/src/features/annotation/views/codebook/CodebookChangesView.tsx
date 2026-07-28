import { CodeBranchHooks } from "@api/hooks/CodeBranchHooks";
import { CodeHooks } from "@api/hooks/CodeHooks";
import { useTabNavigate } from "@core/navigation/tabs";
import { CodeSnapshotDiff } from "@core/code/CodeSnapshotDiff";
import { CodeBranchChangeRead } from "@models/CodeBranchChangeRead";
import { CodeConflictResolution } from "@models/CodeConflictResolution";
import { ProjectActions } from "@store/global/projectSlice";
import { useAppDispatch } from "@store/storeHooks";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { NewReleases } from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import { CodeChangelog } from "./CodeChangelog";

interface CodebookChangesViewProps {
  projectId: number;
}

export function CodebookChangesView({ projectId }: CodebookChangesViewProps) {
  const dispatch = useAppDispatch();
  const tabNavigate = useTabNavigate();
  const branchId = CodeHooks.useSelectedCodeBranchId();
  const branches = CodeBranchHooks.useListBranches(projectId);
  const changes = CodeBranchHooks.useBranchChanges(branchId);
  const mergeBranch = CodeBranchHooks.useMergeBranch();
  const resolveConflict = CodeBranchHooks.useResolveConflict();
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [focusedConcept, setFocusedConcept] = useState<string>();
  const [commitMessage, setCommitMessage] = useState("");

  useEffect(() => {
    setSelectedConcepts([]);
    setFocusedConcept(undefined);
  }, [branchId]);

  useEffect(() => {
    const availableConcepts = new Set(changes.data?.map((change) => change.concept_id) ?? []);
    setSelectedConcepts((current) => current.filter((conceptId) => availableConcepts.has(conceptId)));
  }, [changes.data]);

  const focusedChange = changes.data?.find((change) => change.concept_id === focusedConcept) ?? changes.data?.[0];
  const selectedChanges = useMemo(
    () => changes.data?.filter((change) => selectedConcepts.includes(change.concept_id)) ?? [],
    [changes.data, selectedConcepts],
  );
  const hasSelectedConflict = selectedChanges.some((change) => change.is_conflict);
  const hasAnyConflict = changes.data?.some((change) => change.is_conflict) ?? false;

  const handleToggle = (conceptId: string) => {
    setSelectedConcepts((current) =>
      current.includes(conceptId) ? current.filter((id) => id !== conceptId) : [...current, conceptId],
    );
  };

  const handleMerge = (conceptIds: string[] | null) => {
    if (!branchId) return;
    mergeBranch.mutate(
      { branchId, requestBody: { concept_ids: conceptIds, commit_message: commitMessage || null } },
      {
        onSuccess: () => {
          setSelectedConcepts([]);
          setCommitMessage("");
        },
      },
    );
  };

  const handleResolve = (change: CodeBranchChangeRead, resolution: CodeConflictResolution) => {
    if (!branchId) return;
    resolveConflict.mutate({ branchId, requestBody: { concept_id: change.concept_id, resolution } });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <div>
            <Typography variant="h4">Codebook Changes</Typography>
            <Typography color="text.secondary">
              Inspect codebook history and merge collaborative changes into Main.
            </Typography>
          </div>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="outlined"
              startIcon={<NewReleases />}
              onClick={() =>
                tabNavigate({ to: "/project/$projectId/annotation/codebook/releases", params: { projectId } })
              }
            >
              Releases
            </Button>
            <Select
              size="small"
              displayEmpty
              value={branchId ?? "main"}
              onChange={(event) =>
                dispatch(
                  ProjectActions.selectCodeBranch({
                    projectId,
                    branchId: event.target.value === "main" ? null : Number(event.target.value),
                  }),
                )
              }
              sx={{ minWidth: 240 }}
            >
              <MenuItem value="main">Main</MenuItem>
              {branches.data?.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        </Stack>
        {branchId && (
          <>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                size="small"
                fullWidth
                label="Merge message (optional)"
                value={commitMessage}
                onChange={(event) => setCommitMessage(event.target.value)}
              />
              <Button
                variant="contained"
                disabled={!selectedConcepts.length || hasSelectedConflict}
                loading={mergeBranch.isPending}
                onClick={() => handleMerge(selectedConcepts)}
              >
                Merge selected
              </Button>
              <Button
                variant="outlined"
                disabled={!changes.data?.length || hasAnyConflict}
                loading={mergeBranch.isPending}
                onClick={() => handleMerge(null)}
              >
                Merge all
              </Button>
            </Stack>
            {hasAnyConflict && <Alert severity="warning">Resolve conflicting changes before merging them.</Alert>}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
              <Card sx={{ width: { md: 380 }, flexShrink: 0 }}>
                <CardContent>
                  <Typography variant="h6">Changes ({changes.data?.length ?? 0})</Typography>
                  <List>
                    {changes.data?.map((change) => (
                      <ListItemButton
                        key={change.concept_id}
                        selected={focusedChange?.concept_id === change.concept_id}
                        onClick={() => setFocusedConcept(change.concept_id)}
                      >
                        <Checkbox
                          edge="start"
                          checked={selectedConcepts.includes(change.concept_id)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => handleToggle(change.concept_id)}
                        />
                        <ListItemText primary={change.branch_code.name} secondary={change.change_type} />
                        {change.is_conflict && <Chip size="small" color="warning" label="Conflict" />}
                      </ListItemButton>
                    ))}
                  </List>
                  {!changes.isLoading && changes.data?.length === 0 && (
                    <Typography color="text.secondary">This branch has no active changes.</Typography>
                  )}
                </CardContent>
              </Card>
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  {focusedChange ? (
                    <ChangeDiff
                      change={focusedChange}
                      onResolve={handleResolve}
                      resolving={resolveConflict.isPending}
                    />
                  ) : (
                    <Typography color="text.secondary">Select a change to inspect it.</Typography>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </>
        )}
        <CodeChangelog projectId={projectId} branchId={branchId} />
      </Stack>
    </Container>
  );
}

function ChangeDiff({
  change,
  onResolve,
  resolving,
}: {
  change: CodeBranchChangeRead;
  onResolve: (change: CodeBranchChangeRead, resolution: CodeConflictResolution) => void;
  resolving: boolean;
}) {
  const main = change.current_main_code ?? change.base_main_code;
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h6">{change.branch_code.name}</Typography>
        <Chip size="small" label={change.change_type} />
        {change.is_conflict && <Chip size="small" color="warning" label="Conflict" />}
      </Stack>
      <Divider />
      <CodeSnapshotDiff
        before={main}
        after={change.branch_code}
        changedFields={change.changed_fields}
        beforeLabel="Main"
        afterLabel="Branch"
      />
      {change.is_conflict && (
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            disabled={resolving}
            onClick={() => onResolve(change, CodeConflictResolution.KEEP_BRANCH)}
          >
            Keep branch version
          </Button>
          <Button
            variant="outlined"
            disabled={resolving}
            onClick={() => onResolve(change, CodeConflictResolution.DISCARD_BRANCH)}
          >
            Discard branch change
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
