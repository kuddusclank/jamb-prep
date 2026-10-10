import { cache } from "react";
import { createClient } from "./server";

// Request-scoped only: never share authentication results across users or requests.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
