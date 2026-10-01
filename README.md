# Dabba's Ledger Mobile

Production-oriented Expo React Native expense management app for Android and iPhone. The app uses Expo Router, Firebase Auth, company-scoped Firestore data, role-based approval flows, Cloudinary receipt uploads, audit logging, reports, dark/light themes, and EAS build profiles.

## Stack

- Expo 54, React Native 0.81, Expo Router
- Firebase Auth and Firestore
- React Query for remote state
- Zustand for auth/theme/filter state
- Glass design system: theme tokens in `src/constants/theme.ts`, Reanimated motion, native `boxShadow` depth
- Cloudinary unsigned uploads for receipt files
- Expo Image Picker, Document Picker, File System, Print, Sharing, Haptics

## Environment

Create `mobile/.env` from the example:

```bash
cp .env.example .env
```

Required values:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_web_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
EXPO_PUBLIC_DEFAULT_COMPANY_ID=inkdabba
EXPO_PUBLIC_APP_ID=com.inkdabba.expense
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

Do not put Firebase service account keys, Cloudinary API secrets, or private backend secrets in the mobile app. `EXPO_PUBLIC_*` values are bundled into the client.

## Firebase Setup

Enable:

- Authentication > Email/Password
- Firestore Database

Data is company-scoped:

```text
companies/{companyId}
companies/{companyId}/users/{uid}
companies/{companyId}/expenses/{expenseId}
companies/{companyId}/projects/{projectId}
companies/{companyId}/auditLogs/{auditId}
companies/{companyId}/settings/{settingId}
userProfiles/{uid}
```

Roles:

- `admin`: manages users, projects, reports, payment status, and settings
- `manager`: reviews team expenses and can approve/reject
- `employee`: submits and tracks own expenses

Approval flow:

```text
employee creates expense -> pending_manager
manager/admin approves -> approved
admin marks paid -> paid
manager/admin rejects -> rejected
```

Deploy rules:

```bash
firebase use your-firebase-project-id
npm run deploy:rules
```

The included Firestore rules enforce company membership, explicit admin/manager checks, owner-only employee access, pending-only employee edits/deletes, constrained approval/rejection/payment transitions, and append-only audit logs.

## First Admin

Create the first company admin manually once:

1. Firebase Console > Authentication > Users > Add user.
2. Copy the new user's UID.
3. Create `companies/inkdabba` with:

```json
{
  "name": "InkDabba",
  "ownerUid": "AUTH_UID",
  "createdAt": "2026-05-05T00:00:00.000Z",
  "updatedAt": "2026-05-05T00:00:00.000Z"
}
```

4. Create `companies/inkdabba/users/AUTH_UID` with role `admin`, `companyId: "inkdabba"`, `authUid: "AUTH_UID"`, `isActive: true`, name, email, department, and timestamps.
5. Create `userProfiles/AUTH_UID` with:

```json
{
  "companyId": "inkdabba",
  "role": "admin",
  "isActive": true,
  "updatedAt": "2026-05-05T00:00:00.000Z"
}
```

After this, create team members from Admin > Team.

## Cloudinary Receipts

Create an unsigned Cloudinary upload preset and set:

```env
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

Receipts are uploaded to:

```text
inkdabba/{companyId}/receipts/{uid}
```

Allowed client files are JPG, PNG, WebP, and PDF up to 10 MB. Large images are compressed before upload.

## Development

```bash
npm install
npm start
npm run typecheck
```

Native builds for local devices:

```bash
npm run android
npm run ios
```

Web smoke export:

```bash
npm run export:web
```

## EAS Builds

Configure the EAS project:

```bash
npm run eas:init
```

Set production secrets in EAS:

```bash
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "..."
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME --value "..."
```

Build:

```bash
npm run build:android
npm run build:ios
npm run build:production
```

Profiles are defined in `eas.json`:

- `development`: development client, internal distribution
- `preview`: internal APK for Android QA
- `production`: Android App Bundle and iOS production build with auto-increment

## Release Checklist

- `npm run typecheck` passes
- `npm run export:web` passes for a bundling smoke test
- Firestore rules deployed
- Firebase Auth Email/Password enabled
- First admin profile exists
- Cloudinary unsigned upload preset is restricted to expected formats and folder policy where possible
- Android package and iOS bundle identifier are final
- EAS project ID is set in `.env` or EAS environment
- App icon, adaptive icon, and splash assets are production assets
- Test login, signup, forgot password, add expense, receipt upload, approval, rejection, paid marking, reports export, theme toggle, and logout

## Security Notes

- The app does not rely on client-side role checks alone; Firestore rules enforce role access.
- Users can read only their own expenses unless they are manager/admin.
- Admin and project/team mutations are rule-protected.
- Audit logs are append-only from the client and readable only by admins.
- Raw Firebase errors should be treated as technical details; user-facing UI should stay friendly.
- For higher-assurance production, move sensitive workflow actions and Cloudinary signed upload policies into Cloud Functions.
