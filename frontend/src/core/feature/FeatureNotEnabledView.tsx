import { getIconComponent, Icon } from "@components/icons";
import { Feature } from "@models/Feature";
import { Box, Button, Container, Typography } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusHooks";
import { getFeatureTitle } from "./featureRegistry";

interface FeatureNotEnabledViewProps {
  feature: Feature;
}

/** Shown instead of a page whose feature is disabled in the current project. */
export function FeatureNotEnabledView({ feature }: FeatureNotEnabledViewProps) {
  const openProjectSettings = useOpenDialog("projectSettings");

  const handleOpenSettings = () => openProjectSettings({ tab: "features" });

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          p: { xs: 3, md: 4 },
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="h5" gutterBottom>
          This feature is not enabled for this project
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {getFeatureTitle(feature)} is disabled in this project. You can enable it in the Features tab of the project
          settings; its data is then computed for the existing documents.
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          startIcon={getIconComponent(Icon.SETTINGS)}
          onClick={handleOpenSettings}
        >
          Open feature settings
        </Button>
      </Box>
    </Container>
  );
}
