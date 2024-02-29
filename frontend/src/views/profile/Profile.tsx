import { AccountBox, Email, Help, Lock, Support, Visibility } from "@mui/icons-material";
import { Container, Grid, Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import React from "react";
import { useAuth } from "../../auth/useAuth.ts";
import DataPrivacy from "./pages/DataPrivacy.tsx";
import PasswordReset from "./pages/PasswordReset.tsx";
import ProfileHome from "./pages/ProfileHome.tsx";
import UpdateEmail from "./pages/UpdateEmail.tsx";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Container sx={{ alignSelf: "flex-end" }}>
          <Box sx={{ pt: 5, pl: 1 }}>{children}</Box>
        </Container>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `vertical-tab-${index}`,
    "aria-controls": `vertical-tabpanel-${index}`,
  };
}

function Profile() {
  // global server state (react query)
  const { user } = useAuth();

  const [value, setValue] = React.useState(0);

  const handleTabsChange = (_event: React.SyntheticEvent, tabsValue: number) => {
    setValue(tabsValue);
  };

  return (
    <>
      {/* // Top level container for centering child elements */}
      <Container
        sx={{
          mt: 3,
          height: "100%",
        }}
      >
        {user ? (
          <>
            {/* Grid container for creating vertical layout of tabs and tabpanel */}
            <Grid
              container
              sx={{
                height: "90%",
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                overflow: "auto",
              }}
            >
              {/* Grid item tabs */}
              <Grid item xs={3} sx={{ bgcolor: "#f5f5f5", height: "100%", borderRadius: 2 }}>
                <Tabs
                  orientation="vertical"
                  variant="scrollable"
                  value={value}
                  onChange={handleTabsChange}
                  aria-label="Profile setting tabs"
                >
                  <Tab
                    label="Home"
                    {...a11yProps(0)}
                    icon={<AccountBox />}
                    iconPosition="start"
                    sx={{
                      borderBottom: 1,
                      borderColor: "divider",
                      alignItems: "center",
                      justifyContent: "start",
                      pl: 5,
                    }}
                  />
                  <Tab
                    label="Email"
                    {...a11yProps(1)}
                    icon={<Email />}
                    iconPosition="start"
                    sx={{
                      borderBottom: 1,
                      borderColor: "divider",
                      alignItems: "center",
                      justifyContent: "start",
                      pl: 5,
                    }}
                  />
                  <Tab
                    label="Password"
                    {...a11yProps(2)}
                    icon={<Lock />}
                    iconPosition="start"
                    sx={{
                      borderBottom: 1,
                      borderColor: "divider",
                      alignItems: "center",
                      justifyContent: "start",
                      pl: 5,
                    }}
                  />
                  <Tab
                    label="Data and Privacy"
                    {...a11yProps(3)}
                    icon={<Visibility />}
                    iconPosition="start"
                    sx={{
                      borderBottom: 1,
                      borderColor: "divider",
                      alignItems: "center",
                      justifyContent: "start",
                      pl: 5,
                    }}
                  />
                  <Tab
                    label="Support"
                    {...a11yProps(4)}
                    icon={<Help />}
                    iconPosition="start"
                    sx={{
                      borderBottom: 1,
                      borderColor: "divider",
                      alignItems: "center",
                      justifyContent: "start",
                      pl: 5,
                    }}
                  />
                </Tabs>
              </Grid>

              {/* Grid item tabpanels */}
              <Grid item xs={9}>
                <TabPanel value={value} index={0}>
                  <ProfileHome user={user} />
                </TabPanel>
                <TabPanel value={value} index={1}>
                  <UpdateEmail user={user} />
                </TabPanel>
                <TabPanel value={value} index={2}>
                  <PasswordReset />
                </TabPanel>
                <TabPanel value={value} index={3}>
                  <DataPrivacy />
                </TabPanel>
                <TabPanel value={value} index={4}>
                  <Support />
                </TabPanel>
              </Grid>
            </Grid>
          </>
        ) : (
          <Typography variant={"body1"} gutterBottom mt={3}>
            Loading...
          </Typography>
        )}
      </Container>
    </>
  );
}

export default Profile;
