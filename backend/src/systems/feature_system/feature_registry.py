"""The feature declarations.

Every module declares its features with `register_feature` in a `*_feature.py`
file, which `bootstrap.register_jobs` imports. A feature has a text name,
a title, a description and an area, requires artefacts (preprocessed document
data), at least one of them not computed for every document, and declares
whether a new project enables it. A feature requires artefacts only, never
another feature. The feature system passes the artefacts of a feature to the
artefact system, which derives the pipeline steps they need.
"""

from collections.abc import Callable, Collection
from dataclasses import dataclass
from typing import Iterable

from sqlalchemy.orm import Session

from common.feature_enum import FeatureArea
from systems.artefact_system.artefact_registry import Artefact, artefact_registry
from systems.feature_system.feature_exceptions import FeatureDeclarationError


@dataclass(frozen=True, eq=False)
class Feature:
    """A user-facing capability that a project can enable or disable. Compared
    by identity: the registry keeps the names unique."""

    name: str
    title: str
    description: str
    area: FeatureArea
    requires_artefacts: frozenset[Artefact]
    default_enabled: bool  # whether a new project enables it
    # what the feature sets up in a project before anything is computed (see
    # `register_feature`); None if it needs nothing besides the system codes
    set_up: Callable[[Session, int], None] | None = None


class FeatureRegistry:
    """Collects the features of `register_feature`."""

    def __init__(self) -> None:
        self._features: dict[str, Feature] = {}

    def register(self, feature: Feature) -> None:
        if feature.name in self._features:
            raise FeatureDeclarationError(
                [f"Feature '{feature.name}' is declared twice."]
            )
        self._features[feature.name] = feature

    def unregister_feature(self, name: str) -> None:
        """Remove the feature of this name (tests)."""
        self._features.pop(name, None)

    def check(self, artefacts: Collection[Artefact]) -> None:
        """Raise a `FeatureDeclarationError` listing all problems: required
        artefacts not in `artefacts` (the registered ones) and features that
        require no artefact besides the core artefacts (`always`): such a
        feature needs no processing and is not toggleable."""
        problems: list[str] = []
        for feature in self._features.values():
            problems += [
                f"Feature '{feature.name}' requires artefact '{a.name}', which is not registered."
                for a in sorted(feature.requires_artefacts, key=lambda a: a.name)
                if a not in artefacts
            ]
            if all(a.always for a in feature.requires_artefacts):
                problems.append(
                    f"Feature '{feature.name}' requires no artefact besides the core artefacts; "
                    "it needs no processing and must not be a feature."
                )
        if problems:
            raise FeatureDeclarationError(problems)

    def feature(self, name: str) -> Feature | None:
        """The feature of this name, None if no feature of this name is
        registered (e.g. a stored name of a removed feature)."""
        return self._features.get(name)

    def declarations(self) -> list[Feature]:
        """All features, ordered by the position of their area in
        `FeatureArea`, then by title."""
        areas = list(FeatureArea)
        return sorted(
            self._features.values(), key=lambda f: (areas.index(f.area), f.title)
        )

    def names(self) -> list[str]:
        """The names of all features, in the order of `declarations()`."""
        return [f.name for f in self.declarations()]

    def defaults(self) -> list[Feature]:
        """The features a new project enables (`default_enabled`), in the order
        of `declarations()`."""
        return [f for f in self.declarations() if f.default_enabled]

    def required_artefacts(self, features: Iterable[Feature]) -> frozenset[Artefact]:
        """The artefacts the features need, without the core artefacts, which
        every document gets anyway."""
        return (
            frozenset().union(*(f.requires_artefacts for f in features))
            - artefact_registry.always()
        )


feature_registry = FeatureRegistry()


def register_feature(
    name: str,
    *,
    title: str,
    description: str,
    area: FeatureArea,
    requires_artefacts: Collection[Artefact],
    default_enabled: bool = True,
    set_up: Callable[[Session, int], None] | None = None,
) -> Feature:
    """Declare a feature: a user-facing capability that a project can enable,
    with the artefacts it requires and whether a new project enables it.
    Returns the feature, which gated endpoints and jobs import.

    `set_up(db, project_id)` sets up whatever else the feature needs in a
    project (metadata keys, tags, rows of the module's own tables). It runs
    after the system codes the artefacts declare are created and before
    anything is computed: on Enable, on the creation of a project with the
    feature and on a project import that enables it; not on Complete or
    Disable. It must be safe to run twice (Enable again runs it again), and
    Disable does not undo it. System codes are declared on the artefacts
    (`Artefact.codes`), never created here."""
    feature = Feature(
        name=name,
        title=title,
        description=description,
        area=area,
        requires_artefacts=frozenset(requires_artefacts),
        default_enabled=default_enabled,
        set_up=set_up,
    )
    feature_registry.register(feature)
    return feature
