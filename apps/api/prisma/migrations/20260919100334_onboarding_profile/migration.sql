-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "onboarding_completed_at" TIMESTAMP(3),
ADD COLUMN     "water_types" TEXT[] DEFAULT ARRAY[]::TEXT[];
