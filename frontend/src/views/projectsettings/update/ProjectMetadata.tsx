import { ErrorMessage } from "@hookform/error-message";
import { Add } from "@mui/icons-material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { LoadingButton, TabContext, TabPanel } from "@mui/lab";
import { Box, Divider, MenuItem, Stack, Tab, Tabs, TextField } from "@mui/material";
import React, { useCallback, useState } from "react";
import { Controller, SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import ProjectMetadataHooks from "../../../api/ProjectMetadataHooks.ts";

import { DocType } from "../../../api/openapi/models/DocType.ts";
import { MetaType } from "../../../api/openapi/models/MetaType.ts";
import { ProjectMetadataCreate } from "../../../api/openapi/models/ProjectMetadataCreate.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import { ProjectMetadataUpdate } from "../../../api/openapi/models/ProjectMetadataUpdate.ts";
import ConfirmationAPI from "../../../features/ConfirmationDialog/ConfirmationAPI.ts";
import { useOpenSnackbar } from "../../../features/SnackbarDialog/useOpenSnackbar.ts";
import { docTypeToIcon } from "../../../utils/docTypeToIcon.tsx";
import { ProjectProps } from "./ProjectProps.ts";
import ProjectMetadataDeleteButton from "./metadata/ProjectMetadataDeleteButton.tsx";

function ProjectMetadata({ project }: ProjectProps) {
  // global server state (react query)
  const projectMetadata = ProjectHooks.useGetMetadata(project.id);

  const [tab, setTab] = useState(DocType.TEXT);
  const handleChangeTab = (_event: React.SyntheticEvent, newValue: DocType) => {
    setTab(newValue);
  };

  const projectMetadataByDocType = projectMetadata.data?.reduce(
    (acc, curr) => {
      if (!acc[curr.doctype]) {
        acc[curr.doctype] = [];
      }
      acc[curr.doctype].push(curr);
      return acc;
    },
    {} as { [key in DocType]: ProjectMetadataRead[] },
  );

  return (
    <Box display="flex" className="myFlexContainer h100">
      {projectMetadata.isSuccess && projectMetadataByDocType ? (
        <TabContext value={tab}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tab} onChange={handleChangeTab} variant="scrollable" textColor="inherit">
              {Object.values(DocType).map((docType) => (
                <Tab icon={docTypeToIcon[docType]} key={docType} label={docType} value={docType} iconPosition="start" />
              ))}
            </Tabs>
          </Box>
          {Object.values(DocType).map((docType) => (
            <TabPanel key={docType} value={docType} sx={{ p: 0 }} className="myFlexFillAllContainer">
              {projectMetadataByDocType[docType].map((metadata) => (
                <ProjectMetadataRow key={metadata.id} projectMetadataId={metadata.id} />
              ))}
              <Divider sx={{ my: 2 }} />
              <ProjectMetadataRowCreate docType={docType} projectId={project.id} />
            </TabPanel>
          ))}
        </TabContext>
      ) : projectMetadata.isLoading ? (
        <div>Loading...</div>
      ) : projectMetadata.isError ? (
        <div>Error: {projectMetadata.error.message}</div>
      ) : (
        <div>Something went wrong</div>
      )}
    </Box>
  );
}

export default ProjectMetadata;

function ProjectMetadataRow({ projectMetadataId }: { projectMetadataId: number }) {
  // global server state
  const projectMetadata = ProjectMetadataHooks.useGetMetadata(projectMetadataId);

  if (projectMetadata.isSuccess) {
    return <ProjectMetadataRowWithData projectMetadata={projectMetadata.data} />;
  } else if (projectMetadata.isLoading) {
    return <>Loading...</>;
  } else if (projectMetadata.isError) {
    return <>{projectMetadata.error.message}</>;
  } else {
    return <>Error?</>;
  }
}

function ProjectMetadataRowWithData({ projectMetadata }: { projectMetadata: ProjectMetadataRead }) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    resetField,
    control,
  } = useForm<ProjectMetadataUpdate>({
    values: {
      key: projectMetadata.key,
      metatype: projectMetadata.metatype,
    },
  });

  // form handling
  const updateMutation = ProjectMetadataHooks.useUpdateMetadata();
  const handleUpdateMetadata: SubmitHandler<ProjectMetadataUpdate> = useCallback(
    (data) => {
      // only update if data has changed!
      if (projectMetadata.metatype !== data.metatype || projectMetadata.key !== data.key) {
        const mutation = updateMutation.mutate;
        const actuallyMutate = () =>
          mutation({
            metadataId: projectMetadata.id,
            requestBody: {
              metatype: data.metatype,
              key: data.key,
            },
          });
        if (projectMetadata.metatype !== data.metatype) {
          ConfirmationAPI.openConfirmationDialog({
            text: "Changing the type of this metadata will remove its existing entries. This action cannot be undone. Do you want to proceed?",
            onAccept: actuallyMutate,
            onReject() {
              console.log("rej");
              resetField("metatype");
            },
          });
        } else {
          actuallyMutate();
        }
      }
    },
    [projectMetadata.id, projectMetadata.key, projectMetadata.metatype, updateMutation.mutate, resetField],
  );
  const handleError: SubmitErrorHandler<ProjectMetadataUpdate> = useCallback((data) => console.error(data), []);

  return (
    <Stack direction="row" alignItems="flex-start" mt={1}>
      <InfoOutlinedIcon fontSize="medium" sx={{ my: "5px", mr: 1 }} />
      <TextField
        {...register("key", { required: "Key is required" })}
        error={Boolean(errors.key)}
        helperText={<ErrorMessage errors={errors} name="key" />}
        variant="standard"
        disabled={projectMetadata.read_only}
        onBlur={() => handleSubmit(handleUpdateMetadata, handleError)()}
        sx={{ flexGrow: 1, flexBasis: 1 }}
      />
      <Controller
        name="metatype"
        control={control}
        rules={{
          required: "Value is required",
        }}
        render={({ field: { onBlur, onChange, value } }) => (
          <TextField
            error={Boolean(errors.metatype)}
            helperText={<ErrorMessage errors={errors} name="metatype" />}
            select
            variant="standard"
            defaultValue={projectMetadata.metatype}
            disabled={projectMetadata.read_only}
            onChange={onChange}
            onBlur={() => {
              onBlur();
              handleSubmit(handleUpdateMetadata, handleError)();
            }}
            value={value}
            sx={{ flexGrow: 1, flexBasis: 1 }}
          >
            {Object.values(MetaType).map((metaType) => (
              <MenuItem key={metaType} value={metaType}>
                {metaType}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <ProjectMetadataDeleteButton metadataId={projectMetadata.id} disabled={projectMetadata.read_only} />
    </Stack>
  );
}

function ProjectMetadataRowCreate({ docType, projectId }: { docType: DocType; projectId: number }) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectMetadataCreate>();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // form handling
  const createMutation = ProjectMetadataHooks.useCreateMetadata();
  const handleCreateMetadata: SubmitHandler<ProjectMetadataCreate> = useCallback(
    (data) => {
      const mutation = createMutation.mutate;
      mutation(
        {
          requestBody: {
            doctype: docType,
            metatype: data.metatype,
            key: data.key,
            project_id: projectId,
            read_only: false,
          },
        },
        {
          onSuccess: (projectMetadata) => {
            openSnackbar({
              text: `Created projectMetadata '${projectMetadata.key}' for project ${projectMetadata.project_id}`,
              severity: "success",
            });
          },
        },
      );
    },
    [createMutation.mutate, docType, openSnackbar, projectId],
  );
  const handleError: SubmitErrorHandler<ProjectMetadataCreate> = useCallback((data) => console.error(data), []);

  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      component="form"
      onSubmit={handleSubmit(handleCreateMetadata, handleError)}
    >
      <Add fontSize="medium" sx={{ my: "5px", mr: 1, mt: 2.5 }} />
      <TextField
        {...register("key", { required: "Key is required" })}
        error={Boolean(errors.key)}
        helperText={<ErrorMessage errors={errors} name="key" />}
        label="Metadata key"
        variant="standard"
        sx={{ flexGrow: 1, flexBasis: 1 }}
      />
      <TextField
        {...register("metatype", { required: "Value is required" })}
        error={Boolean(errors.metatype)}
        helperText={<ErrorMessage errors={errors} name="metatype" />}
        label="Metadata type"
        select
        variant="standard"
        defaultValue=""
        sx={{ flexGrow: 1, flexBasis: 1 }}
      >
        {Object.values(MetaType).map((metaType) => (
          <MenuItem key={metaType} value={metaType}>
            {metaType}
          </MenuItem>
        ))}
      </TextField>
      <LoadingButton
        sx={{ px: 1, justifyContent: "start", mt: "14px" }}
        loading={createMutation.isPending}
        loadingPosition="start"
        startIcon={<Add />}
        type="submit"
      >
        Create metadata
      </LoadingButton>
    </Stack>
  );
}
