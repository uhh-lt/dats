"""The object boxes of an image, bbox annotations of the system user, with the
code trees of the COCO 2017 categories; a person is the code PERSON below
NAMED_ENTITY, shared with the named-entity spans."""

from core.code.system_codes import NAMED_ENTITY_PERSON, SystemCode
from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.artefact_system_enum import StorageKind

# the COCO 2017 super categories with their categories, and BACKGROUND
COCO_CODES = (
    SystemCode(
        "ACCESSORY",
        "Super Object Category from COCO 2017",
        children=(
            SystemCode("BACKPACK", "Object Category from COCO 2017"),
            SystemCode("EYE GLASSES", "Object Category from COCO 2017"),
            SystemCode("HANDBAG", "Object Category from COCO 2017"),
            SystemCode("HAT", "Object Category from COCO 2017"),
            SystemCode("SHOE", "Object Category from COCO 2017"),
            SystemCode("SUITCASE", "Object Category from COCO 2017"),
            SystemCode("TIE", "Object Category from COCO 2017"),
            SystemCode("UMBRELLA", "Object Category from COCO 2017"),
        ),
    ),
    SystemCode(
        "ANIMAL",
        "Super Object Category from COCO 2017",
        children=(
            SystemCode("BEAR", "Object Category from COCO 2017"),
            SystemCode("BIRD", "Object Category from COCO 2017"),
            SystemCode("CAT", "Object Category from COCO 2017"),
            SystemCode("COW", "Object Category from COCO 2017"),
            SystemCode("DOG", "Object Category from COCO 2017"),
            SystemCode("ELEPHANT", "Object Category from COCO 2017"),
            SystemCode("GIRAFFE", "Object Category from COCO 2017"),
            SystemCode("HORSE", "Object Category from COCO 2017"),
            SystemCode("SHEEP", "Object Category from COCO 2017"),
            SystemCode("ZEBRA", "Object Category from COCO 2017"),
        ),
    ),
    SystemCode(
        "APPLIANCE",
        "Super Object Category from COCO 2017",
        children=(
            SystemCode("BLENDER", "Object Category from COCO 2017"),
            SystemCode("MICROWAVE", "Object Category from COCO 2017"),
            SystemCode("OVEN", "Object Category from COCO 2017"),
            SystemCode("REFRIGERATOR", "Object Category from COCO 2017"),
            SystemCode("SINK", "Object Category from COCO 2017"),
            SystemCode("TOASTER", "Object Category from COCO 2017"),
        ),
    ),
    SystemCode("BACKGROUND", "Super Object Category from COCO 2017"),
    SystemCode(
        "ELECTRONIC",
        "Super Object Category from COCO 2017",
        children=(
            SystemCode("CELL PHONE", "Object Category from COCO 2017"),
            SystemCode("KEYBOARD", "Object Category from COCO 2017"),
            SystemCode("LAPTOP", "Object Category from COCO 2017"),
            SystemCode("MOUSE", "Object Category from COCO 2017"),
            SystemCode("REMOTE", "Object Category from COCO 2017"),
            SystemCode("TV", "Object Category from COCO 2017"),
        ),
    ),
    SystemCode(
        "FOOD",
        "Super Object Category from COCO 2017",
        children=(
            SystemCode("APPLE", "Object Category from COCO 2017"),
            SystemCode("BANANA", "Object Category from COCO 2017"),
            SystemCode("BROCCOLI", "Object Category from COCO 2017"),
            SystemCode("CAKE", "Object Category from COCO 2017"),
            SystemCode("CARROT", "Object Category from COCO 2017"),
            SystemCode("DONUT", "Object Category from COCO 2017"),
            SystemCode("HOT DOG", "Object Category from COCO 2017"),
            SystemCode("ORANGE", "Object Category from COCO 2017"),
            SystemCode("PIZZA", "Object Category from COCO 2017"),
            SystemCode("SANDWICH", "Object Category from COCO 2017"),
        ),
    ),
    SystemCode(
        "FURNITURE",
        "Super Object Category from COCO 2017",
        children=(
            SystemCode("BED", "Object Category from COCO 2017"),
            SystemCode("CHAIR", "Object Category from COCO 2017"),
            SystemCode("COUCH", "Object Category from COCO 2017"),
            SystemCode("DESK", "Object Category from COCO 2017"),
            SystemCode("DINING TABLE", "Object Category from COCO 2017"),
            SystemCode("DOOR", "Object Category from COCO 2017"),
            SystemCode("MIRROR", "Object Category from COCO 2017"),
            SystemCode("POTTED PLANT", "Object Category from COCO 2017"),
            SystemCode("TOILET", "Object Category from COCO 2017"),
            SystemCode("WINDOW", "Object Category from COCO 2017"),
        ),
    ),
    SystemCode(
        "INDOOR",
        "Super Object Category from COCO 2017",
        children=(
            SystemCode("BOOK", "Object Category from COCO 2017"),
            SystemCode("CLOCK", "Object Category from COCO 2017"),
            SystemCode("HAIR BRUSH", "Object Category from COCO 2017"),
            SystemCode("HAIR DRIER", "Object Category from COCO 2017"),
            SystemCode("SCISSORS", "Object Category from COCO 2017"),
            SystemCode("TEDDY BEAR", "Object Category from COCO 2017"),
            SystemCode("TOOTHBRUSH", "Object Category from COCO 2017"),
            SystemCode("VASE", "Object Category from COCO 2017"),
        ),
    ),
    SystemCode(
        "KITCHEN",
        "Super Object Category from COCO 2017",
        children=(
            SystemCode("BOTTLE", "Object Category from COCO 2017"),
            SystemCode("BOWL", "Object Category from COCO 2017"),
            SystemCode("CUP", "Object Category from COCO 2017"),
            SystemCode("FORK", "Object Category from COCO 2017"),
            SystemCode("KNIFE", "Object Category from COCO 2017"),
            SystemCode("PLATE", "Object Category from COCO 2017"),
            SystemCode("SPOON", "Object Category from COCO 2017"),
            SystemCode("WINE GLASS", "Object Category from COCO 2017"),
        ),
    ),
    SystemCode(
        "OUTDOOR",
        "Super Object Category from COCO 2017",
        children=(
            SystemCode("BENCH", "Object Category from COCO 2017"),
            SystemCode("FIRE HYDRANT", "Object Category from COCO 2017"),
            SystemCode("PARKING METER", "Object Category from COCO 2017"),
            SystemCode("STOP SIGN", "Object Category from COCO 2017"),
            SystemCode("STREET SIGN", "Object Category from COCO 2017"),
            SystemCode("TRAFFIC LIGHT", "Object Category from COCO 2017"),
        ),
    ),
    SystemCode(
        "SPORTS",
        "Super Object Category from COCO 2017",
        children=(
            SystemCode("BASEBALL BAT", "Object Category from COCO 2017"),
            SystemCode("BASEBALL GLOVE", "Object Category from COCO 2017"),
            SystemCode("FRISBEE", "Object Category from COCO 2017"),
            SystemCode("KITE", "Object Category from COCO 2017"),
            SystemCode("SKATEBOARD", "Object Category from COCO 2017"),
            SystemCode("SKIS", "Object Category from COCO 2017"),
            SystemCode("SNOWBOARD", "Object Category from COCO 2017"),
            SystemCode("SPORTS BALL", "Object Category from COCO 2017"),
            SystemCode("SURFBOARD", "Object Category from COCO 2017"),
            SystemCode("TENNIS RACKET", "Object Category from COCO 2017"),
        ),
    ),
    SystemCode(
        "VEHICLE",
        "Super Object Category from COCO 2017",
        children=(
            SystemCode("AIRPLANE", "Object Category from COCO 2017"),
            SystemCode("BICYCLE", "Object Category from COCO 2017"),
            SystemCode("BOAT", "Object Category from COCO 2017"),
            SystemCode("BUS", "Object Category from COCO 2017"),
            SystemCode("CAR", "Object Category from COCO 2017"),
            SystemCode("MOTORCYCLE", "Object Category from COCO 2017"),
            SystemCode("TRAIN", "Object Category from COCO 2017"),
            SystemCode("TRUCK", "Object Category from COCO 2017"),
        ),
    ),
)

OBJECT_BBOXES = artefact(
    "object_bboxes",
    kind=StorageKind.ANNOTATIONS,
    codes=(*COCO_CODES, NAMED_ENTITY_PERSON),
)
