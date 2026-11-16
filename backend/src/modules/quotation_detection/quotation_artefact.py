"""The quotations of a German text document, span annotations of the system
user in span groups named "quote", with the code tree of the quotation parts."""

from core.code.system_codes import QUOTATION_CODES
from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.artefact_system_enum import StorageKind

QUOTATIONS = artefact(
    "quotations", kind=StorageKind.ANNOTATIONS, codes=(QUOTATION_CODES,)
)
