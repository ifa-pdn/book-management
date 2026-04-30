import type { dictionary } from "./translations";

type TranslationKey = keyof typeof dictionary.id;
type Translate = (key: TranslationKey) => string;

export const getBorrowerClassLabel = (
  borrowerClass: string,
  t: Translate,
) => {
  if (borrowerClass === "Kelas 1") return t("classOne");
  if (borrowerClass === "Kelas 2") return t("classTwo");
  return borrowerClass;
};
