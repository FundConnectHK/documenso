-- Revocation is independent of ordinary recipient expiry. Resending a document
-- must never clear this marker or re-enable its original signing sessions.
ALTER TABLE "Envelope" ADD COLUMN "signingRevokedAt" TIMESTAMP(3);
