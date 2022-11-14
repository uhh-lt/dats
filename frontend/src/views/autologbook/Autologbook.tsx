import React, { useContext } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import "@toast-ui/editor/dist/toastui-editor.css";
import ProjectHooks from "../../api/ProjectHooks";
import ActionCard from "./ActionCard";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { Box, Checkbox, FormControlLabel, FormGroup, Grid, Portal, Typography } from "@mui/material";

function Autologbook() {
  const appBarContainerRef = useContext(AppBarContext);

  // global state
  const { user } = useAuth();

  // router
  const { projectId } = useParams() as {
    projectId: string;
  };

  // global state (redux)
  //const dispatch = useAppDispatch();
  //const searchTerm = useAppSelector((state) => state.logbook.searchTerm);
  //const category = useAppSelector((state) => state.logbook.category);

  const userActions = ProjectHooks.useGetActions(parseInt(projectId), user.data!.id);

  // reformat datetime to better readable format
  const reformatTimestamp = (ts: string) => {
    let date = new Date(ts)
    let options: Intl.DateTimeFormatOptions = { day: 'numeric', year: 'numeric', month: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit' }
    return date.toLocaleDateString("en-GB", options)
  }

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Automatic Logbook
        </Typography>
      </Portal>
      <Grid container spacing={4} columns={16}>
        <Grid item xs={2} style={{ boxShadow: "2px 2px 2px 2px gray" }}>
          <Box style={{ margin: '2em' }}>
            <FormGroup>
              <h4>Action Type Filters:</h4>
              <FormControlLabel control={<Checkbox defaultChecked />} label="Create" />
              <FormControlLabel control={<Checkbox defaultChecked />} label="Update" />
              <FormControlLabel control={<Checkbox defaultChecked />} label="Delete" />
            </FormGroup>
          </Box>
        </Grid>
        <Grid item xs={14}>
          <Box style={{maxHeight: '88vh', overflow: 'auto'}}>
            <div style={{width : '85%', height: '100%'}}>
              {userActions.isLoading && <div>Loading!</div>}
              {userActions.isError && <div>Error: {userActions.error.message}</div>}
              {userActions.isSuccess &&
                <div style={{height: 'inherit'}}>{
                  userActions.data.map((action) =>
                      <ActionCard actionTypeValue={action.action_type}
                                  targetObjectType={action.target_object_type}
                                  executedAt={reformatTimestamp(action.executed)}/>
                  )}
                </div>}
            </div>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}

export default Autologbook;
