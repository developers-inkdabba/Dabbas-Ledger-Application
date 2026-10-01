import { ExpenseForm } from "../types";
import { parseDateKey } from "./dates";

const allowedReceiptTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const maxReceiptBytes = 10 * 1024 * 1024;

export const validateExpense = (form: ExpenseForm): Record<string, string> => {
  const errors: Record<string, string> = {};
  const amount = Number(form.amount);
  if (!amount || amount <= 0) errors.amount = "Enter a valid amount";
  if (amount > 10_000_000) errors.amount = "Amount exceeds maximum limit";
  if (!parseDateKey(form.date)) {
    errors.date = "Use a valid YYYY-MM-DD date";
  }
  if (!form.projectName.trim()) errors.projectName = "Project name is required";
  if (form.projectName.trim().length > 100) errors.projectName = "Max 100 characters";
  if (!form.clientName.trim()) errors.clientName = "Client name is required";
  if (form.clientName.trim().length > 100) errors.clientName = "Max 100 characters";
  if (!form.description.trim() || form.description.trim().length < 3) errors.description = "Add a short description (3+ chars)";
  if (form.description.trim().length > 500) errors.description = "Max 500 characters";
  return errors;
};

export const validateEmail = (email: string): string => {
  if (!email.trim()) return "Email is required";
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Enter a valid email";
  return "";
};

export const validatePassword = (password: string): string => {
  if (!password) return "PIN is required";
  if (!/^\d{6}$/.test(password)) return "Enter your 6-digit PIN";
  return "";
};

export const validateSignupPassword = (password: string): string => {
  if (!password) return "PIN is required";
  if (!/^\d{6}$/.test(password)) return "Choose a 6-digit PIN";
  return "";
};

export const validateReceipt = (file?: { mimeType?: string; size?: number }): string => {
  if (!file) return "";
  if (!file.mimeType || !allowedReceiptTypes.includes(file.mimeType)) {
    return "Upload a JPG, PNG, WebP, or PDF receipt";
  }
  if (file.size && file.size > maxReceiptBytes) {
    return "Receipt must be 10 MB or smaller";
  }
  return "";
};

/** Sanitize user input to prevent injection */
export const sanitizeText = (value: string, maxLength = 500): string =>
  value.replace(/[<>]/g, "").trim().slice(0, maxLength);
