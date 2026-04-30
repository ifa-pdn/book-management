type LoanLike = {
  dueAt: Date | string;
  returnedAt: Date | string | null;
  status?: string | null;
};

type CopyLike<TLoan extends LoanLike = LoanLike> = {
  loans?: TLoan[];
};

export type DerivedLoanStatus = "available" | "loaned" | "overdue";

export function isLoanReturned(loan: LoanLike) {
  return Boolean(loan.returnedAt) || loan.status === "returned";
}

export function isLoanOverdue(loan: LoanLike, now = new Date()) {
  if (isLoanReturned(loan)) return false;
  return new Date(loan.dueAt) < now;
}

export function getActiveLoan<TLoan extends LoanLike>(copy: CopyLike<TLoan>) {
  return copy.loans?.find((loan) => !isLoanReturned(loan)) ?? null;
}

export function getCopyDerivedStatus<TLoan extends LoanLike>(
  copy: CopyLike<TLoan>,
  now = new Date(),
): DerivedLoanStatus {
  const activeLoan = getActiveLoan(copy);
  if (!activeLoan) return "available";
  return isLoanOverdue(activeLoan, now) ? "overdue" : "loaned";
}

export function getAvailabilitySummary<TCopy extends CopyLike>(
  copies: TCopy[],
  now = new Date(),
) {
  let availableCopies = 0;
  let loanedCopies = 0;
  let overdueCopies = 0;

  for (const copy of copies) {
    const status = getCopyDerivedStatus(copy, now);
    if (status === "available") availableCopies += 1;
    if (status === "loaned") loanedCopies += 1;
    if (status === "overdue") overdueCopies += 1;
  }

  return {
    totalCopies: copies.length,
    availableCopies,
    loanedCopies,
    overdueCopies,
  };
}
