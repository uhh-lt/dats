import { SidebarContentLayout } from "@components/content-layouts";
import { useAuth } from "@core/auth";
import { Box, Container, Typography } from "@mui/material";
import { useState } from "react";
import { ApiKeysSection } from "./_components/ApiKeysSection";
import { DataPrivacy } from "./_components/DataPrivacy";
import { PasswordReset } from "./_components/PasswordReset";
import { ProfileHome } from "./_components/ProfileHome";
import { ProfileSidebar } from "./_components/ProfileSidebar";
import { Support } from "./_components/Support";
import { UpdateEmail } from "./_components/UpdateEmail";
import { ProfileSection } from "./ProfileSection";

export function ProfileView() {
  // global server state (react query)
  const { user } = useAuth();

  // local client state
  const [section, setSection] = useState<ProfileSection>("home");

  if (!user) {
    return (
      <Container sx={{ mt: 3, height: "100%" }}>
        <Typography variant="body1" gutterBottom mt={3}>
          Loading...
        </Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ height: "100%", overflow: "hidden" }}>
      <SidebarContentLayout
        layoutKey="profile-sidebar-layout"
        sidebar={<ProfileSidebar user={user} section={section} onSectionChange={setSection} />}
        content={
          <Box sx={{ bgcolor: "background.paper", minHeight: "100%" }}>
            <Container maxWidth="lg" sx={{ py: 3 }}>
              {section === "home" && <ProfileHome user={user} />}
              {section === "email" && <UpdateEmail user={user} />}
              {section === "password" && <PasswordReset />}
              {section === "apiKeys" && <ApiKeysSection />}
              {section === "dataPrivacy" && <DataPrivacy />}
              {section === "support" && <Support />}
            </Container>
          </Box>
        }
      />
    </Box>
  );
}
