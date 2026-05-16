import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().email("Noto'g'ri email manzili"),
  password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username kamida 3 ta belgi bo'lishi kerak"),
  nickname: z.string().min(3, "Nickname kamida 3 ta belgi bo'lishi kerak"),
  email: z.string().email("Noto'g'ri email manzili"),
  password: z.string().min(8, "Parol juda qisqa"),
  confirmPassword: z.string(),
}).refine((data: any) => data.password === data.confirmPassword, {
  message: "Parollar mos kelmadi",
  path: ["confirmPassword"],
});
