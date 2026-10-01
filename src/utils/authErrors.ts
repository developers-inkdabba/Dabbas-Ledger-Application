import { FirebaseError } from "firebase/app";

export type AuthErrorFlow = "login" | "signup" | "reset" | "verification" | "session" | "general";

const getCode = (error: unknown) => {
  if (error instanceof FirebaseError) return error.code;
  if (typeof error === "object" && error && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
};

const getMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
};

const isRawFirebaseMessage = (message: string) =>
  /firebase|auth\/|firestore|permission-denied|network-request-failed/i.test(message);

export const friendlyAuthErrorMessage = (error: unknown, flow: AuthErrorFlow = "general") => {
  const code = getCode(error);
  const message = getMessage(error);
  const normalized = message.toLowerCase();

  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email or PIN is incorrect. Please check your details and try again.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/missing-password":
      return "Enter your 6-digit PIN to continue.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Sign in or reset your PIN.";
    case "auth/weak-password":
      return "Choose a 6-digit PIN.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment, then try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact your admin.";
    case "auth/network-request-failed":
    case "unavailable":
      return "We could not connect right now. Check your internet connection and try again.";
    case "permission-denied":
      return "You do not have access to this workspace. Please contact your admin.";
    case "auth/requires-recent-login":
      return "For security, please sign in again and retry this action.";
    default:
      break;
  }

  if (normalized.includes("verify your email")) return message;
  if (normalized.includes("invite code")) return message;
  if (normalized.includes("waiting for admin approval") || normalized.includes("workspace request")) return message;
  if (normalized.includes("not approved")) return message;
  if (normalized.includes("inactive")) return "This account is inactive. Please contact your admin.";
  if (normalized.includes("no active firebase auth user") || normalized.includes("no saved firebase auth session")) {
    return "Your session has expired. Please sign in again.";
  }
  if (normalized.includes("company profile") || normalized.includes("companyid")) {
    return "Your workspace profile is not ready yet. Please ask your admin to check your access.";
  }

  if (message && !isRawFirebaseMessage(message)) return message;

  if (flow === "login") return "We could not sign you in. Please check your details and try again.";
  if (flow === "signup") return "We could not create your account. Please review your details and try again.";
  if (flow === "reset") return "We could not send the reset link. Please check the email and try again.";
  if (flow === "verification") return "We could not send the verification email. Please try again.";
  if (flow === "session") return "We could not load your workspace. Please sign in again.";
  return "Something went wrong. Please try again.";
};

export const throwFriendlyAuthError = (error: unknown, flow: AuthErrorFlow): never => {
  throw new Error(friendlyAuthErrorMessage(error, flow));
};
