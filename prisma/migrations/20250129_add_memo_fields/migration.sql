-- Add memo fields to payment_methods, cards, and banks tables

-- Add memo to payment_methods
ALTER TABLE "payment_methods" ADD COLUMN "memo" TEXT;

-- Add memo to cards
ALTER TABLE "cards" ADD COLUMN "memo" TEXT;

-- Add memo to banks
ALTER TABLE "banks" ADD COLUMN "memo" TEXT;