import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email, foydalanuvchi nomi yoki telefon raqamingizni kiriting"),
  password: z.string().min(1, "Parolni kiriting"),
});

export const registerBaseSchema = z.object({
  full_name: z.string()
    .min(2, "To'liq ism kamida 2 ta belgi bo'lishi kerak")
    .max(60, "To'liq ism 60 ta belgidan oshmasligi kerak"),
  username: z.string()
    .min(3, "Foydalanuvchi nomi kamida 3 ta belgi bo'lishi kerak")
    .max(30, "Foydalanuvchi nomi 30 ta belgidan oshmasligi kerak")
    .regex(/^[a-zA-Z0-9_]+$/, "Foydalanuvchi nomi faqat lotin harflari, raqamlar va tag chiziq (_) dan iborat bo'lishi kerak"),
  age: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number().int("Yosh butun son bo'lishi kerak").min(10, "Yosh kamida 10 bo'lishi kerak").max(100, "Yosh 100 dan oshmasligi kerak").optional()
  ),
  region: z.string().min(1, "Viloyatni tanlang"),
  phone_number: z.string()
    .min(9, "Telefon raqamini kiriting")
    .transform((val) => {
      let digits = val.replace(/\D/g, "");
      if (digits.startsWith("998") && digits.length === 12) return "+" + digits;
      if (digits.length === 9) return "+998" + digits;
      return val.trim();
    })
    .refine((val) => /^\+998\d{9}$/.test(val), {
      message: "Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak",
    }),
  email: z.string().email("Noto'g'ri email manzili"),
  role: z.enum(["VIEWER", "GAMER", "GAMEDEV", "INVESTOR", "STREAMER", "ADMIN"], {
    errorMap: () => ({ message: "Noto'g'ri rol tanlandi" }),
  }),
  password: z.string()
    .min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
  confirmPassword: z.string(),
  avatar: z.any().optional(),
});

export const registerSchema = registerBaseSchema.refine((data) => data.password === data.confirmPassword, {
  message: "Parollar mos kelmadi",
  path: ["confirmPassword"],
});

