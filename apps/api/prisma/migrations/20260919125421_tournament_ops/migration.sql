-- CreateTable
CREATE TABLE "tournament_ops" (
    "tournament_id" TEXT NOT NULL,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "budget" JSONB NOT NULL DEFAULT '[]',
    "partners" JSONB NOT NULL DEFAULT '[]',
    "prize_fund_minor" INTEGER,
    "notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_ops_pkey" PRIMARY KEY ("tournament_id")
);
