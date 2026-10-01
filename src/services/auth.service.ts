import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  cleanRecord,
  collections,
  companyDoc,
  companyInviteDoc,
  mapUserDoc,
  normalizeCompanyCode,
  normalizeEmail,
  normalizeUserCode,
  nowIso
} from "./firestore.utils";
import { AuthErrorFlow, throwFriendlyAuthError } from "../utils/authErrors";

type SignupPayload = {
  email: string;
  pin: string;
  name: string;
  phoneNumber?: string;
  companyName: string;
  companyCode: string;
};

const assertSixDigitPin = (pin: string) => {
  if (!/^\d{6}$/.test(pin)) throw new Error("Enter your 6-digit PIN.");
};

const currentAuthUser = () =>
  new Promise<FirebaseUser | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });

const requireCurrentUser = async () => {
  const user = auth.currentUser || (await currentAuthUser());
  if (!user) throw new Error("No active Firebase Auth user.");
  return user;
};

const assertEmailVerified = async (user: FirebaseUser) => {
  await user.reload();
  if (!user.emailVerified) {
    throw new Error("Please verify your email before signing in. Check your inbox for the verification link.");
  }
};

const emailActionSettings = () => ({
  url:
    process.env.EXPO_PUBLIC_AUTH_CONTINUE_URL ||
    `https://${process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "dabbas-ledger.firebaseapp.com"}`,
  handleCodeInApp: false
});

const withFriendlyAuthError = async <T>(flow: AuthErrorFlow, action: () => Promise<T>) => {
  try {
    return await action();
  } catch (error) {
    return throwFriendlyAuthError(error, flow);
  }
};

export const authService = {
  signup: async ({ email, pin, name, phoneNumber, companyName, companyCode }: SignupPayload) => withFriendlyAuthError("signup", async () => {
    assertSixDigitPin(pin);
    const normalizedEmail = normalizeEmail(email);
    const normalizedCode = normalizeCompanyCode(companyCode);
    const requestedCompanyName = companyName.trim();
    const inviteSnapshot = await getDoc(companyInviteDoc(normalizedCode));

    if (!normalizedCode || !inviteSnapshot.exists() || inviteSnapshot.data().isActive === false) {
      throw new Error("This company invite code is not valid. Please ask your admin for a fresh code.");
    }

    const invite = inviteSnapshot.data();
    const companyId = String(invite.companyId || "");
    const inviteCompanyName = String(invite.companyName || requestedCompanyName || "Company workspace");
    if (!companyId) throw new Error("This company invite is missing its workspace. Please ask your admin to create a new code.");

    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, pin);
    const timestamp = nowIso();
    const displayName = name.trim();

    if (displayName) await updateProfile(credential.user, { displayName });

    await setDoc(doc(companyDoc(companyId), collections.users, credential.user.uid), cleanRecord({
      authUid: credential.user.uid,
      companyId,
      name: displayName,
      email: normalizedEmail,
      userCode: normalizeUserCode(normalizedEmail),
      role: "employee",
      department: "Pending approval",
      phoneNumber: phoneNumber?.trim(),
      isActive: false,
      approvalStatus: "pending",
      requestedCompanyName,
      companyInviteCode: normalizedCode,
      createdAt: timestamp,
      updatedAt: timestamp
    }));

    await setDoc(doc(db, collections.userProfiles, credential.user.uid), {
      companyId,
      role: "employee",
      isActive: false,
      approvalStatus: "pending",
      companyName: inviteCompanyName,
      updatedAt: timestamp
    });

    await firebaseSendEmailVerification(credential.user, emailActionSettings());
    await signOut(auth);
    return { token: credential.user.uid, emailVerificationSent: true, approvalPending: true };
  }),

  login: async (email: string, pin: string) => withFriendlyAuthError("login", async () => {
    assertSixDigitPin(pin);
    const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), pin);
    await assertEmailVerified(credential.user);
    const user = await authService.me(credential.user.uid);
    return { token: credential.user.uid, user };
  }),

  me: async (authUid?: string | null, options?: { allowUnverifiedEmail?: boolean }) => withFriendlyAuthError("session", async () => {
    const firebaseUser = auth.currentUser || (await currentAuthUser());
    const uid = authUid || firebaseUser?.uid;
    if (!uid) throw new Error("No saved Firebase Auth session.");
    if (!options?.allowUnverifiedEmail && firebaseUser && firebaseUser.uid === uid) await assertEmailVerified(firebaseUser);

    const indexSnapshot = await getDoc(doc(db, collections.userProfiles, uid));
    if (!indexSnapshot.exists()) throw new Error("No company profile index found for this Firebase Auth user.");
    const indexData = indexSnapshot.data();
    const companyId = String(indexData.companyId || "");
    if (!companyId) throw new Error("Your company profile is missing a companyId.");

    const profileSnapshot = await getDoc(doc(companyDoc(companyId), collections.users, uid));
    if (!profileSnapshot.exists()) throw new Error("No company profile found for this Firebase Auth user.");

    const user = mapUserDoc(profileSnapshot);
    if (indexData.companyName && !user.requestedCompanyName) {
      user.requestedCompanyName = String(indexData.companyName);
    }
    if (user.approvalStatus === "pending") {
      throw new Error("Your workspace request is waiting for admin approval. You will be able to sign in after approval.");
    }
    if (user.approvalStatus === "rejected") {
      throw new Error("Your workspace access request was not approved. Please contact your company admin.");
    }
    if (!user.isActive) throw new Error("This account is inactive. Please contact your admin.");
    return user;
  }),

  sendEmailVerification: async () => withFriendlyAuthError("verification", async () => {
    const user = await requireCurrentUser();
    await firebaseSendEmailVerification(user, emailActionSettings());
  }),

  sendPasswordResetEmail: async (email: string) => withFriendlyAuthError("reset", async () => {
    await firebaseSendPasswordResetEmail(auth, normalizeEmail(email), emailActionSettings());
  }),

  logout: async () => {
    await signOut(auth);
  }
};
