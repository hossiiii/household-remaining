-- Remove existing prepaid cards before modifying enum
DELETE FROM "payment_methods" WHERE "card_id" IN (SELECT "id" FROM "cards" WHERE "type" = 'PREPAID_CARD');
DELETE FROM "cards" WHERE "type" = 'PREPAID_CARD';

-- Remove PREPAID_CARD from CardType enum
ALTER TYPE "CardType" RENAME TO "CardType_old";
CREATE TYPE "CardType" AS ENUM ('CREDIT_CARD');
ALTER TABLE "cards" ALTER COLUMN "type" TYPE "CardType" USING "type"::text::"CardType";
DROP TYPE "CardType_old";