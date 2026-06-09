import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email yoki telefon raqami kiritilishi shart"),
  password: z.string().min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak"),
});

export const registerSchema = z.object({
  full_name: z.string()
    .min(3, "To'liq ism kamida 3 ta belgi bo'lishi kerak")
    .max(60, "To'liq ism 60 ta belgidan oshmasligi kerak"),
  username: z.string()
    .min(3, "Foydalanuvchi nomi kamida 3 ta belgi bo'lishi kerak")
    .max(30, "Foydalanuvchi nomi 30 ta belgidan oshmasligi kerak")
    .regex(/^[a-zA-Z0-9_]+$/, "Foydalanuvchi nomi faqat lotin harflari, raqamlar va tag chiziq (_) dan iborat bo'lishi kerak"),
  age: z.coerce.number()
    .int("Yosh butun son bo'lishi kerak")
    .min(10, "Yosh 10 dan kichik bo'lmasligi kerak")
    .max(80, "Yosh 80 dan katta bo'lmasligi kerak"),
  region: z.string().min(1, "Viloyatni tanlang"),
  phone_number: z.string()
    .regex(/^\+998\d{9}$/, "Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak"),
  email: z.string().email("Noto'g'ri email manzili"),
  role: z.enum(["VIEWER", "GAMER", "GAMEDEV", "INVESTOR"], {
    errorMap: () => ({ message: "Noto'g'ri rol tanlandi" }),
  }),
  password: z.string()
    .min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak")
    .regex(/[A-Z]/, "Parolda kamida bitta katta harf bo'lishi kerak")
    .regex(/[0-9]/, "Parolda kamida bitta raqam bo'lishi kerak"),
  confirmPassword: z.string(),
  avatar: z.any().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Parollar mos kelmadi",
  path: ["confirmPassword"],
});

