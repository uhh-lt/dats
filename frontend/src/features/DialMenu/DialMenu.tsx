import FeedbackIcon from "@mui/icons-material/Feedback";
import HelpIcon from "@mui/icons-material/Help";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import { Dialog, SpeedDial, SpeedDialAction } from "@mui/material";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { HELP_MESSAGE_SUFFIX, USER_GUIDE_BASE_URL, USER_GUIDE_ROUTE_MAP } from "../../utils/GlobalConstants";
import FeedbackDialog from "../Feedback/FeedbackDialog";

function DialMenu() {
  const { user } = useAuth();
  const location = useLocation();

  // local state
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);

  // dialog event handlers
  const openFeedbackDialog = () => {
    setIsFeedbackDialogOpen(true);
  };
  const closeFeedbackDialog = () => {
    setIsFeedbackDialogOpen(false);
  };

  const wikiTargetRoute = useMemo(() => {
    let route = "";
    let description = "";
    location.pathname.split("/").forEach((path) => {
      for (const [key, value] of Object.entries(USER_GUIDE_ROUTE_MAP)) {
        if (path === key) {
          route = value.route;
          description = value.description;
        }
      }
    });
    return { route, description };
  }, [location.pathname]);

  const handleRedirect = () => {
    if (!location.pathname.includes("imprint")) window.open(USER_GUIDE_BASE_URL + wikiTargetRoute.route, "_blank");
  };

  return (
    <>
      {user && (
        <>
          <SpeedDial
            ariaLabel="DialMenu"
            icon={<SupportAgentIcon />}
            sx={{ position: "absolute", bottom: 16, right: 16, zIndex: (theme) => theme.zIndex.appBar + 1 }}
          >
            <SpeedDialAction
              key="help"
              icon={<HelpIcon />}
              tooltipTitle={
                <>
                  Hint: {wikiTargetRoute.description}
                  {location.pathname.includes("imprint") ? "Imprint" : ". " + HELP_MESSAGE_SUFFIX}
                </>
              }
              onClick={handleRedirect}
            />
            <SpeedDialAction
              key="feedback"
              icon={<FeedbackIcon />}
              tooltipTitle={"Send Feedback"}
              onClick={openFeedbackDialog}
            />
          </SpeedDial>
          <Dialog open={isFeedbackDialogOpen} onClose={closeFeedbackDialog} maxWidth="md" fullWidth>
            <FeedbackDialog
              setIsFeedbackDialogOpen={setIsFeedbackDialogOpen}
              user={user}
              locPathName={location.pathname}
            />
          </Dialog>
        </>
      )}
    </>
  );
}

export default DialMenu;
