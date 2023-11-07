from __future__ import unicode_literals

from app.core.data.orm.orm_base import ORMBase
from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Integer,
    String,
    Unicode,
    DateTime,
    ARRAY,
)


# class PolymorphicVerticalProperty(object):
#     """A key/value pair with polymorphic value storage.

#     The class which is mapped should indicate typing information
#     within the "info" dictionary of mapped Column objects; see
#     the AnimalFact mapping below for an example.

#     """

#     def __init__(self, key, value=None):
#         self.key = key
#         self.value = value

#     @hybrid_property
#     def value(self):
#         fieldname, discriminator = self.type_map[self.type]
#         if fieldname is None:
#             return None
#         else:
#             return getattr(self, fieldname)

#     @value.setter
#     def value(self, value):
#         py_type = type(value)
#         fieldname, discriminator = self.type_map[py_type]

#         self.type = discriminator
#         if fieldname is not None:
#             setattr(self, fieldname, value)

#     @value.deleter
#     def value(self):
#         self._set_value(None)

#     @value.comparator
#     class value(PropComparator):
#         """A comparator for .value, builds a polymorphic comparison
#         via CASE."""

#         def __init__(self, cls):
#             self.cls = cls

#         def _case(self):
#             pairs = set(self.cls.type_map.values())
#             whens = [
#                 (
#                     literal_column("'%s'" % discriminator),
#                     cast(getattr(self.cls, attribute), String),
#                 )
#                 for attribute, discriminator in pairs
#                 if attribute is not None
#             ]
#             return case(whens, value=self.cls.type, else_=null())

#         def __eq__(self, other):
#             return self._case() == cast(other, String)

#         def __ne__(self, other):
#             return self._case() != cast(other, String)

#     def __repr__(self):
#         return "<%s %r=%r>" % (self.__class__.__name__, self.key, self.value)


# @event.listens_for(PolymorphicVerticalProperty, "mapper_configured", propagate=True)
# def on_new_class(mapper, cls_):
#     """Look for Column objects with type info in them, and work up
#     a lookup table."""

#     info_dict = {}
#     info_dict[type(None)] = (None, "none")
#     info_dict["none"] = (None, "none")

#     for k in mapper.c.keys():
#         col = mapper.c[k]
#         if "type" in col.info:
#             python_type, discriminator = col.info["type"]
#             info_dict[python_type] = (k, discriminator)
#             info_dict[discriminator] = (k, discriminator)
#     cls_.type_map = info_dict


class SourceDocumentFactORM(ORMBase):
    """A fact about a SourceDocument."""

    # many to one
    source_document_id = Column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        primary_key=True,
    )

    key = Column(Unicode(64), primary_key=True)
    int_value = Column(Integer)
    string_value = Column(String)
    boolean_value = Column(Boolean)
    date_value = Column(DateTime)
    list_value = Column(ARRAY(String))
