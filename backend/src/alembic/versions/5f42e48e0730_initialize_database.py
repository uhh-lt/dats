"""Initialize database

Revision ID: 5f42e48e0730
Revises:
Create Date: 2023-11-24 11:38:13.155628

"""
from typing import Sequence, Union

import sqlalchemy as sa
from loguru import logger

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5f42e48e0730"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # This migration is only needed for new, empty databases.
    # Databases that have already been initialized
    # will skip this migration.
    user_table_exists = sa.inspect(op.get_bind()).has_table("user")
    if user_table_exists:
        logger.warning("Found existing users table. Skipping database initialization.")
        return

    op.execute(
        """
--
-- PostgreSQL database dump
--

-- Dumped from database version 15.5
-- Dumped by pg_dump version 15.5

CREATE TABLE action (
    id integer NOT NULL,
    executed timestamp without time zone DEFAULT now() NOT NULL,
    action_type character varying NOT NULL,
    target_id integer NOT NULL,
    target_type character varying NOT NULL,
    before_state character varying,
    after_state character varying,
    user_id integer,
    project_id integer NOT NULL
);


CREATE SEQUENCE action_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE action_id_seq OWNED BY action.id;


CREATE TABLE analysistable (
    id integer NOT NULL,
    created timestamp without time zone DEFAULT now() NOT NULL,
    updated timestamp without time zone DEFAULT now() NOT NULL,
    title character varying NOT NULL,
    content character varying NOT NULL,
    table_type character varying NOT NULL,
    project_id integer NOT NULL,
    user_id integer NOT NULL
);


CREATE SEQUENCE analysistable_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE analysistable_id_seq OWNED BY analysistable.id;


CREATE SEQUENCE annotation_document_id_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


CREATE TABLE annotationdocument (
    id integer DEFAULT nextval('annotation_document_id_sequence'::regclass) NOT NULL,
    created timestamp without time zone DEFAULT now() NOT NULL,
    updated timestamp without time zone DEFAULT now() NOT NULL,
    source_document_id integer NOT NULL,
    user_id integer NOT NULL
);


CREATE TABLE bboxannotation (
    id integer NOT NULL,
    x_min integer NOT NULL,
    x_max integer NOT NULL,
    y_min integer NOT NULL,
    y_max integer NOT NULL,
    created timestamp without time zone DEFAULT now() NOT NULL,
    updated timestamp without time zone DEFAULT now() NOT NULL,
    current_code_id integer NOT NULL,
    annotation_document_id integer NOT NULL
);


CREATE SEQUENCE bboxannotation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE bboxannotation_id_seq OWNED BY bboxannotation.id;


CREATE TABLE code (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    color character varying,
    created timestamp without time zone DEFAULT now(),
    updated timestamp without time zone DEFAULT now(),
    user_id integer,
    project_id integer NOT NULL,
    parent_code_id integer
);


CREATE SEQUENCE code_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE code_id_seq OWNED BY code.id;


CREATE TABLE currentcode (
    id integer NOT NULL,
    code_id integer NOT NULL
);


CREATE SEQUENCE currentcode_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE currentcode_id_seq OWNED BY currentcode.id;


CREATE TABLE documenttag (
    id integer NOT NULL,
    title character varying NOT NULL,
    description character varying,
    color character varying,
    created timestamp without time zone DEFAULT now(),
    updated timestamp without time zone DEFAULT now(),
    project_id integer NOT NULL
);


CREATE SEQUENCE documenttag_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE documenttag_id_seq OWNED BY documenttag.id;


CREATE TABLE memo (
    id integer NOT NULL,
    title character varying NOT NULL,
    content character varying NOT NULL,
    starred boolean NOT NULL,
    created timestamp without time zone DEFAULT now(),
    updated timestamp without time zone DEFAULT now(),
    attached_to_id integer NOT NULL,
    project_id integer NOT NULL,
    user_id integer NOT NULL
);


CREATE SEQUENCE memo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE memo_id_seq OWNED BY memo.id;


CREATE TABLE objecthandle (
    id integer NOT NULL,
    user_id integer,
    project_id integer,
    memo_id integer,
    code_id integer,
    current_code_id integer,
    source_document_id integer,
    source_document_metadata_id integer,
    annotation_document_id integer,
    span_annotation_id integer,
    span_group_id integer,
    bbox_annotation_id integer,
    document_tag_id integer,
    action_id integer,
    CONSTRAINT "CC_object_handle_refers_to_exactly_one_instance" CHECK ((((((((((((((
CASE
    WHEN (user_id IS NULL) THEN 0
    ELSE 1
END +
CASE
    WHEN (project_id IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN (code_id IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN (memo_id IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN (current_code_id IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN (source_document_id IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN (source_document_metadata_id IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN (annotation_document_id IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN (span_annotation_id IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN (bbox_annotation_id IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN (span_group_id IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN (document_tag_id IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN (action_id IS NULL) THEN 0
    ELSE 1
END) = 1))
);


CREATE SEQUENCE objecthandle_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE objecthandle_id_seq OWNED BY objecthandle.id;


CREATE TABLE preprocessingjob (
    id character varying NOT NULL,
    status character varying NOT NULL,
    created timestamp without time zone DEFAULT now() NOT NULL,
    updated timestamp without time zone DEFAULT now() NOT NULL,
    project_id integer NOT NULL
);


CREATE TABLE preprocessingjobpayload (
    id character varying NOT NULL,
    filename character varying NOT NULL,
    mime_type character varying NOT NULL,
    doc_type character varying NOT NULL,
    status character varying NOT NULL,
    current_pipeline_step character varying,
    error_message character varying,
    project_id integer NOT NULL,
    prepro_job_id character varying NOT NULL,
    source_document_id integer
);


CREATE TABLE project (
    id integer NOT NULL,
    title character varying NOT NULL,
    description character varying NOT NULL,
    created timestamp without time zone DEFAULT now() NOT NULL,
    updated timestamp without time zone DEFAULT now() NOT NULL
);


CREATE SEQUENCE project_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE project_id_seq OWNED BY project.id;


CREATE TABLE projectuserlinktable (
    project_id integer NOT NULL,
    user_id integer NOT NULL
);


CREATE TABLE sourcedocument (
    id integer NOT NULL,
    filename character varying NOT NULL,
    content character varying NOT NULL,
    doctype character varying NOT NULL,
    status character varying NOT NULL,
    created timestamp without time zone DEFAULT now() NOT NULL,
    updated timestamp without time zone DEFAULT now() NOT NULL,
    project_id integer NOT NULL
);


CREATE SEQUENCE sourcedocument_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sourcedocument_id_seq OWNED BY sourcedocument.id;


CREATE TABLE sourcedocumentdocumenttaglinktable (
    source_document_id integer NOT NULL,
    document_tag_id integer NOT NULL
);


CREATE TABLE sourcedocumentlink (
    id integer NOT NULL,
    parent_source_document_id integer,
    linked_source_document_id integer,
    linked_source_document_filename character varying
);


CREATE SEQUENCE sourcedocumentlink_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sourcedocumentlink_id_seq OWNED BY sourcedocumentlink.id;


CREATE TABLE sourcedocumentmetadata (
    id integer NOT NULL,
    key character varying NOT NULL,
    value character varying NOT NULL,
    read_only boolean NOT NULL,
    source_document_id integer NOT NULL
);


CREATE SEQUENCE sourcedocumentmetadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sourcedocumentmetadata_id_seq OWNED BY sourcedocumentmetadata.id;


CREATE TABLE spanannotation (
    id integer NOT NULL,
    begin integer NOT NULL,
    "end" integer NOT NULL,
    begin_token integer NOT NULL,
    end_token integer NOT NULL,
    created timestamp without time zone DEFAULT now() NOT NULL,
    updated timestamp without time zone DEFAULT now() NOT NULL,
    current_code_id integer NOT NULL,
    annotation_document_id integer NOT NULL,
    span_text_id integer NOT NULL
);


CREATE SEQUENCE spanannotation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE spanannotation_id_seq OWNED BY spanannotation.id;


CREATE TABLE spanannotationspangrouplinktable (
    span_annotation_id integer NOT NULL,
    span_group_id integer NOT NULL
);


CREATE TABLE spangroup (
    id integer NOT NULL,
    name character varying NOT NULL,
    created timestamp without time zone DEFAULT now() NOT NULL,
    updated timestamp without time zone DEFAULT now() NOT NULL,
    annotation_document_id integer NOT NULL
);


CREATE SEQUENCE spangroup_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE spangroup_id_seq OWNED BY spangroup.id;


CREATE TABLE spantext (
    id integer NOT NULL,
    text character varying NOT NULL
);


CREATE SEQUENCE spantext_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE spantext_id_seq OWNED BY spantext.id;


CREATE TABLE "user" (
    id integer NOT NULL,
    email character varying NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    password character varying NOT NULL,
    created timestamp without time zone DEFAULT now() NOT NULL,
    updated timestamp without time zone DEFAULT now() NOT NULL
);


CREATE SEQUENCE user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE user_id_seq OWNED BY "user".id;


CREATE TABLE whiteboard (
    id integer NOT NULL,
    created timestamp without time zone DEFAULT now() NOT NULL,
    updated timestamp without time zone DEFAULT now() NOT NULL,
    title character varying NOT NULL,
    content character varying NOT NULL,
    project_id integer NOT NULL,
    user_id integer NOT NULL
);


CREATE SEQUENCE whiteboard_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE whiteboard_id_seq OWNED BY whiteboard.id;


ALTER TABLE ONLY action ALTER COLUMN id SET DEFAULT nextval('action_id_seq'::regclass);


ALTER TABLE ONLY analysistable ALTER COLUMN id SET DEFAULT nextval('analysistable_id_seq'::regclass);


ALTER TABLE ONLY bboxannotation ALTER COLUMN id SET DEFAULT nextval('bboxannotation_id_seq'::regclass);


ALTER TABLE ONLY code ALTER COLUMN id SET DEFAULT nextval('code_id_seq'::regclass);


ALTER TABLE ONLY currentcode ALTER COLUMN id SET DEFAULT nextval('currentcode_id_seq'::regclass);


ALTER TABLE ONLY documenttag ALTER COLUMN id SET DEFAULT nextval('documenttag_id_seq'::regclass);


ALTER TABLE ONLY memo ALTER COLUMN id SET DEFAULT nextval('memo_id_seq'::regclass);


ALTER TABLE ONLY objecthandle ALTER COLUMN id SET DEFAULT nextval('objecthandle_id_seq'::regclass);


ALTER TABLE ONLY project ALTER COLUMN id SET DEFAULT nextval('project_id_seq'::regclass);


ALTER TABLE ONLY sourcedocument ALTER COLUMN id SET DEFAULT nextval('sourcedocument_id_seq'::regclass);


ALTER TABLE ONLY sourcedocumentlink ALTER COLUMN id SET DEFAULT nextval('sourcedocumentlink_id_seq'::regclass);


ALTER TABLE ONLY sourcedocumentmetadata ALTER COLUMN id SET DEFAULT nextval('sourcedocumentmetadata_id_seq'::regclass);


ALTER TABLE ONLY spanannotation ALTER COLUMN id SET DEFAULT nextval('spanannotation_id_seq'::regclass);


ALTER TABLE ONLY spangroup ALTER COLUMN id SET DEFAULT nextval('spangroup_id_seq'::regclass);


ALTER TABLE ONLY spantext ALTER COLUMN id SET DEFAULT nextval('spantext_id_seq'::regclass);


ALTER TABLE ONLY "user" ALTER COLUMN id SET DEFAULT nextval('user_id_seq'::regclass);


ALTER TABLE ONLY whiteboard ALTER COLUMN id SET DEFAULT nextval('whiteboard_id_seq'::regclass);


ALTER TABLE ONLY code
    ADD CONSTRAINT "UC_name_unique_per_user_parent_and_project" UNIQUE (user_id, project_id, name, parent_code_id);


ALTER TABLE ONLY objecthandle
    ADD CONSTRAINT "UC_only_one_object_handle_per_instance" UNIQUE (user_id, project_id, code_id, current_code_id, source_document_id, source_document_metadata_id, annotation_document_id, span_annotation_id, span_group_id, document_tag_id, action_id, memo_id);


ALTER TABLE ONLY sourcedocument
    ADD CONSTRAINT "UC_unique_filename_in_project" UNIQUE (project_id, filename);


ALTER TABLE ONLY sourcedocumentmetadata
    ADD CONSTRAINT "UC_unique_metadata_key_per_sdoc" UNIQUE (source_document_id, key);


ALTER TABLE ONLY action
    ADD CONSTRAINT action_pkey PRIMARY KEY (id);


ALTER TABLE ONLY analysistable
    ADD CONSTRAINT analysistable_pkey PRIMARY KEY (id);


ALTER TABLE ONLY annotationdocument
    ADD CONSTRAINT annotationdocument_pkey PRIMARY KEY (source_document_id, user_id);


ALTER TABLE ONLY bboxannotation
    ADD CONSTRAINT bboxannotation_pkey PRIMARY KEY (id);


ALTER TABLE ONLY code
    ADD CONSTRAINT code_pkey PRIMARY KEY (id);


ALTER TABLE ONLY currentcode
    ADD CONSTRAINT currentcode_pkey PRIMARY KEY (id);


ALTER TABLE ONLY documenttag
    ADD CONSTRAINT documenttag_pkey PRIMARY KEY (id);


ALTER TABLE ONLY memo
    ADD CONSTRAINT memo_pkey PRIMARY KEY (id);


ALTER TABLE ONLY objecthandle
    ADD CONSTRAINT objecthandle_pkey PRIMARY KEY (id);


ALTER TABLE ONLY preprocessingjob
    ADD CONSTRAINT preprocessingjob_pkey PRIMARY KEY (id);


ALTER TABLE ONLY preprocessingjobpayload
    ADD CONSTRAINT preprocessingjobpayload_pkey PRIMARY KEY (id);


ALTER TABLE ONLY project
    ADD CONSTRAINT project_pkey PRIMARY KEY (id);


ALTER TABLE ONLY projectuserlinktable
    ADD CONSTRAINT projectuserlinktable_pkey PRIMARY KEY (project_id, user_id);


ALTER TABLE ONLY sourcedocument
    ADD CONSTRAINT sourcedocument_pkey PRIMARY KEY (id);


ALTER TABLE ONLY sourcedocumentdocumenttaglinktable
    ADD CONSTRAINT sourcedocumentdocumenttaglinktable_pkey PRIMARY KEY (source_document_id, document_tag_id);


ALTER TABLE ONLY sourcedocumentlink
    ADD CONSTRAINT sourcedocumentlink_pkey PRIMARY KEY (id);


ALTER TABLE ONLY sourcedocumentmetadata
    ADD CONSTRAINT sourcedocumentmetadata_pkey PRIMARY KEY (id);


ALTER TABLE ONLY spanannotation
    ADD CONSTRAINT spanannotation_pkey PRIMARY KEY (id);


ALTER TABLE ONLY spanannotationspangrouplinktable
    ADD CONSTRAINT spanannotationspangrouplinktable_pkey PRIMARY KEY (span_annotation_id, span_group_id);


ALTER TABLE ONLY spangroup
    ADD CONSTRAINT spangroup_pkey PRIMARY KEY (id);


ALTER TABLE ONLY spantext
    ADD CONSTRAINT spantext_pkey PRIMARY KEY (id);


ALTER TABLE ONLY "user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


ALTER TABLE ONLY whiteboard
    ADD CONSTRAINT whiteboard_pkey PRIMARY KEY (id);


CREATE UNIQUE INDEX idx_for_uc_work_with_null ON objecthandle USING btree (COALESCE(user_id, 0), COALESCE(project_id, 0), COALESCE(code_id, 0), COALESCE(current_code_id, 0), COALESCE(source_document_id, 0), COALESCE(source_document_metadata_id, 0), COALESCE(annotation_document_id, 0), COALESCE(span_annotation_id, 0), COALESCE(bbox_annotation_id, 0), COALESCE(span_group_id, 0), COALESCE(document_tag_id, 0), COALESCE(action_id, 0), COALESCE(memo_id, 0));


CREATE INDEX ix_action_action_type ON action USING btree (action_type);


CREATE INDEX ix_action_executed ON action USING btree (executed);


CREATE INDEX ix_action_id ON action USING btree (id);


CREATE INDEX ix_action_project_id ON action USING btree (project_id);


CREATE INDEX ix_action_target_id ON action USING btree (target_id);


CREATE INDEX ix_action_target_type ON action USING btree (target_type);


CREATE INDEX ix_action_user_id ON action USING btree (user_id);


CREATE INDEX ix_analysistable_created ON analysistable USING btree (created);


CREATE INDEX ix_analysistable_id ON analysistable USING btree (id);


CREATE INDEX ix_analysistable_project_id ON analysistable USING btree (project_id);


CREATE INDEX ix_analysistable_user_id ON analysistable USING btree (user_id);


CREATE INDEX ix_annotationdocument_created ON annotationdocument USING btree (created);


CREATE UNIQUE INDEX ix_annotationdocument_id ON annotationdocument USING btree (id);


CREATE INDEX ix_annotationdocument_source_document_id ON annotationdocument USING btree (source_document_id);


CREATE INDEX ix_annotationdocument_user_id ON annotationdocument USING btree (user_id);


CREATE INDEX ix_bboxannotation_annotation_document_id ON bboxannotation USING btree (annotation_document_id);


CREATE INDEX ix_bboxannotation_created ON bboxannotation USING btree (created);


CREATE INDEX ix_bboxannotation_current_code_id ON bboxannotation USING btree (current_code_id);


CREATE INDEX ix_bboxannotation_id ON bboxannotation USING btree (id);


CREATE INDEX ix_bboxannotation_x_max ON bboxannotation USING btree (x_max);


CREATE INDEX ix_bboxannotation_x_min ON bboxannotation USING btree (x_min);


CREATE INDEX ix_bboxannotation_y_max ON bboxannotation USING btree (y_max);


CREATE INDEX ix_bboxannotation_y_min ON bboxannotation USING btree (y_min);


CREATE INDEX ix_code_color ON code USING btree (color);


CREATE INDEX ix_code_created ON code USING btree (created);


CREATE INDEX ix_code_description ON code USING btree (description);


CREATE INDEX ix_code_id ON code USING btree (id);


CREATE INDEX ix_code_name ON code USING btree (name);


CREATE INDEX ix_code_project_id ON code USING btree (project_id);


CREATE INDEX ix_code_user_id ON code USING btree (user_id);


CREATE INDEX ix_currentcode_code_id ON currentcode USING btree (code_id);


CREATE INDEX ix_currentcode_id ON currentcode USING btree (id);


CREATE INDEX ix_documenttag_created ON documenttag USING btree (created);


CREATE INDEX ix_documenttag_description ON documenttag USING btree (description);


CREATE INDEX ix_documenttag_id ON documenttag USING btree (id);


CREATE INDEX ix_documenttag_project_id ON documenttag USING btree (project_id);


CREATE INDEX ix_documenttag_title ON documenttag USING btree (title);


CREATE INDEX ix_memo_attached_to_id ON memo USING btree (attached_to_id);


CREATE INDEX ix_memo_created ON memo USING btree (created);


CREATE INDEX ix_memo_id ON memo USING btree (id);


CREATE INDEX ix_memo_project_id ON memo USING btree (project_id);


CREATE INDEX ix_memo_starred ON memo USING btree (starred);


CREATE INDEX ix_memo_title ON memo USING btree (title);


CREATE INDEX ix_memo_user_id ON memo USING btree (user_id);


CREATE INDEX ix_objecthandle_action_id ON objecthandle USING btree (action_id);


CREATE INDEX ix_objecthandle_annotation_document_id ON objecthandle USING btree (annotation_document_id);


CREATE INDEX ix_objecthandle_bbox_annotation_id ON objecthandle USING btree (bbox_annotation_id);


CREATE INDEX ix_objecthandle_code_id ON objecthandle USING btree (code_id);


CREATE INDEX ix_objecthandle_current_code_id ON objecthandle USING btree (current_code_id);


CREATE INDEX ix_objecthandle_document_tag_id ON objecthandle USING btree (document_tag_id);


CREATE INDEX ix_objecthandle_id ON objecthandle USING btree (id);


CREATE INDEX ix_objecthandle_memo_id ON objecthandle USING btree (memo_id);


CREATE INDEX ix_objecthandle_project_id ON objecthandle USING btree (project_id);


CREATE INDEX ix_objecthandle_source_document_id ON objecthandle USING btree (source_document_id);


CREATE INDEX ix_objecthandle_source_document_metadata_id ON objecthandle USING btree (source_document_metadata_id);


CREATE INDEX ix_objecthandle_span_annotation_id ON objecthandle USING btree (span_annotation_id);


CREATE INDEX ix_objecthandle_span_group_id ON objecthandle USING btree (span_group_id);


CREATE INDEX ix_objecthandle_user_id ON objecthandle USING btree (user_id);


CREATE INDEX ix_preprocessingjob_project_id ON preprocessingjob USING btree (project_id);


CREATE INDEX ix_preprocessingjob_status ON preprocessingjob USING btree (status);


CREATE INDEX ix_preprocessingjobpayload_prepro_job_id ON preprocessingjobpayload USING btree (prepro_job_id);


CREATE INDEX ix_preprocessingjobpayload_status ON preprocessingjobpayload USING btree (status);


CREATE INDEX ix_project_created ON project USING btree (created);


CREATE INDEX ix_project_description ON project USING btree (description);


CREATE INDEX ix_project_id ON project USING btree (id);


CREATE UNIQUE INDEX ix_project_title ON project USING btree (title);


CREATE INDEX ix_sourcedocument_created ON sourcedocument USING btree (created);


CREATE INDEX ix_sourcedocument_doctype ON sourcedocument USING btree (doctype);


CREATE INDEX ix_sourcedocument_filename ON sourcedocument USING btree (filename);


CREATE INDEX ix_sourcedocument_id ON sourcedocument USING btree (id);


CREATE INDEX ix_sourcedocument_project_id ON sourcedocument USING btree (project_id);


CREATE INDEX ix_sourcedocument_status ON sourcedocument USING btree (status);


CREATE INDEX ix_sourcedocumentlink_id ON sourcedocumentlink USING btree (id);


CREATE INDEX ix_sourcedocumentlink_linked_source_document_filename ON sourcedocumentlink USING btree (linked_source_document_filename);


CREATE INDEX ix_sourcedocumentlink_linked_source_document_id ON sourcedocumentlink USING btree (linked_source_document_id);


CREATE INDEX ix_sourcedocumentlink_parent_source_document_id ON sourcedocumentlink USING btree (parent_source_document_id);


CREATE INDEX ix_sourcedocumentmetadata_id ON sourcedocumentmetadata USING btree (id);


CREATE INDEX ix_sourcedocumentmetadata_key ON sourcedocumentmetadata USING btree (key);


CREATE INDEX ix_sourcedocumentmetadata_read_only ON sourcedocumentmetadata USING btree (read_only);


CREATE INDEX ix_sourcedocumentmetadata_source_document_id ON sourcedocumentmetadata USING btree (source_document_id);


CREATE INDEX ix_spanannotation_annotation_document_id ON spanannotation USING btree (annotation_document_id);


CREATE INDEX ix_spanannotation_begin ON spanannotation USING btree (begin);


CREATE INDEX ix_spanannotation_begin_token ON spanannotation USING btree (begin_token);


CREATE INDEX ix_spanannotation_created ON spanannotation USING btree (created);


CREATE INDEX ix_spanannotation_current_code_id ON spanannotation USING btree (current_code_id);


CREATE INDEX ix_spanannotation_end ON spanannotation USING btree ("end");


CREATE INDEX ix_spanannotation_end_token ON spanannotation USING btree (end_token);


CREATE INDEX ix_spanannotation_id ON spanannotation USING btree (id);


CREATE INDEX ix_spanannotation_span_text_id ON spanannotation USING btree (span_text_id);


CREATE INDEX ix_spangroup_annotation_document_id ON spangroup USING btree (annotation_document_id);


CREATE INDEX ix_spangroup_created ON spangroup USING btree (created);


CREATE INDEX ix_spangroup_id ON spangroup USING btree (id);


CREATE INDEX ix_spangroup_name ON spangroup USING btree (name);


CREATE INDEX ix_spantext_id ON spantext USING btree (id);


CREATE INDEX ix_spantext_text ON spantext USING btree (text);


CREATE INDEX ix_user_created ON "user" USING btree (created);


CREATE UNIQUE INDEX ix_user_email ON "user" USING btree (email);


CREATE INDEX ix_user_first_name ON "user" USING btree (first_name);


CREATE INDEX ix_user_id ON "user" USING btree (id);


CREATE INDEX ix_user_last_name ON "user" USING btree (last_name);


CREATE INDEX ix_whiteboard_created ON whiteboard USING btree (created);


CREATE INDEX ix_whiteboard_id ON whiteboard USING btree (id);


CREATE INDEX ix_whiteboard_project_id ON whiteboard USING btree (project_id);


CREATE INDEX ix_whiteboard_user_id ON whiteboard USING btree (user_id);


ALTER TABLE ONLY action
    ADD CONSTRAINT action_project_id_fkey FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;


ALTER TABLE ONLY action
    ADD CONSTRAINT action_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;


ALTER TABLE ONLY analysistable
    ADD CONSTRAINT analysistable_project_id_fkey FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;


ALTER TABLE ONLY analysistable
    ADD CONSTRAINT analysistable_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;


ALTER TABLE ONLY annotationdocument
    ADD CONSTRAINT annotationdocument_source_document_id_fkey FOREIGN KEY (source_document_id) REFERENCES sourcedocument(id) ON DELETE CASCADE;


ALTER TABLE ONLY annotationdocument
    ADD CONSTRAINT annotationdocument_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;


ALTER TABLE ONLY bboxannotation
    ADD CONSTRAINT bboxannotation_annotation_document_id_fkey FOREIGN KEY (annotation_document_id) REFERENCES annotationdocument(id) ON DELETE CASCADE;


ALTER TABLE ONLY bboxannotation
    ADD CONSTRAINT bboxannotation_current_code_id_fkey FOREIGN KEY (current_code_id) REFERENCES currentcode(id) ON DELETE CASCADE;


ALTER TABLE ONLY code
    ADD CONSTRAINT code_parent_code_id_fkey FOREIGN KEY (parent_code_id) REFERENCES code(id) ON DELETE CASCADE;


ALTER TABLE ONLY code
    ADD CONSTRAINT code_project_id_fkey FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;


ALTER TABLE ONLY code
    ADD CONSTRAINT code_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;


ALTER TABLE ONLY currentcode
    ADD CONSTRAINT currentcode_code_id_fkey FOREIGN KEY (code_id) REFERENCES code(id) ON DELETE CASCADE;


ALTER TABLE ONLY documenttag
    ADD CONSTRAINT documenttag_project_id_fkey FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;


ALTER TABLE ONLY memo
    ADD CONSTRAINT memo_attached_to_id_fkey FOREIGN KEY (attached_to_id) REFERENCES objecthandle(id) ON DELETE CASCADE;


ALTER TABLE ONLY memo
    ADD CONSTRAINT memo_project_id_fkey FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;


ALTER TABLE ONLY memo
    ADD CONSTRAINT memo_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;


ALTER TABLE ONLY objecthandle
    ADD CONSTRAINT objecthandle_action_id_fkey FOREIGN KEY (action_id) REFERENCES action(id) ON DELETE CASCADE;


ALTER TABLE ONLY objecthandle
    ADD CONSTRAINT objecthandle_annotation_document_id_fkey FOREIGN KEY (annotation_document_id) REFERENCES annotationdocument(id) ON DELETE CASCADE;


ALTER TABLE ONLY objecthandle
    ADD CONSTRAINT objecthandle_bbox_annotation_id_fkey FOREIGN KEY (bbox_annotation_id) REFERENCES bboxannotation(id) ON DELETE CASCADE;


ALTER TABLE ONLY objecthandle
    ADD CONSTRAINT objecthandle_code_id_fkey FOREIGN KEY (code_id) REFERENCES code(id) ON DELETE CASCADE;


ALTER TABLE ONLY objecthandle
    ADD CONSTRAINT objecthandle_current_code_id_fkey FOREIGN KEY (current_code_id) REFERENCES currentcode(id) ON DELETE CASCADE;


ALTER TABLE ONLY objecthandle
    ADD CONSTRAINT objecthandle_document_tag_id_fkey FOREIGN KEY (document_tag_id) REFERENCES documenttag(id) ON DELETE CASCADE;


ALTER TABLE ONLY objecthandle
    ADD CONSTRAINT objecthandle_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES memo(id) ON DELETE CASCADE;


ALTER TABLE ONLY objecthandle
    ADD CONSTRAINT objecthandle_project_id_fkey FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;


ALTER TABLE ONLY objecthandle
    ADD CONSTRAINT objecthandle_source_document_id_fkey FOREIGN KEY (source_document_id) REFERENCES sourcedocument(id) ON DELETE CASCADE;


ALTER TABLE ONLY objecthandle
    ADD CONSTRAINT objecthandle_source_document_metadata_id_fkey FOREIGN KEY (source_document_metadata_id) REFERENCES sourcedocumentmetadata(id) ON DELETE CASCADE;


ALTER TABLE ONLY objecthandle
    ADD CONSTRAINT objecthandle_span_annotation_id_fkey FOREIGN KEY (span_annotation_id) REFERENCES spanannotation(id) ON DELETE CASCADE;


ALTER TABLE ONLY objecthandle
    ADD CONSTRAINT objecthandle_span_group_id_fkey FOREIGN KEY (span_group_id) REFERENCES spangroup(id) ON DELETE CASCADE;


ALTER TABLE ONLY objecthandle
    ADD CONSTRAINT objecthandle_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;


ALTER TABLE ONLY preprocessingjob
    ADD CONSTRAINT preprocessingjob_project_id_fkey FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;


ALTER TABLE ONLY preprocessingjobpayload
    ADD CONSTRAINT preprocessingjobpayload_prepro_job_id_fkey FOREIGN KEY (prepro_job_id) REFERENCES preprocessingjob(id) ON DELETE CASCADE;


ALTER TABLE ONLY preprocessingjobpayload
    ADD CONSTRAINT preprocessingjobpayload_project_id_fkey FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;


ALTER TABLE ONLY preprocessingjobpayload
    ADD CONSTRAINT preprocessingjobpayload_source_document_id_fkey FOREIGN KEY (source_document_id) REFERENCES sourcedocument(id) ON DELETE CASCADE;


ALTER TABLE ONLY projectuserlinktable
    ADD CONSTRAINT projectuserlinktable_project_id_fkey FOREIGN KEY (project_id) REFERENCES project(id);


ALTER TABLE ONLY projectuserlinktable
    ADD CONSTRAINT projectuserlinktable_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id);


ALTER TABLE ONLY sourcedocument
    ADD CONSTRAINT sourcedocument_project_id_fkey FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;


ALTER TABLE ONLY sourcedocumentdocumenttaglinktable
    ADD CONSTRAINT sourcedocumentdocumenttaglinktable_document_tag_id_fkey FOREIGN KEY (document_tag_id) REFERENCES documenttag(id) ON DELETE CASCADE;


ALTER TABLE ONLY sourcedocumentdocumenttaglinktable
    ADD CONSTRAINT sourcedocumentdocumenttaglinktable_source_document_id_fkey FOREIGN KEY (source_document_id) REFERENCES sourcedocument(id) ON DELETE CASCADE;


ALTER TABLE ONLY sourcedocumentlink
    ADD CONSTRAINT sourcedocumentlink_linked_source_document_id_fkey FOREIGN KEY (linked_source_document_id) REFERENCES sourcedocument(id) ON DELETE CASCADE;


ALTER TABLE ONLY sourcedocumentlink
    ADD CONSTRAINT sourcedocumentlink_parent_source_document_id_fkey FOREIGN KEY (parent_source_document_id) REFERENCES sourcedocument(id) ON DELETE CASCADE;


ALTER TABLE ONLY sourcedocumentmetadata
    ADD CONSTRAINT sourcedocumentmetadata_source_document_id_fkey FOREIGN KEY (source_document_id) REFERENCES sourcedocument(id) ON DELETE CASCADE;


ALTER TABLE ONLY spanannotation
    ADD CONSTRAINT spanannotation_annotation_document_id_fkey FOREIGN KEY (annotation_document_id) REFERENCES annotationdocument(id) ON DELETE CASCADE;


ALTER TABLE ONLY spanannotation
    ADD CONSTRAINT spanannotation_current_code_id_fkey FOREIGN KEY (current_code_id) REFERENCES currentcode(id) ON DELETE CASCADE;


ALTER TABLE ONLY spanannotation
    ADD CONSTRAINT spanannotation_span_text_id_fkey FOREIGN KEY (span_text_id) REFERENCES spantext(id) ON DELETE CASCADE;


ALTER TABLE ONLY spanannotationspangrouplinktable
    ADD CONSTRAINT spanannotationspangrouplinktable_span_annotation_id_fkey FOREIGN KEY (span_annotation_id) REFERENCES spanannotation(id) ON DELETE CASCADE;


ALTER TABLE ONLY spanannotationspangrouplinktable
    ADD CONSTRAINT spanannotationspangrouplinktable_span_group_id_fkey FOREIGN KEY (span_group_id) REFERENCES spangroup(id) ON DELETE CASCADE;


ALTER TABLE ONLY spangroup
    ADD CONSTRAINT spangroup_annotation_document_id_fkey FOREIGN KEY (annotation_document_id) REFERENCES annotationdocument(id) ON DELETE CASCADE;


ALTER TABLE ONLY whiteboard
    ADD CONSTRAINT whiteboard_project_id_fkey FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;


ALTER TABLE ONLY whiteboard
    ADD CONSTRAINT whiteboard_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--
"""
    )


def downgrade() -> None:
    # We should never need to undo this migration
    # if we do, it would be easier to drop the database completely
    # and start from scratch
    pass
