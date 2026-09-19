-- One row per assistant request: what was asked, what the model planned, what
-- the tools returned, what was said, and what it cost. Enough to reproduce an
-- evaluation and to investigate a bad answer without re-running the model.
--
-- No user identity is stored. The query text is kept because an assistant run
-- cannot be understood without it; nothing else about the person is recorded.
CREATE TABLE assistant_run (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at     timestamptz NOT NULL DEFAULT now(),
    query          text NOT NULL CHECK (btrim(query) <> ''),
    planner_model  text NOT NULL,
    writer_model   text NOT NULL,
    routing        text NOT NULL CHECK (routing IN ('rules', 'model')),

    plan           jsonb NOT NULL,            -- the validated RetrievalPlan
    filters        jsonb NOT NULL DEFAULT '{}',  -- applied filters, thresholds, drops and corrections
    searches       jsonb NOT NULL DEFAULT '[]',  -- each search with its strategy and routing rule
    tool_calls     jsonb NOT NULL DEFAULT '[]',
    notes          jsonb NOT NULL DEFAULT '[]',

    retrieved_ids  text[] NOT NULL DEFAULT '{}',
    selected_ids   text[] NOT NULL DEFAULT '{}',
    cited_ids      text[] NOT NULL DEFAULT '{}',

    answer         text NOT NULL,
    refused        boolean NOT NULL,
    violations     jsonb NOT NULL DEFAULT '[]',
    plan_fallback  boolean NOT NULL DEFAULT false,
    plan_repaired  boolean NOT NULL DEFAULT false,

    input_tokens   integer NOT NULL CHECK (input_tokens >= 0),
    output_tokens  integer NOT NULL CHECK (output_tokens >= 0),
    cost_usd       numeric(10, 6) NOT NULL CHECK (cost_usd >= 0),
    planning_ms    numeric(10, 2) NOT NULL CHECK (planning_ms >= 0),
    retrieval_ms   numeric(10, 2) NOT NULL CHECK (retrieval_ms >= 0),
    generation_ms  numeric(10, 2) NOT NULL CHECK (generation_ms >= 0),
    total_ms       numeric(10, 2) NOT NULL CHECK (total_ms >= 0),

    -- A cited product must have been retrieved: grounding is a database
    -- constraint, not only an application check.
    CHECK (cited_ids <@ retrieved_ids),
    CHECK (selected_ids <@ retrieved_ids),
    -- An answer that was refused must say why.
    CHECK (refused = (jsonb_array_length(violations) > 0))
);

CREATE INDEX assistant_run_by_time ON assistant_run (created_at DESC);
CREATE INDEX assistant_run_refused ON assistant_run (refused) WHERE refused;
