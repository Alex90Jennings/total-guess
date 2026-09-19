-- Product embeddings: derived, rebuildable, never part of the canonical product.
-- One current embedding per (product, model). It records the semantic document
-- version and text_hash it was computed from, so staleness is a comparison with
-- product.text_hash / product.document_version, and a re-run skips fresh rows.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE product_embedding (
    barcode          char(14) NOT NULL REFERENCES product (barcode) ON DELETE CASCADE,
    model            text NOT NULL CHECK (btrim(model) <> ''),
    dimensions       integer NOT NULL CHECK (dimensions > 0),
    document_version integer NOT NULL CHECK (document_version > 0),
    text_hash        char(64) NOT NULL CHECK (text_hash ~ '^[0-9a-f]{64}$'),
    -- No fixed dimension, so several models can coexist. Exact search needs none;
    -- an ANN index would be an expression index on (embedding::vector(N)) per model.
    embedding        vector NOT NULL,
    embedded_at      timestamptz NOT NULL DEFAULT now(),
    run_id           uuid REFERENCES ingestion_run (id) ON DELETE SET NULL,
    PRIMARY KEY (barcode, model),
    CHECK (vector_dims(embedding) = dimensions)
);
CREATE INDEX product_embedding_by_model ON product_embedding (model);
