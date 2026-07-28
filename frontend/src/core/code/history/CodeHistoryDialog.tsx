import { CodeBranchHooks } from "@api/hooks/CodeBranchHooks";
import { CodeHooks } from "@api/hooks/CodeHooks";
import { UserHooks } from "@api/hooks/UserHooks";
import { CodeRead } from "@models/CodeRead";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";

interface CodeHistoryDialogProps {
  code: CodeRead;
  open: boolean;
  onClose: () => void;
}

const historyFields: Array<
  keyof Pick<CodeRead, "name" | "description" | "color" | "enabled" | "parent_concept_id" | "is_deleted">
> = ["name", "description", "color", "enabled", "parent_concept_id", "is_deleted"];

export function CodeHistoryDialog({ code, open, onClose }: CodeHistoryDialogProps) {
  const history = CodeHooks.useGetHistory(code.project_id, code.concept_id);
  const users = UserHooks.useGetAllUsers();
  const branches = CodeBranchHooks.useListBranches(code.project_id, true);
  const snapshots = [...(history.data ?? [])].reverse();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Change history: {code.name}</DialogTitle>
      <DialogContent>
        <List>
          {snapshots.map((snapshot, index) => {
            const previous = snapshots[index - 1];
            const changedFields = previous
              ? historyFields.filter((field) => previous[field] !== snapshot[field])
              : historyFields;
            const author = users.data?.find((user) => user.id === snapshot.author_id);
            const branch = branches.data?.find((candidate) => candidate.id === snapshot.branch_id);
            const state = snapshot.is_deleted ? "Deleted" : previous ? "Changed" : "Created";
            return (
              <div key={snapshot.id}>
                {index > 0 && <Divider />}
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={`${state} on ${branch?.name ?? "Main"}`}
                    secondary={
                      <Stack spacing={0.5} component="span" sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(snapshot.created).toLocaleString()} ·{" "}
                          {author ? `${author.first_name} ${author.last_name}` : "System"}
                        </Typography>
                        {snapshot.commit_message && (
                          <Typography variant="body2">“{snapshot.commit_message}”</Typography>
                        )}
                        {changedFields.map((field) => (
                          <Typography key={field} variant="body2">
                            {field.replaceAll("_", " ")}: {previous ? String(previous[field] ?? "—") : "—"} →{" "}
                            {String(snapshot[field] ?? "—")}
                          </Typography>
                        ))}
                      </Stack>
                    }
                  />
                </ListItem>
              </div>
            );
          })}
        </List>
        {!history.isLoading && snapshots.length === 0 && (
          <Typography color="text.secondary">No history found.</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
