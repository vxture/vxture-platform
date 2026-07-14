/*
 Vxture DB Design — support schema
 反向工程自 vxture_beta（2026-05-03）

 Source Server         : mylocalhost-pg-develop
 Source Server Type    : PostgreSQL
 Source Server Version : 180003 (180003)
 Source Host           : localhost:5432
 Source Catalog        : vxture_beta
 Source Schema         : support

 Target Server Type    : PostgreSQL
 Target Server Version : 180003 (180003)
 File Encoding         : 65001

 Date: 03/05/2026 (reverse-engineered)
*/


-- ----------------------------
-- Table structure for ticket
-- ----------------------------
DROP TABLE IF EXISTS "support"."ticket";
CREATE TABLE "support"."ticket" (
  "id" uuid NOT NULL,
  "ticket_no" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "tenant_id" uuid NOT NULL,
  "title" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "status" varchar(32) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'open'::character varying,
  "priority" varchar(16) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'p2'::character varying,
  "category" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'general'::character varying,
  "source" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'admin'::character varying,
  "reporter_name" varchar(100) COLLATE "pg_catalog"."default",
  "assignee_name" varchar(100) COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  "due_at" timestamptz(6),
  "resolved_at" timestamptz(6),
  "closed_at" timestamptz(6),
  "deleted_at" timestamptz(6)
)
;
COMMENT ON COLUMN "support"."ticket"."status" IS 'open=待处理 | processing=处理中 | blocked=阻塞 | closed=已关闭';
COMMENT ON COLUMN "support"."ticket"."priority" IS 'p0=紧急 | p1=高 | p2=中（默认） | p3=低';
COMMENT ON COLUMN "support"."ticket"."category" IS '工单分类，如 general / billing / technical / account';
COMMENT ON COLUMN "support"."ticket"."source" IS '工单来源：admin=运营后台创建 | tenant=租户自提 | api=接口提交';
COMMENT ON COLUMN "support"."ticket"."reporter_name" IS '提单人显示名，冗余存储，避免 JOIN account';
COMMENT ON COLUMN "support"."ticket"."assignee_name" IS '处理人显示名，冗余存储，避免 JOIN platform_admin';

-- ----------------------------
-- Table structure for ticket_event
-- ----------------------------
DROP TABLE IF EXISTS "support"."ticket_event";
CREATE TABLE "support"."ticket_event" (
  "id" uuid NOT NULL,
  "ticket_id" uuid NOT NULL,
  "event_type" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "actor_id" uuid,
  "actor_name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz(6) NOT NULL DEFAULT now()
)
;
COMMENT ON COLUMN "support"."ticket_event"."event_type" IS '事件类型：created | commented | status_changed | assigned | priority_changed | closed';
COMMENT ON COLUMN "support"."ticket_event"."actor_id" IS '操作人 ID，NULL 表示系统自动触发';
COMMENT ON COLUMN "support"."ticket_event"."actor_name" IS '操作人显示名，冗余存储';
COMMENT ON COLUMN "support"."ticket_event"."payload" IS '事件附加数据，结构依 event_type 而定（如 status_changed 含 from/to 字段）';
COMMENT ON TABLE "support"."ticket_event" IS '工单事件流水，只追加不修改';

-- ----------------------------
-- Indexes structure for table ticket
-- ----------------------------
CREATE INDEX "idx_support_ticket_deleted_at" ON "support"."ticket" USING btree (
  "deleted_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);
CREATE INDEX "idx_support_ticket_priority_updated" ON "support"."ticket" USING btree (
  "priority" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "updated_at" "pg_catalog"."timestamptz_ops" DESC NULLS FIRST
);
CREATE INDEX "idx_support_ticket_tenant_status" ON "support"."ticket" USING btree (
  "tenant_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Uniques structure for table ticket
-- ----------------------------
ALTER TABLE "support"."ticket" ADD CONSTRAINT "uq_support_ticket_no" UNIQUE ("ticket_no");

-- ----------------------------
-- Checks structure for table ticket
-- ----------------------------
ALTER TABLE "support"."ticket" ADD CONSTRAINT "chk_support_ticket_status" CHECK (
  status::text = ANY (ARRAY['open'::character varying, 'processing'::character varying, 'blocked'::character varying, 'closed'::character varying]::text[])
);
ALTER TABLE "support"."ticket" ADD CONSTRAINT "chk_support_ticket_priority" CHECK (
  priority::text = ANY (ARRAY['p0'::character varying, 'p1'::character varying, 'p2'::character varying, 'p3'::character varying]::text[])
);

-- ----------------------------
-- Primary Key structure for table ticket
-- ----------------------------
ALTER TABLE "support"."ticket" ADD CONSTRAINT "ticket_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table ticket_event
-- ----------------------------
CREATE INDEX "idx_support_ticket_event_ticket_created" ON "support"."ticket_event" USING btree (
  "ticket_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "created_at" "pg_catalog"."timestamptz_ops" DESC NULLS FIRST
);

-- ----------------------------
-- Primary Key structure for table ticket_event
-- ----------------------------
ALTER TABLE "support"."ticket_event" ADD CONSTRAINT "ticket_event_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Foreign Keys structure for table ticket
-- ----------------------------
ALTER TABLE "support"."ticket" ADD CONSTRAINT "fk_support_ticket_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."tenant" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table ticket_event
-- ----------------------------
ALTER TABLE "support"."ticket_event" ADD CONSTRAINT "fk_support_ticket_event_ticket" FOREIGN KEY ("ticket_id") REFERENCES "support"."ticket" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
