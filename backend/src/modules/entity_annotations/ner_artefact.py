"""The named-entity spans of a document, span annotations of the system user,
with the code tree of their entity types."""

import dataclasses

from core.code.system_codes import NAMED_ENTITY_PERSON, SystemCode
from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.artefact_system_enum import StorageKind

# NAMED_ENTITY with its 19 entity types; PERSON comes from core
NAMED_ENTITY_CODES = dataclasses.replace(
    NAMED_ENTITY_PERSON,
    children=(
        *NAMED_ENTITY_PERSON.children,
        SystemCode(
            "CARDINAL", "Numerals that do not fall under another type", enabled=False
        ),
        SystemCode("DATE", "Absolute or relative dates or periods"),
        SystemCode("EVENT", "Named hurricanes, battles, wars, sports events, etc."),
        SystemCode(
            "FAC", "Buildings, airports, highways, bridges, etc.", enabled=False
        ),
        SystemCode("GPE", "Countries, cities, states"),
        SystemCode("LANGUAGE", "Any named language", enabled=False),
        SystemCode("LAW", "Named documents made into laws.", enabled=False),
        SystemCode("LOC", "Non-GPE locations, mountain ranges, bodies of water"),
        SystemCode("MONEY", "Monetary values, including unit", enabled=False),
        SystemCode(
            "NORP", "Nationalities or religious or political groups", enabled=False
        ),
        SystemCode("ORDINAL", "'first', 'second', etc.", enabled=False),
        SystemCode("ORG", "Companies, agencies, institutions, etc."),
        SystemCode("PERCENT", "Percentage, including '%'", enabled=False),
        SystemCode(
            "PRODUCT", "Objects, vehicles, foods, etc. (not services)", enabled=False
        ),
        SystemCode("QUANTITY", "Measurements, as of weight or distance", enabled=False),
        SystemCode("TIME", "Times smaller than a day", enabled=False),
        SystemCode("WORK_OF_ART", "Titles of books, songs, etc."),
        SystemCode(
            "MISC",
            "Miscellaneous entities, e.g. events, nationalities, products or works of art",
            enabled=False,
        ),
    ),
)

NER_SPANS = artefact(
    "ner_spans", kind=StorageKind.ANNOTATIONS, codes=(NAMED_ENTITY_CODES,)
)
