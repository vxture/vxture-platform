-- ═══════════════════════════════════════════════════════════════════════════
-- 20_reqlog.sql — schema reqlog（高频 AI 请求日志 + 错误明细，按月 RANGE 分区）
-- 设计权威：docs/design/data_model_200_schema.md §4.2
-- 承接从 commerce 剥离的 AI 调用明细（input/output token 拆分、model_code、latency…）。
-- 高频 append-only：每次 AI 请求一行；PARTITION BY RANGE(created_at)，分区键进复合 PK。
--   预建月分区 + DEFAULT 见 90_partitions.sql；不可变 append-only 守卫见 95_triggers.sql。
--   清理靠 DROP PARTITION（非逐行 DELETE），故无 updated_at / deleted_at（写定即定）。
-- 跨库（边界#1，跨物理库，request_id 关联，全部裸值不建 FK）：
--   request_id → commerce.metering.usage_events.request_id；usage_event_id → usage_events.id；
--   tenant_id/workspace_id/product_id/user_id/application_id/agent_id 等归属维度审计保留。
-- 失败调用（status=error/timeout）只进本库，不触发 consume、不写 usage_events（§4.2）。
-- ═══════════════════════════════════════════════════════════════════════════

-- 每次 AI 请求一行（高频）。承接被 commerce 丢弃的 AI 维度（token 拆分 / 四段下游标识哈希）。
CREATE TABLE reqlog.request_records (
    id                       uuid          NOT NULL DEFAULT gen_random_uuid(),
    request_id               varchar(128)  NOT NULL,             -- 跨库关联键→commerce.metering.usage_events.request_id（无 FK）
    tenant_id                uuid,                               -- 归属维度（跨库裸值，审计保留）
    workspace_id             uuid,
    product_id               uuid,
    user_id                  uuid,
    application_id           uuid,
    application_type         varchar(32),                        -- agent/workflow/api_client/internal_service
    agent_id                 uuid,
    feature_id               uuid,
    downstream_identity_hash varchar(128),                       -- tenant+workspace+product+user 哈希（应用层统一函数现算）
    model_code               varchar(128),                       -- 跨库逻辑引用 model.models.model_code（无 FK）
    provider_code            varchar(64),                        -- 跨库逻辑引用 model.model_providers.provider_code（无 FK）
    input_tokens             bigint,
    output_tokens            bigint,
    total_tokens             bigint,
    latency_ms               int,
    usage_type               varchar(16),                        -- normal|retry|test
    status                   varchar(32),                        -- success|error|timeout
    business_id              varchar(128),
    billed_metric_key        varchar(64),
    billed_amount            bigint,
    usage_event_id           uuid,                               -- 跨库引用 usage_events.id（无 FK，边界#1）
    created_at               timestamptz   NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at),                                -- 分区键必须进 PK
    CONSTRAINT chk_request_records_usage_type CHECK (usage_type IS NULL OR usage_type IN ('normal','retry','test')),
    CONSTRAINT chk_request_records_status     CHECK (status IS NULL OR status IN ('success','error','timeout'))
) PARTITION BY RANGE (created_at);
-- 高频写表：索引克制。request_id=跨库关联；usage_event_id=对账；tenant_id=归属审计。
CREATE INDEX idx_request_records_request_id     ON reqlog.request_records (request_id);
CREATE INDEX idx_request_records_usage_event_id ON reqlog.request_records (usage_event_id);
CREATE INDEX idx_request_records_tenant_id      ON reqlog.request_records (tenant_id);

-- 错误明细（按月分区，append-only）。status=error/timeout 的调用落此，不触发 consume/usage_events。
CREATE TABLE reqlog.error_records (
    id            uuid          NOT NULL DEFAULT gen_random_uuid(),
    request_id    varchar(128),                                  -- 跨库关联键（无 FK，边界#1）
    provider_code varchar(64),                                   -- 跨库逻辑引用 model.model_providers.provider_code（无 FK）
    model_code    varchar(128),                                  -- 跨库逻辑引用 model.models.model_code（无 FK）
    error_code    varchar(64),
    error_message text,
    created_at    timestamptz   NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)                                 -- 分区键必须进 PK
) PARTITION BY RANGE (created_at);
CREATE INDEX idx_error_records_request_id ON reqlog.error_records (request_id);
CREATE INDEX idx_error_records_error_code ON reqlog.error_records (error_code);
