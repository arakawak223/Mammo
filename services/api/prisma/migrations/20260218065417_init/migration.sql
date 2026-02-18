-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('elderly', 'family_owner', 'family_member');

-- CreateEnum
CREATE TYPE "pairing_role" AS ENUM ('owner', 'member');

-- CreateEnum
CREATE TYPE "event_type" AS ENUM ('scam_button', 'auto_forward', 'ai_assistant', 'realtime_alert', 'conversation_ai', 'remote_block', 'statistics', 'dark_job_check', 'emergency_sos');

-- CreateEnum
CREATE TYPE "alert_severity" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('pending', 'acknowledged', 'resolved');

-- CreateEnum
CREATE TYPE "sos_mode" AS ENUM ('alarm', 'silent');

-- CreateEnum
CREATE TYPE "sos_session_status" AS ENUM ('active', 'resolved');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "prefecture" TEXT,
    "device_token" TEXT,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pairings" (
    "id" TEXT NOT NULL,
    "elderly_id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "role" "pairing_role" NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pairings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "elderly_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "elderly_id" TEXT NOT NULL,
    "type" "event_type" NOT NULL,
    "severity" "alert_severity" NOT NULL,
    "status" "event_status" NOT NULL DEFAULT 'pending',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "scam_type" TEXT NOT NULL,
    "raw_text" TEXT,
    "model_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_numbers" (
    "id" TEXT NOT NULL,
    "elderly_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "added_by" TEXT NOT NULL,
    "reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_sessions" (
    "id" TEXT NOT NULL,
    "elderly_id" TEXT NOT NULL,
    "mode" "sos_mode" NOT NULL DEFAULT 'silent',
    "status" "sos_session_status" NOT NULL DEFAULT 'active',
    "locations" JSONB NOT NULL DEFAULT '[]',
    "audio_url" TEXT,
    "resolved_by" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "sos_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_settings" (
    "id" TEXT NOT NULL,
    "elderly_id" TEXT NOT NULL,
    "default_mode" "sos_mode" NOT NULL DEFAULT 'silent',
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sos_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scam_statistics" (
    "id" TEXT NOT NULL,
    "prefecture" TEXT NOT NULL,
    "year_month" TEXT NOT NULL,
    "scam_type" TEXT NOT NULL,
    "amount" BIGINT NOT NULL DEFAULT 0,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scam_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "pairings_elderly_id_family_id_key" ON "pairings"("elderly_id", "family_id");

-- CreateIndex
CREATE UNIQUE INDEX "invite_codes_code_key" ON "invite_codes"("code");

-- CreateIndex
CREATE INDEX "events_elderly_id_created_at_idx" ON "events"("elderly_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ai_analyses_event_id_key" ON "ai_analyses"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_numbers_elderly_id_phone_number_key" ON "blocked_numbers"("elderly_id", "phone_number");

-- CreateIndex
CREATE INDEX "sos_sessions_elderly_id_started_at_idx" ON "sos_sessions"("elderly_id", "started_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "sos_settings_elderly_id_key" ON "sos_settings"("elderly_id");

-- CreateIndex
CREATE UNIQUE INDEX "scam_statistics_prefecture_year_month_scam_type_key" ON "scam_statistics"("prefecture", "year_month", "scam_type");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "pairings" ADD CONSTRAINT "pairings_elderly_id_fkey" FOREIGN KEY ("elderly_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairings" ADD CONSTRAINT "pairings_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_elderly_id_fkey" FOREIGN KEY ("elderly_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_numbers" ADD CONSTRAINT "blocked_numbers_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_sessions" ADD CONSTRAINT "sos_sessions_elderly_id_fkey" FOREIGN KEY ("elderly_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_sessions" ADD CONSTRAINT "sos_sessions_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_settings" ADD CONSTRAINT "sos_settings_elderly_id_fkey" FOREIGN KEY ("elderly_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_settings" ADD CONSTRAINT "sos_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
