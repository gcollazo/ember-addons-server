/*
 Navicat Premium Data Transfer

 Source Server         : Postgres.app
 Source Server Type    : PostgreSQL
 Source Server Version : 90304
 Source Host           : localhost
 Source Database       : emaddons
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 90304
 File Encoding         : utf-8

 Date: 09/27/2014 19:36:22 PM
*/

-- ----------------------------
--  Sequence structure for addons_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."addons_id_seq";
CREATE SEQUENCE "public"."addons_id_seq" INCREMENT 1 START 1854 MAXVALUE 9223372036854775807 MINVALUE 1 CACHE 1;
ALTER TABLE "public"."addons_id_seq" OWNER TO "emberaddonsuser";

-- ----------------------------
--  Sequence structure for stats_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."stats_id_seq";
CREATE SEQUENCE "public"."stats_id_seq" INCREMENT 1 START 2 MAXVALUE 9223372036854775807 MINVALUE 1 CACHE 1;
ALTER TABLE "public"."stats_id_seq" OWNER TO "emberaddonsuser";

-- ----------------------------
--  Table structure for addons
-- ----------------------------
DROP TABLE IF EXISTS "public"."addons";
CREATE TABLE "public"."addons" (
	"id" int4 NOT NULL DEFAULT nextval('addons_id_seq'::regclass),
	"name" varchar COLLATE "default",
	"doc" json
)
WITH (OIDS=FALSE);
ALTER TABLE "public"."addons" OWNER TO "emberaddonsuser";

-- ----------------------------
--  Table structure for metrics
-- ----------------------------
DROP TABLE IF EXISTS "public"."metrics";
CREATE TABLE "public"."metrics" (
	"id" int4 NOT NULL DEFAULT nextval('stats_id_seq'::regclass),
	"created" timestamp(6) NOT NULL DEFAULT now(),
	"metric" varchar NOT NULL COLLATE "default",
	"value" numeric NOT NULL
)
WITH (OIDS=FALSE);
ALTER TABLE "public"."metrics" OWNER TO "emberaddonsuser";


-- ----------------------------
--  Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."addons_id_seq" RESTART 1855 OWNED BY "addons"."id";
ALTER SEQUENCE "public"."stats_id_seq" RESTART 3 OWNED BY "metrics"."id";
-- ----------------------------
--  Primary key structure for table addons
-- ----------------------------
ALTER TABLE "public"."addons" ADD PRIMARY KEY ("id") NOT DEFERRABLE INITIALLY IMMEDIATE;

