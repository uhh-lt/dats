import { AnnotationGovernanceHooks } from "@api/hooks/AnnotationGovernanceHooks";
import { CodeBranchHooks } from "@api/hooks/CodeBranchHooks";
import { CodeHooks } from "@api/hooks/CodeHooks";
import { SdocRenderer } from "@core/source-document/renderer/SdocRenderer";
import {
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useTabNavigate } from "@core/navigation/tabs";

interface AnnotationDashboardViewProps {
  projectId: number;
}

export function AnnotationDashboardView({ projectId }: AnnotationDashboardViewProps) {
  const branchId = CodeHooks.useSelectedCodeBranchId();
  const counts = AnnotationGovernanceHooks.useReviewCounts(projectId, branchId);
  const recentDocuments = AnnotationGovernanceHooks.useRecentDocuments(projectId);
  const branches = CodeBranchHooks.useListBranches(projectId);
  const tabNavigate = useTabNavigate();
  const activeBranch = branches.data?.find((branch) => branch.id === branchId);
  const pendingCount = (counts.data?.span ?? 0) + (counts.data?.sentence ?? 0) + (counts.data?.bbox ?? 0);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <div>
            <Typography variant="h4">Annotation Dashboard</Typography>
            <Typography color="text.secondary">
              Continue annotating, review impacted annotations, or manage codebook changes.
            </Typography>
          </div>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`Codebook: ${activeBranch?.name ?? "Main"}`} color={branchId ? "secondary" : "default"} />
            <Chip
              label={`${pendingCount} pending review${pendingCount === 1 ? "" : "s"}`}
              color={pendingCount ? "warning" : "success"}
            />
          </Stack>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Button
            variant="contained"
            onClick={() => tabNavigate({ to: "/project/$projectId/search", params: { projectId } })}
          >
            Find documents to annotate
          </Button>
          <Button
            variant="outlined"
            onClick={() =>
              tabNavigate({
                to: "/project/$projectId/annotation/review",
                params: { projectId },
                search: { branch_id: branchId ?? undefined },
              })
            }
          >
            Open Review Queue
          </Button>
          <Button
            variant="outlined"
            onClick={() => tabNavigate({ to: "/project/$projectId/annotation/codebook", params: { projectId } })}
          >
            Open Codebook Changes
          </Button>
        </Stack>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recently annotated documents
            </Typography>
            {!recentDocuments.isLoading && recentDocuments.data?.length === 0 && (
              <Typography color="text.secondary">Your recently annotated documents will appear here.</Typography>
            )}
            <List disablePadding>
              {recentDocuments.data?.map((entry, index) => (
                <div key={entry.document.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    disablePadding
                    secondaryAction={
                      <Chip
                        size="small"
                        label={`${entry.annotation_count} annotation${entry.annotation_count === 1 ? "" : "s"}`}
                      />
                    }
                  >
                    <ListItemButton
                      onClick={() =>
                        tabNavigate({
                          to: "/project/$projectId/annotation/$sdocId",
                          params: { projectId, sdocId: entry.document.id },
                        })
                      }
                    >
                      <ListItemText
                        primary={<SdocRenderer sdoc={entry.document} renderName renderDoctypeIcon />}
                        secondary={`Last annotated ${new Date(entry.last_annotated_at).toLocaleString()}`}
                      />
                    </ListItemButton>
                  </ListItem>
                </div>
              ))}
            </List>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
