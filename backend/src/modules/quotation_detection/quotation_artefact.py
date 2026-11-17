"""The quotations of a German text document, span annotations of the system
user in span groups named "quote", with the code tree of the quotation parts."""

from core.code.system_codes import SystemCode
from systems.artefact_system.artefact_registry import artefact

QUOTATION_CODES = SystemCode(
    "QUOTATIONS",
    "Quotation parts",
    children=(
        SystemCode(
            "QUOTE",
            "the quotation uttered by the Speaker",
            children=(
                SystemCode(
                    "DIRECT", "actual words of an utterance, usually in quotation marks"
                ),
                SystemCode(
                    "INDIRECT",
                    "content-wise equivalent utterance using different words, usually part of a sentence together with a Frame",
                ),
                SystemCode(
                    "REPORTED",
                    "report of a speech action, possibly far from the original quote, usually a full sentence, no Frame",
                ),
                SystemCode(
                    "FREE_INDIRECT",
                    'mix of article author & actual speaker, typically construct with "sollen" (shall) or "müssen" (must), full sentence',
                ),
                SystemCode(
                    "INDIRECT_FREE_INDIRECT",
                    "content-wise equivalent utterance written in conjunctive mood, full sentence",
                ),
            ),
        ),
        SystemCode("SPEAKER", "entity in the text that utters the quotation"),
        SystemCode(
            "CUE", "words that are part of a Frame and signal a Quote construction"
        ),
        SystemCode("ADDRESSEE", "entity in the text that the quotation is directed at"),
        SystemCode(
            "FRAME", "part of a sentence including Cue & Speaker, but not the quotation"
        ),
    ),
)

QUOTATIONS = artefact("quotations", codes=(QUOTATION_CODES,))
