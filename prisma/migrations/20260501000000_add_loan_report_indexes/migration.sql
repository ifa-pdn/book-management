-- CreateIndex
CREATE INDEX "Loan_borrowedAt_idx" ON "Loan"("borrowedAt");

-- CreateIndex
CREATE INDEX "Loan_status_borrowedAt_idx" ON "Loan"("status", "borrowedAt");
