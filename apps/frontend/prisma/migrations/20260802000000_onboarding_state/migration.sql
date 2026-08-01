ALTER TABLE "Organization" ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "onboardingCompletedAt" DATETIME;
