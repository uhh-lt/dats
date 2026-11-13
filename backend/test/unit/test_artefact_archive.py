"""Every artefact of a source document says how it travels in a project export
(`modules/eximport/sdocs/artefact_archive.py`)."""

from common.artefact_enum import Artefact
from modules.eximport.sdocs.artefact_archive import ARTEFACT_ARCHIVE


def test_every_artefact_has_an_archive_entry() -> None:
    """Each `Artefact` value has one archive entry, an archive module or the parts
    of the archive that carry it, and no entry names an unknown artefact."""
    assert set(ARTEFACT_ARCHIVE) == set(Artefact)
