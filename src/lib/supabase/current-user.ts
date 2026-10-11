import { cache } from "react";
import { createClient } from "./server";

// Verify the JWT signature, never trust a user object read directly from cookies.
// Mutations still use getUser() to check the current session with the Auth server.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return {
    id: claims.sub,
    email: claims.email,
    user_metadata: claims.user_metadata,
  };
});
