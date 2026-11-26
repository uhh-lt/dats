from modules.perspectives.aspect_orm import AspectORM
from repos.filesystem.file_crud_base import FileCRUDBase

# the thumbnail of the map of an aspect
MAP_THUMBNAIL_FILENAME = "map_thumbnail.png"


class CRUDPerspectivesModelFile(FileCRUDBase):
    """The models of an aspect (UMAP models, fine-tuned prompt embedders):
    `perspectives_models/<aspect_id>/`."""

    folder = "perspectives_models"
    owner = AspectORM


class CRUDPerspectivesPlotFile(FileCRUDBase):
    """The plots of an aspect (the map thumbnail):
    `perspectives_plots/<aspect_id>/`."""

    folder = "perspectives_plots"
    owner = AspectORM


crud_perspectives_model_file = CRUDPerspectivesModelFile()
crud_perspectives_plot_file = CRUDPerspectivesPlotFile()
