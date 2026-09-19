-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('STREET', 'AREA_TROUT', 'FEEDER', 'FLOAT', 'SHORE_JIG', 'BOAT', 'ICE');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMS', 'PRIVACY', 'MARKETING', 'GEO_PUBLISH');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'PARTICIPANT', 'CLUB_CAPTAIN', 'CHANNEL_OWNER', 'MODERATOR', 'JUDGE', 'HEAD_JUDGE', 'ORGANIZER', 'SUPPORT', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "RoleScopeType" AS ENUM ('GLOBAL', 'TOURNAMENT', 'CLUB', 'CHANNEL');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'UPLOADED', 'PROCESSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'FRIENDS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "GearCatalogType" AS ENUM ('ROD', 'REEL', 'LINE', 'LEADER', 'LURE', 'BOAT', 'MOTOR');

-- CreateEnum
CREATE TYPE "LocationPrivacy" AS ENUM ('EXACT', 'WATERBODY_ONLY', 'HIDDEN');

-- CreateEnum
CREATE TYPE "TrophyStatus" AS ENUM ('PENDING_MODERATION', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "TournamentLevel" AS ENUM ('SPRINT', 'QUALIFIER', 'OPEN', 'MAJOR', 'GRAND_FINAL');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'INTERNAL_REVIEW', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'LIVE', 'JUDGING', 'FINALIZED', 'ARCHIVED', 'POSTPONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScoringMode" AS ENUM ('LENGTH_SUM', 'TOTAL_WEIGHT', 'DUEL_POINTS', 'PLACE_SUM', 'BIGGEST_FISH');

-- CreateEnum
CREATE TYPE "ParticipationFormat" AS ENUM ('SOLO', 'PAIR', 'TEAM', 'CREW');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('DRAFT', 'WAITING_MEMBERS', 'WAITING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'FINISHED', 'WAITLISTED', 'PAYMENT_FAILED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'PARTNER', 'TEAM_MEMBER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('DRAFT', 'UPLOADING', 'SUBMITTED', 'AUTO_CHECKED', 'PENDING_JUDGE', 'ACCEPTED', 'NEEDS_RESUBMISSION', 'REJECTED', 'UNDER_PROTEST', 'CORRECTED');

-- CreateEnum
CREATE TYPE "JudgeDecisionKind" AS ENUM ('ACCEPT', 'REJECT', 'REQUEST_RESUBMISSION');

-- CreateEnum
CREATE TYPE "ProtestStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'UPHELD', 'DISMISSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "LedgerEventType" AS ENUM ('TOURNAMENT_RESULT', 'PROTEST_CORRECTION', 'MANUAL_ADJUSTMENT', 'BONUS', 'PENALTY', 'REVERSAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar_file_id" TEXT,
    "city_id" TEXT,
    "experience_years" INTEGER,
    "bio" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_disciplines" (
    "user_id" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "priority" INTEGER NOT NULL,

    CONSTRAINT "user_disciplines_pkey" PRIMARY KEY ("user_id","discipline")
);

-- CreateTable
CREATE TABLE "user_target_species" (
    "user_id" TEXT NOT NULL,
    "species_id" TEXT NOT NULL,

    CONSTRAINT "user_target_species_pkey" PRIMARY KEY ("user_id","species_id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "scope_type" "RoleScopeType" NOT NULL DEFAULT 'GLOBAL',
    "scope_id" TEXT,
    "granted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "push_token" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "device_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fish_species" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_lat" TEXT,
    "is_predator" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "fish_species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waterbodies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "region" TEXT,
    "center" geography(Point,4326),

    CONSTRAINT "waterbodies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT,
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "status" "FileStatus" NOT NULL DEFAULT 'PENDING',
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gear_catalog_brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "gear_catalog_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gear_catalog_models" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "type" "GearCatalogType" NOT NULL,
    "name" TEXT NOT NULL,
    "specs" JSONB,

    CONSTRAINT "gear_catalog_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gear_custom_requests" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "type" "GearCatalogType" NOT NULL,
    "brand_text" TEXT NOT NULL,
    "model_text" TEXT NOT NULL,
    "resolved_model_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gear_custom_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gear_kits" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "target_species_ids" TEXT[],
    "purpose" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "photo_file_id" TEXT,
    "comment" TEXT,
    "rod" JSONB,
    "reel" JSONB,
    "main_line" JSONB,
    "leader" JSONB,
    "lures" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gear_kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boats" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "brand_id" TEXT,
    "model_id" TEXT,
    "custom_name" TEXT,
    "length_cm" INTEGER,
    "material" TEXT,
    "seats" INTEGER,
    "capacity_kg" INTEGER,
    "equipment" JSONB,
    "available_for_team_trips" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boat_documents" (
    "id" TEXT NOT NULL,
    "boat_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value_enc" TEXT NOT NULL,
    "file_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boat_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catches" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "species_id" TEXT NOT NULL,
    "length_mm" INTEGER,
    "weight_g" INTEGER,
    "description" TEXT,
    "caught_at" TIMESTAMP(3) NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catch_media" (
    "catch_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "catch_media_pkey" PRIMARY KEY ("catch_id","file_id")
);

-- CreateTable
CREATE TABLE "catch_gear_links" (
    "catch_id" TEXT NOT NULL,
    "gear_kit_id" TEXT,
    "lure_ref" JSONB,
    "free_text" TEXT,

    CONSTRAINT "catch_gear_links_pkey" PRIMARY KEY ("catch_id")
);

-- CreateTable
CREATE TABLE "catch_locations" (
    "catch_id" TEXT NOT NULL,
    "point" geography(Point,4326),
    "waterbody_id" TEXT,
    "privacy" "LocationPrivacy" NOT NULL DEFAULT 'HIDDEN',

    CONSTRAINT "catch_locations_pkey" PRIMARY KEY ("catch_id")
);

-- CreateTable
CREATE TABLE "trophies" (
    "catch_id" TEXT NOT NULL,
    "status" "TrophyStatus" NOT NULL DEFAULT 'PENDING_MODERATION',
    "is_personal_record" BOOLEAN NOT NULL DEFAULT false,
    "record_type" TEXT,
    "promoted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trophies_pkey" PRIMARY KEY ("catch_id")
);

-- CreateTable
CREATE TABLE "catch_tournament_links" (
    "catch_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "result_id" TEXT,

    CONSTRAINT "catch_tournament_links_pkey" PRIMARY KEY ("catch_id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discipline" "Discipline" NOT NULL,
    "level" "TournamentLevel" NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "scoring_mode" "ScoringMode" NOT NULL,
    "formats" "ParticipationFormat"[],
    "capacity" INTEGER NOT NULL,
    "coefficient" DECIMAL(4,2) NOT NULL,
    "entry_fee_minor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "reserve_date" TIMESTAMP(3),
    "registration_opens_at" TIMESTAMP(3),
    "registration_closes_at" TIMESTAMP(3),
    "protest_deadline_minutes" INTEGER NOT NULL DEFAULT 30,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_locations" (
    "tournament_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "meeting_point" TEXT,
    "parking" TEXT,
    "waterbody_id" TEXT,
    "point" geography(Point,4326),
    "zone" geography(Geometry,4326),

    CONSTRAINT "tournament_locations_pkey" PRIMARY KEY ("tournament_id")
);

-- CreateTable
CREATE TABLE "tournament_rules" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "allowed_tackle" TEXT[],
    "forbidden_tackle" TEXT[],
    "scoring_summary" TEXT NOT NULL,
    "fixation_summary" TEXT NOT NULL,
    "penalties" TEXT[],
    "scoring_params" JSONB NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_documents" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "file_id" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "tournament_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_schedule" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tournament_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "format" "ParticipationFormat" NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'DRAFT',
    "amount_minor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "start_number" TEXT,
    "gear_kit_id" TEXT,
    "boat_id" TEXT,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_members" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "user_id" TEXT,
    "invited_phone" TEXT,
    "role" "MemberRole" NOT NULL,
    "invitation_status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "registration_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_id" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "idempotency_key" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "raw_webhook" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissions" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "checked_by" TEXT,
    "note" TEXT,
    "checked_at" TIMESTAMP(3),

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_markers" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_markers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "species_id" TEXT NOT NULL,
    "length_mm" INTEGER,
    "weight_g" INTEGER,
    "marker_code" TEXT NOT NULL,
    "status" "ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "captured_at" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "result_media" (
    "id" TEXT NOT NULL,
    "result_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "metadata" JSONB,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "result_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "judge_decisions" (
    "id" TEXT NOT NULL,
    "result_id" TEXT NOT NULL,
    "judge_id" TEXT NOT NULL,
    "decision" "JudgeDecisionKind" NOT NULL,
    "length_mm" INTEGER,
    "weight_g" INTEGER,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "judge_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "result_corrections" (
    "id" TEXT NOT NULL,
    "result_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "result_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protests" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "ProtestStatus" NOT NULL DEFAULT 'OPEN',
    "deadline_at" TIMESTAMP(3) NOT NULL,
    "resolved_by" TEXT,
    "resolution" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_snapshots" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranking_rules" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "discipline" "Discipline",
    "version" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "active_from" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ranking_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranking_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "tournament_id" TEXT,
    "type" "LedgerEventType" NOT NULL,
    "delta" DECIMAL(10,2) NOT NULL,
    "rules_version" TEXT NOT NULL,
    "breakdown" JSONB,
    "reason" TEXT,
    "author_id" TEXT,
    "reverses_ledger_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranking_entries" (
    "user_id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "points" DECIMAL(10,2) NOT NULL,
    "rank" INTEGER NOT NULL,
    "starts" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ranking_entries_pkey" PRIMARY KEY ("user_id","season_id","discipline")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "consents_user_id_type_idx" ON "consents"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_scope_type_scope_id_key" ON "user_roles"("user_id", "role", "scope_type", "scope_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "otp_challenges_phone_created_at_idx" ON "otp_challenges"("phone", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "fish_species_slug_key" ON "fish_species"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "files_object_key_key" ON "files"("object_key");

-- CreateIndex
CREATE UNIQUE INDEX "gear_catalog_brands_name_key" ON "gear_catalog_brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "gear_catalog_models_brand_id_type_name_key" ON "gear_catalog_models"("brand_id", "type", "name");

-- CreateIndex
CREATE INDEX "gear_kits_owner_id_idx" ON "gear_kits"("owner_id");

-- CreateIndex
CREATE INDEX "catches_owner_id_caught_at_idx" ON "catches"("owner_id", "caught_at");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_year_key" ON "seasons"("year");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_slug_key" ON "tournaments"("slug");

-- CreateIndex
CREATE INDEX "tournaments_season_id_starts_at_idx" ON "tournaments"("season_id", "starts_at");

-- CreateIndex
CREATE INDEX "tournaments_status_idx" ON "tournaments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_rules_tournament_id_version_key" ON "tournament_rules"("tournament_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_idempotency_key_key" ON "registrations"("idempotency_key");

-- CreateIndex
CREATE INDEX "registrations_tournament_id_status_idx" ON "registrations"("tournament_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_tournament_id_owner_id_key" ON "registrations"("tournament_id", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_tournament_id_user_id_key" ON "waitlist_entries"("tournament_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "competition_markers_tournament_id_code_key" ON "competition_markers"("tournament_id", "code");

-- CreateIndex
CREATE INDEX "results_tournament_id_status_idx" ON "results"("tournament_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "results_tournament_id_participant_id_client_id_key" ON "results"("tournament_id", "participant_id", "client_id");

-- CreateIndex
CREATE INDEX "judge_decisions_result_id_created_at_idx" ON "judge_decisions"("result_id", "created_at");

-- CreateIndex
CREATE INDEX "protests_tournament_id_status_idx" ON "protests"("tournament_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_snapshots_tournament_id_version_key" ON "leaderboard_snapshots"("tournament_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ranking_rules_season_id_discipline_version_key" ON "ranking_rules"("season_id", "discipline", "version");

-- CreateIndex
CREATE INDEX "ranking_ledger_season_id_discipline_user_id_idx" ON "ranking_ledger"("season_id", "discipline", "user_id");

-- CreateIndex
CREATE INDEX "ranking_entries_season_id_discipline_rank_idx" ON "ranking_entries"("season_id", "discipline", "rank");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_avatar_file_id_fkey" FOREIGN KEY ("avatar_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_disciplines" ADD CONSTRAINT "user_disciplines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_target_species" ADD CONSTRAINT "user_target_species_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_target_species" ADD CONSTRAINT "user_target_species_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "fish_species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear_catalog_models" ADD CONSTRAINT "gear_catalog_models_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "gear_catalog_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear_kits" ADD CONSTRAINT "gear_kits_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear_kits" ADD CONSTRAINT "gear_kits_photo_file_id_fkey" FOREIGN KEY ("photo_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boats" ADD CONSTRAINT "boats_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boat_documents" ADD CONSTRAINT "boat_documents_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "boats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catches" ADD CONSTRAINT "catches_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catches" ADD CONSTRAINT "catches_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "fish_species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_media" ADD CONSTRAINT "catch_media_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "catches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_media" ADD CONSTRAINT "catch_media_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_gear_links" ADD CONSTRAINT "catch_gear_links_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "catches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_gear_links" ADD CONSTRAINT "catch_gear_links_gear_kit_id_fkey" FOREIGN KEY ("gear_kit_id") REFERENCES "gear_kits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_locations" ADD CONSTRAINT "catch_locations_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "catches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_locations" ADD CONSTRAINT "catch_locations_waterbody_id_fkey" FOREIGN KEY ("waterbody_id") REFERENCES "waterbodies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trophies" ADD CONSTRAINT "trophies_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "catches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_tournament_links" ADD CONSTRAINT "catch_tournament_links_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "catches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_tournament_links" ADD CONSTRAINT "catch_tournament_links_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_locations" ADD CONSTRAINT "tournament_locations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_locations" ADD CONSTRAINT "tournament_locations_waterbody_id_fkey" FOREIGN KEY ("waterbody_id") REFERENCES "waterbodies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_rules" ADD CONSTRAINT "tournament_rules_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_documents" ADD CONSTRAINT "tournament_documents_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_documents" ADD CONSTRAINT "tournament_documents_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_schedule" ADD CONSTRAINT "tournament_schedule_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_gear_kit_id_fkey" FOREIGN KEY ("gear_kit_id") REFERENCES "gear_kits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "boats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_members" ADD CONSTRAINT "registration_members_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_members" ADD CONSTRAINT "registration_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_markers" ADD CONSTRAINT "competition_markers_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "fish_species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_media" ADD CONSTRAINT "result_media_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_media" ADD CONSTRAINT "result_media_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judge_decisions" ADD CONSTRAINT "judge_decisions_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judge_decisions" ADD CONSTRAINT "judge_decisions_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_corrections" ADD CONSTRAINT "result_corrections_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protests" ADD CONSTRAINT "protests_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protests" ADD CONSTRAINT "protests_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_rules" ADD CONSTRAINT "ranking_rules_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_ledger" ADD CONSTRAINT "ranking_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_ledger" ADD CONSTRAINT "ranking_ledger_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_ledger" ADD CONSTRAINT "ranking_ledger_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_entries" ADD CONSTRAINT "ranking_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_entries" ADD CONSTRAINT "ranking_entries_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
