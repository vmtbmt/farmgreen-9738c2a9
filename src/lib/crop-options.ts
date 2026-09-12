export const COMMON_CROPS = [
  "Cà phê",
  "Sầu riêng",
  "Hồ tiêu",
  "Bơ",
  "Điều",
  "Cao su",
  "Chanh dây",
  "Xoài",
  "Mít",
  "Rau màu",
] as const;

export const OTHER_CROP_VALUE = "__other__";

export function isCommonCrop(crop: string) {
  return COMMON_CROPS.some((item) => item === crop);
}