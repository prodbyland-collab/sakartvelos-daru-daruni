export const CITIES = [
  "თბილისი",
  "ბათუმი",
  "ქუთაისი",
  "რუსთავი",
  "გორი",
  "ზუგდიდი",
  "ფოთი",
  "თელავი",
  "მცხეთა",
  "ახალციხე",
  "ოზურგეთი",
  "ამბროლაური",
  "სიღნაღი",
  "მესტია",
  "ბორჯომი",
  "მარნეული",
  "სენაკი",
  "კასპი",
] as const;

export const INTERESTS = [
  "მთები",
  "ღვინო",
  "სუფრა",
  "მოგზაურობა",
  "მუსიკა",
  "ცეკვა",
  "ფოტოგრაფია",
  "წიგნები",
  "კინო",
  "სპორტი",
  "ფეხბურთი",
  "რაგბი",
  "კულინარია",
  "ხელოვნება",
  "თეატრი",
  "ზღვა",
  "ლაშქრობა",
  "ცხოველები",
  "ენები",
  "ტექნოლოგიები",
  "იოგა",
  "კაფეები",
  "ისტორია",
  "ფოლკლორი",
] as const;

export const GENDERS = [
  { value: "female", label: "ქალი" },
  { value: "male", label: "მამაკაცი" },
  { value: "other", label: "სხვა" },
] as const;

export const SEEKING = [
  { value: "female", label: "ქალები" },
  { value: "male", label: "მამაკაცები" },
  { value: "all", label: "ყველა" },
] as const;

export function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function genderLabel(g: string | null): string {
  return GENDERS.find((x) => x.value === g)?.label ?? "";
}
