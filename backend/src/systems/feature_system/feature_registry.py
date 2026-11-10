"""The feature declarations.

Every module declares its features with `register_feature` in a `*_feature.py`
file, which `bootstrap.register_features` imports. A feature requires artefacts
(preprocessed document data) and other features; the `FeatureService` derives
from these declarations which pipeline steps a project needs.
"""

from dataclasses import dataclass
from typing import Iterable

from common.artefact_enum import CORE_ARTEFACTS, Artefact
from common.feature_enum import Feature
from systems.feature_system.feature_exceptions import FeatureDeclarationError


@dataclass(frozen=True)
class FeatureDeclaration:
    feature: Feature
    title: str
    description: str
    requires_artefacts: frozenset[Artefact]
    requires_features: frozenset[Feature]


class FeatureRegistry:
    """Collects the declarations of `register_feature`."""

    def __init__(self) -> None:
        self._declarations: dict[Feature, FeatureDeclaration] = {}

    def register(self, declaration: FeatureDeclaration) -> None:
        if declaration.feature in self._declarations:
            raise FeatureDeclarationError(
                [f"Feature '{declaration.feature.value}' is declared twice."]
            )
        self._declarations[declaration.feature] = declaration

    def check(self, produced: frozenset[Artefact]) -> None:
        """Raise a `FeatureDeclarationError` listing all problems: undeclared
        features, artefacts not in `produced` (the artefacts of the pipeline),
        unknown or cyclic feature requirements."""
        problems = [
            f"Feature '{f.value}' is not declared with register_feature."
            for f in Feature
            if f not in self._declarations
        ]
        for declaration in self._declarations.values():
            name = declaration.feature.value
            problems += [
                f"Feature '{name}' requires artefact '{a.value}', which no step produces."
                for a in sorted(declaration.requires_artefacts, key=lambda a: a.value)
                if a not in produced
            ]
            problems += [
                f"Feature '{name}' requires the undeclared feature '{f.value}'."
                for f in sorted(declaration.requires_features, key=lambda f: f.value)
                if f not in self._declarations
            ]
            if declaration.feature in self._required_features(
                declaration.requires_features
            ):
                problems.append(f"Feature '{name}' requires itself (cycle).")
        if problems:
            raise FeatureDeclarationError(problems)

    def declarations(self) -> list[FeatureDeclaration]:
        """All declarations, in the order of the `Feature` enum."""
        return [self._declarations[f] for f in Feature if f in self._declarations]

    def declaration(self, feature: Feature) -> FeatureDeclaration:
        return self._declarations[feature]

    def closure(self, features: Iterable[Feature]) -> frozenset[Feature]:
        """The features with all the features they require, transitively."""
        features = frozenset(features)
        return features | self._required_features(features)

    def required_artefacts(self, features: Iterable[Feature]) -> frozenset[Artefact]:
        """The artefacts the features (and the features they require) need,
        plus the core artefacts every document gets."""
        return CORE_ARTEFACTS.union(
            *(
                self._declarations[f].requires_artefacts
                for f in self.closure(features)
                if f in self._declarations
            )
        )

    def _required_features(self, features: Iterable[Feature]) -> frozenset[Feature]:
        """The features required by the given ones, transitively (without them,
        unless one of them is required by another)."""
        result: set[Feature] = set()
        todo = [
            r
            for f in features
            if f in self._declarations
            for r in self._declarations[f].requires_features
        ]
        while todo:
            feature = todo.pop()
            if feature in result:
                continue
            result.add(feature)
            if feature in self._declarations:
                todo.extend(self._declarations[feature].requires_features)
        return frozenset(result)


feature_registry = FeatureRegistry()


def register_feature(
    feature: Feature,
    *,
    title: str,
    description: str,
    requires_artefacts: set[Artefact],
    requires_features: set[Feature],
) -> None:
    """Declare a feature: a user-facing capability that a project can enable,
    with the artefacts and the other features it requires."""
    feature_registry.register(
        FeatureDeclaration(
            feature=feature,
            title=title,
            description=description,
            requires_artefacts=frozenset(requires_artefacts),
            requires_features=frozenset(requires_features),
        )
    )
