const currentCopyCodePrefix = "LEN";
const copyCodePrefixPattern = new RegExp(`^${currentCopyCodePrefix}-`, "i");

export function createCopyCode(
  categoryCode: string | null | undefined,
  categorySeq: number | null | undefined,
  copyNumber: number,
) {
  return `${currentCopyCodePrefix}-${categoryCode ?? ""}${categorySeq ?? ""}-${copyNumber}`;
}

export function normalizeCopyCode(value: string) {
  return value.trim().replace(copyCodePrefixPattern, "").toUpperCase();
}

export function getDisplayCopyCode(value: string) {
  return normalizeCopyCode(value);
}
