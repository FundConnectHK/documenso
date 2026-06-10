-- CreateEnum
CREATE TYPE "SigningViewMode" AS ENUM ('AUTO', 'FORCE_PDF', 'FORCE_RICH_TEXT');

-- AlterTable
ALTER TABLE "EnvelopeItem" ADD COLUMN "signingViewMode" "SigningViewMode" NOT NULL DEFAULT 'AUTO';
