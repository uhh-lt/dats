"""The feature declarations.

Every module declares its features with `register_feature` in a `*_feature.py`
file, which `bootstrap.register_jobs` imports. A feature has a text name,
a title, a description and an area, requires artefacts (preprocessed document
data) and other features, and declares whether a new project enables it. The
feature system passes the artefacts of a feature to the artefact system, which
derives the pipeline steps they need.
"""

from collections.abc import Collection
from dataclasses import dataclass
from typing import Iterable

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
    requires_features: frozenset["Feature"]
    default_enabled: bool  # whether a new project enables it


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
        artefacts not in `artefacts` (the registered ones), unregistered or
        cyclic feature requirements."""
        problems: list[str] = []
        for feature in self._features.values():
            problems += [
                f"Feature '{feature.name}' requires artefact '{a.name}', which is not registered."
                for a in sorted(feature.requires_artefacts, key=lambda a: a.name)
                if a not in artefacts
            ]
            problems += [
                f"Feature '{feature.name}' requires the undeclared feature '{f.name}'."
                for f in sorted(feature.requires_features, key=lambda f: f.name)
                if self._features.get(f.name) is not f
            ]
            if feature in self._required_features(feature.requires_features):
                problems.append(f"Feature '{feature.name}' requires itself (cycle).")
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

    def closure(self, features: Iterable[Feature]) -> frozenset[Feature]:
        """The features with all the features they require, transitively."""
        features = frozenset(features)
        return features | self._required_features(features)

    def required_artefacts(self, features: Iterable[Feature]) -> frozenset[Artefact]:
        """The artefacts the features (and the features they require) need,
        without the core artefacts, which every document gets anyway."""
        return (
            frozenset().union(*(f.requires_artefacts for f in self.closure(features)))
            - artefact_registry.always()
        )

    def _required_features(self, features: Iterable[Feature]) -> frozenset[Feature]:
        """The features required by the given ones, transitively (without them,
        unless one of them is required by another)."""
        result: set[Feature] = set()
        todo = [r for f in features for r in f.requires_features]
        while todo:
            feature = todo.pop()
            if feature in result:
                continue
            result.add(feature)
            todo.extend(feature.requires_features)
        return frozenset(result)


feature_registry = FeatureRegistry()


def register_feature(
    name: str,
    *,
    title: str,
    description: str,
    area: FeatureArea,
    requires_artefacts: Collection[Artefact] = (),
    requires_features: Collection[Feature] = (),
    default_enabled: bool = True,
) -> Feature:
    """Declare a feature: a user-facing capability that a project can enable,
    with the artefacts and the other features it requires and whether a new
    project enables it. Returns the feature, which gated endpoints and jobs and
    the `requires_features` of other features import."""
    feature = Feature(
        name=name,
        title=title,
        description=description,
        area=area,
        requires_artefacts=frozenset(requires_artefacts),
        requires_features=frozenset(requires_features),
        default_enabled=default_enabled,
    )
    feature_registry.register(feature)
    return feature
