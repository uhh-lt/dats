import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { EntityRead } from "./openapi/models/EntityRead.ts";
import { EntityService } from "./openapi/services/EntityService.ts";


// enitity
const useGetEntity = (entityId: number | null | undefined) =>
  useQuery<EntityRead, Error>({
    queryKey: [QueryKey.ENTITY, entityId],
    queryFn: () => EntityService.getById({ entityId: entityId! }),
    enabled: !!entityId,
  });

const useCreateEntity = () =>
  useMutation({
    mutationFn: EntityService.createNewEntity,
    onSuccess: (newEntity, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_ENTITIES, variables.requestBody.project_id] });
    },
  });

const useUpdateEntity = () =>
  useMutation({
    mutationFn: EntityService.updateById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ENTITY, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_ENTITIES, data.project_id] });
    },
  });

const useDeleteEntity = () =>
  useMutation({
    mutationFn: EntityService.deleteById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ENTITY, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_ENTITIES, data.project_id] });
    },
  });

const useMerge = () =>
  useMutation({
    mutationFn: EntityService.mergeEntities,
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: [QueryKey.ENTITY, data.project_id]});
      queryClient.invalidateQueries({queryKey: [QueryKey.PROJECT_ENTITIES, data.project_id]})
    }
  })

  const useResolve = () =>
    useMutation({
      mutationFn: EntityService.resolveEntities,
      onSuccess: (data) => {
        queryClient.invalidateQueries({queryKey: [QueryKey.ENTITY, data[0].project_id]});
        queryClient.invalidateQueries({queryKey: [QueryKey.PROJECT_ENTITIES, data[0].project_id]})
      }
    })


const EntityHooks = {
  useGetEntity,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
  useMerge,
  useResolve
};

export default EntityHooks;
