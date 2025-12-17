from enum import Enum

from modules.perspectives.enum.perspectives_job_type import PerspectivesJobType


class PerspectivesUserAction(str, Enum):
    UPDATE_ASPECT = "update_aspect"
    UPDATE_CLUSTER = "update_cluster"
    ACCEPT_LABELS = "accept_labels"
    REVERT_LABELS = "revert_labels"


PerspectivesAction = PerspectivesUserAction | PerspectivesJobType
