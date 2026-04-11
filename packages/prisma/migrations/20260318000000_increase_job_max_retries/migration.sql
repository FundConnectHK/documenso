-- AlterTable: Increase default maxRetries from 3 to 5 for BackgroundJob and BackgroundJobTask
ALTER TABLE "BackgroundJob" ALTER COLUMN "maxRetries" SET DEFAULT 5;
ALTER TABLE "BackgroundJobTask" ALTER COLUMN "maxRetries" SET DEFAULT 5;
