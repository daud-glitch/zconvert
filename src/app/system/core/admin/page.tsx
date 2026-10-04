import { permanentRedirect } from "next/navigation";

/**
 * Legacy admin entry point. The working admin lives at /core/system/admin,
 * which renders the panel after login. This duplicate login form used to send
 * admins to the public homepage after a successful sign-in.
 */
export default function LegacyAdminPage() {
  permanentRedirect("/core/system/admin");
}
