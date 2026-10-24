BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> c038d9e806c5

CREATE TABLE sources (
    source_id VARCHAR(160) NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    publisher TEXT,
    author TEXT,
    source_type VARCHAR(24) NOT NULL,
    accessed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    publication_date DATE,
    license TEXT,
    notes TEXT,
    CONSTRAINT pk_sources PRIMARY KEY (source_id),
    CONSTRAINT uq_sources_url UNIQUE (url),
    CONSTRAINT ck_sources_sourcetype CHECK (source_type IN ('historical_documentation', 'official_specification', 'photographic_evidence', 'community', 'unverified_observation'))
);

CREATE TABLE route_groups (
    color_group_id VARCHAR(80) NOT NULL,
    group_name VARCHAR(120) NOT NULL,
    display_name TEXT NOT NULL,
    hex_color VARCHAR(7),
    display_order INTEGER,
    is_active BOOLEAN NOT NULL,
    source_id VARCHAR(160),
    CONSTRAINT pk_route_groups PRIMARY KEY (color_group_id),
    CONSTRAINT ck_route_groups_hex_color CHECK (hex_color IS NULL OR (length(hex_color) = 7 AND substr(hex_color, 1, 1) = '#')),
    CONSTRAINT fk_route_groups_source_id_sources FOREIGN KEY(source_id) REFERENCES sources (source_id),
    CONSTRAINT uq_route_groups_group_name UNIQUE (group_name)
);

CREATE TABLE train_models (
    train_model_id VARCHAR(80) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    manufacturer TEXT,
    introduction_year INTEGER,
    retirement_year INTEGER,
    service_status VARCHAR(12) NOT NULL,
    division VARCHAR(20),
    description TEXT,
    source_id VARCHAR(160),
    CONSTRAINT pk_train_models PRIMARY KEY (train_model_id),
    CONSTRAINT ck_train_models_years CHECK (retirement_year IS NULL OR introduction_year IS NULL OR retirement_year >= introduction_year),
    CONSTRAINT fk_train_models_source_id_sources FOREIGN KEY(source_id) REFERENCES sources (source_id),
    CONSTRAINT uq_train_models_model_name UNIQUE (model_name),
    CONSTRAINT ck_train_models_status CHECK (service_status IN ('active', 'discontinued', 'historical', 'unknown'))
);

CREATE TABLE routes (
    route_id VARCHAR(80) NOT NULL,
    route_name TEXT NOT NULL,
    color_group_id VARCHAR(80),
    current_service_status VARCHAR(12) NOT NULL,
    display_order INTEGER,
    description TEXT,
    source_id VARCHAR(160),
    CONSTRAINT pk_routes PRIMARY KEY (route_id),
    CONSTRAINT fk_routes_color_group_id_route_groups FOREIGN KEY(color_group_id) REFERENCES route_groups (color_group_id),
    CONSTRAINT fk_routes_source_id_sources FOREIGN KEY(source_id) REFERENCES sources (source_id),
    CONSTRAINT ck_routes_status CHECK (current_service_status IN ('active', 'discontinued', 'historical', 'unknown'))
);

CREATE TABLE route_group_history (
    history_id VARCHAR(160) NOT NULL,
    route_id VARCHAR(80) NOT NULL,
    color_group_id VARCHAR(80) NOT NULL,
    valid_from DATE,
    valid_to DATE,
    source_id VARCHAR(160) NOT NULL,
    notes TEXT,
    CONSTRAINT pk_route_group_history PRIMARY KEY (history_id),
    CONSTRAINT ck_route_group_history_dates CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
    CONSTRAINT fk_route_group_history_color_group_id_route_groups FOREIGN KEY(color_group_id) REFERENCES route_groups (color_group_id),
    CONSTRAINT fk_route_group_history_route_id_routes FOREIGN KEY(route_id) REFERENCES routes (route_id),
    CONSTRAINT fk_route_group_history_source_id_sources FOREIGN KEY(source_id) REFERENCES sources (source_id)
);

CREATE INDEX ix_route_group_history_route_id ON route_group_history (route_id);

CREATE TABLE sign_designs (
    sign_id VARCHAR(160) NOT NULL,
    identity_key VARCHAR(250) NOT NULL,
    route_id VARCHAR(80),
    sign_text VARCHAR(120) NOT NULL,
    display_name TEXT NOT NULL,
    display_order INTEGER,
    shape VARCHAR(9) NOT NULL,
    background_color VARCHAR(7),
    foreground_color VARCHAR(7),
    font_family VARCHAR(120),
    font_weight VARCHAR(80),
    font_style TEXT,
    font_variant VARCHAR(160),
    character_proportions JSON,
    border_style TEXT,
    layout VARCHAR(100),
    aspect_ratio FLOAT,
    sign_technology VARCHAR(8) NOT NULL,
    service_type VARCHAR(7) NOT NULL,
    design_family VARCHAR(160),
    historical_era VARCHAR(120),
    is_historical BOOLEAN NOT NULL,
    valid_from DATE,
    valid_to DATE,
    description TEXT,
    distinguishing_features JSON NOT NULL,
    verification_status VARCHAR(9) NOT NULL,
    dex_category_override VARCHAR(14),
    override_source_id VARCHAR(160),
    override_reason TEXT,
    manual_review BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_sign_designs PRIMARY KEY (sign_id),
    CONSTRAINT ck_sign_designs_background_color CHECK (background_color IS NULL OR (length(background_color) = 7 AND substr(background_color, 1, 1) = '#')),
    CONSTRAINT ck_sign_designs_foreground_color CHECK (foreground_color IS NULL OR (length(foreground_color) = 7 AND substr(foreground_color, 1, 1) = '#')),
    CONSTRAINT ck_sign_designs_aspect_ratio CHECK (aspect_ratio IS NULL OR aspect_ratio > 0),
    CONSTRAINT ck_sign_designs_override_evidence CHECK (dex_category_override IS NULL OR (override_source_id IS NOT NULL AND override_reason IS NOT NULL)),
    CONSTRAINT ck_sign_designs_dates CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
    CONSTRAINT fk_sign_designs_override_source_id_sources FOREIGN KEY(override_source_id) REFERENCES sources (source_id),
    CONSTRAINT fk_sign_designs_route_id_routes FOREIGN KEY(route_id) REFERENCES routes (route_id),
    CONSTRAINT uq_sign_designs_identity_key UNIQUE (identity_key),
    CONSTRAINT ck_sign_designs_shape CHECK (shape IN ('circle', 'diamond', 'rectangle', 'square', 'other', 'unknown')),
    CONSTRAINT ck_sign_designs_technology CHECK (sign_technology IN ('rollsign', 'led', 'lcd', 'hybrid', 'artwork', 'other', 'unknown')),
    CONSTRAINT ck_sign_designs_servicetype CHECK (service_type IN ('local', 'express', 'shuttle', 'special', 'unknown')),
    CONSTRAINT ck_sign_designs_verification CHECK (verification_status IN ('verified', 'candidate', 'disputed', 'unknown')),
    CONSTRAINT ck_sign_designs_dexcategory CHECK (dex_category_override IN ('active', 'not_in_service'))
);

CREATE INDEX ix_sign_designs_design_family ON sign_designs (design_family);

CREATE INDEX ix_sign_designs_route_id ON sign_designs (route_id);

CREATE INDEX ix_sign_designs_shape_technology ON sign_designs (shape, sign_technology);

CREATE INDEX ix_sign_designs_sign_text ON sign_designs (sign_text);

CREATE INDEX ix_sign_designs_verification_status ON sign_designs (verification_status);

CREATE TABLE reference_images (
    image_id VARCHAR(160) NOT NULL,
    sign_id VARCHAR(160) NOT NULL,
    file_path TEXT,
    source_url TEXT NOT NULL,
    source_id VARCHAR(160) NOT NULL,
    image_format VARCHAR(20),
    image_type VARCHAR(20) NOT NULL,
    view_angle VARCHAR(8) NOT NULL,
    photographer TEXT,
    license TEXT,
    attribution TEXT,
    verification_status VARCHAR(9) NOT NULL,
    width INTEGER,
    height INTEGER,
    checksum VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_reference_images PRIMARY KEY (image_id),
    CONSTRAINT ck_reference_images_local_asset_provenance CHECK (file_path IS NULL OR (license IS NOT NULL AND attribution IS NOT NULL AND checksum IS NOT NULL)),
    CONSTRAINT ck_reference_images_height CHECK (height IS NULL OR height > 0),
    CONSTRAINT ck_reference_images_width CHECK (width IS NULL OR width > 0),
    CONSTRAINT fk_reference_images_sign_id_sign_designs FOREIGN KEY(sign_id) REFERENCES sign_designs (sign_id),
    CONSTRAINT fk_reference_images_source_id_sources FOREIGN KEY(source_id) REFERENCES sources (source_id),
    CONSTRAINT uq_reference_images_file_path UNIQUE (file_path),
    CONSTRAINT uq_reference_images_image_id UNIQUE (image_id, sign_id),
    CONSTRAINT uq_reference_images_sign_id UNIQUE (sign_id, source_url),
    CONSTRAINT ck_reference_images_imagetype CHECK (image_type IN ('authentic_photograph', 'official_artwork', 'reconstructed_svg', 'digitally_recreated', 'other')),
    CONSTRAINT ck_reference_images_position CHECK (view_angle IN ('front', 'rear', 'side', 'interior', 'close_up', 'other', 'unknown')),
    CONSTRAINT ck_reference_images_verification CHECK (verification_status IN ('verified', 'candidate', 'disputed', 'unknown'))
);

CREATE INDEX ix_reference_images_sign_id ON reference_images (sign_id);

CREATE TABLE review_issues (
    issue_id VARCHAR(160) NOT NULL,
    sign_id VARCHAR(160) NOT NULL,
    source_id VARCHAR(160),
    field_name VARCHAR(100),
    description TEXT NOT NULL,
    resolved BOOLEAN NOT NULL,
    CONSTRAINT pk_review_issues PRIMARY KEY (issue_id),
    CONSTRAINT fk_review_issues_sign_id_sign_designs FOREIGN KEY(sign_id) REFERENCES sign_designs (sign_id),
    CONSTRAINT fk_review_issues_source_id_sources FOREIGN KEY(source_id) REFERENCES sources (source_id)
);

CREATE INDEX ix_review_issues_sign_id ON review_issues (sign_id);

CREATE TABLE sign_equipment (
    sign_id VARCHAR(160) NOT NULL,
    train_model_id VARCHAR(80) NOT NULL,
    source_id VARCHAR(160) NOT NULL,
    verification_status VARCHAR(9) NOT NULL,
    notes TEXT,
    CONSTRAINT pk_sign_equipment PRIMARY KEY (sign_id, train_model_id),
    CONSTRAINT fk_sign_equipment_sign_id_sign_designs FOREIGN KEY(sign_id) REFERENCES sign_designs (sign_id),
    CONSTRAINT fk_sign_equipment_source_id_sources FOREIGN KEY(source_id) REFERENCES sources (source_id),
    CONSTRAINT fk_sign_equipment_train_model_id_train_models FOREIGN KEY(train_model_id) REFERENCES train_models (train_model_id),
    CONSTRAINT ck_sign_equipment_verification CHECK (verification_status IN ('verified', 'candidate', 'disputed', 'unknown'))
);

CREATE TABLE sign_sources (
    sign_id VARCHAR(160) NOT NULL,
    source_id VARCHAR(160) NOT NULL,
    claim TEXT NOT NULL,
    verification_status VARCHAR(9) NOT NULL,
    CONSTRAINT pk_sign_sources PRIMARY KEY (sign_id, source_id),
    CONSTRAINT fk_sign_sources_sign_id_sign_designs FOREIGN KEY(sign_id) REFERENCES sign_designs (sign_id),
    CONSTRAINT fk_sign_sources_source_id_sources FOREIGN KEY(source_id) REFERENCES sources (source_id),
    CONSTRAINT ck_sign_sources_verification CHECK (verification_status IN ('verified', 'candidate', 'disputed', 'unknown'))
);

CREATE TABLE sign_observations (
    observation_id VARCHAR(160) NOT NULL,
    sign_id VARCHAR(160) NOT NULL,
    observed_route VARCHAR(120),
    observed_train_model VARCHAR(80),
    observed_at TIMESTAMP WITH TIME ZONE,
    sign_position VARCHAR(8) NOT NULL,
    image_id VARCHAR(160),
    notes TEXT,
    verification_status VARCHAR(9) NOT NULL,
    CONSTRAINT pk_sign_observations PRIMARY KEY (observation_id),
    CONSTRAINT fk_sign_observations_image_id_reference_images FOREIGN KEY(image_id, sign_id) REFERENCES reference_images (image_id, sign_id),
    CONSTRAINT fk_sign_observations_observed_train_model_train_models FOREIGN KEY(observed_train_model) REFERENCES train_models (train_model_id),
    CONSTRAINT fk_sign_observations_sign_id_sign_designs FOREIGN KEY(sign_id) REFERENCES sign_designs (sign_id),
    CONSTRAINT ck_sign_observations_position CHECK (sign_position IN ('front', 'rear', 'side', 'interior', 'close_up', 'other', 'unknown')),
    CONSTRAINT ck_sign_observations_verification CHECK (verification_status IN ('verified', 'candidate', 'disputed', 'unknown'))
);

CREATE INDEX ix_sign_observations_sign_id ON sign_observations (sign_id);

INSERT INTO alembic_version (version_num) VALUES ('c038d9e806c5') RETURNING alembic_version.version_num;

-- Running upgrade c038d9e806c5 -> d271b5ef901a

ALTER TABLE sign_designs ADD COLUMN feature_provenance JSON DEFAULT '{}' NOT NULL;

UPDATE alembic_version SET version_num='d271b5ef901a' WHERE alembic_version.version_num = 'c038d9e806c5';

-- Running upgrade d271b5ef901a -> f19ce201310a

CREATE TABLE specimen_sets (
    set_id VARCHAR(40) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    font_file VARCHAR(200) NOT NULL,
    display_order INTEGER NOT NULL,
    source_id VARCHAR(160) NOT NULL,
    source_url TEXT NOT NULL,
    CONSTRAINT pk_specimen_sets PRIMARY KEY (set_id),
    CONSTRAINT fk_specimen_sets_source_id_sources FOREIGN KEY(source_id) REFERENCES sources (source_id)
);

CREATE TABLE specimen_entries (
    set_id VARCHAR(40) NOT NULL,
    key VARCHAR(160) NOT NULL,
    sign_id VARCHAR(160) NOT NULL,
    codepoint VARCHAR(8) NOT NULL,
    description TEXT NOT NULL,
    service_label TEXT NOT NULL,
    filename TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    listing_status VARCHAR(20) NOT NULL,
    source_id VARCHAR(160) NOT NULL,
    CONSTRAINT pk_specimen_entries PRIMARY KEY (set_id, key),
    CONSTRAINT ck_specimen_entries_listing_status CHECK (listing_status IN ('listed', 'unassigned', 'proposed', 'blank')),
    CONSTRAINT fk_specimen_entries_set_id_specimen_sets FOREIGN KEY(set_id) REFERENCES specimen_sets (set_id),
    CONSTRAINT fk_specimen_entries_sign_id_sign_designs FOREIGN KEY(sign_id) REFERENCES sign_designs (sign_id),
    CONSTRAINT fk_specimen_entries_source_id_sources FOREIGN KEY(source_id) REFERENCES sources (source_id)
);

CREATE INDEX ix_specimen_entries_sign_id ON specimen_entries (sign_id);

UPDATE alembic_version SET version_num='f19ce201310a' WHERE alembic_version.version_num = 'd271b5ef901a';

COMMIT;

