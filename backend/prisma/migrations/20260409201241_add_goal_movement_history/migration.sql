-- CreateEnum
CREATE TYPE "GoalMovementType" AS ENUM ('DEPOSIT', 'WITHDRAW');

-- CreateTable
CREATE TABLE "GoalMovement" (
    "id" UUID NOT NULL,
    "goalId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "GoalMovementType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoalMovement_goalId_createdAt_idx" ON "GoalMovement"("goalId", "createdAt");

-- CreateIndex
CREATE INDEX "GoalMovement_userId_createdAt_idx" ON "GoalMovement"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "GoalMovement" ADD CONSTRAINT "GoalMovement_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalMovement" ADD CONSTRAINT "GoalMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
