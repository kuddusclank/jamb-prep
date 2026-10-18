const CREDENTIAL_FAILURE = /invalid (?:login credentials|email or password)|invalid credentials/i;

const GENERIC_CREDENTIAL_MESSAGE =
  "We couldn't sign you in with that email and password. If you're new to JAMBPrep, create an account first.";

/**
 * Keeps credential failures deliberately generic so sign-in cannot confirm
 * whether a particular email address has an account.
 */
export function presentSignInError(message: string | null | undefined): string {
  if (!message || CREDENTIAL_FAILURE.test(message)) {
    return GENERIC_CREDENTIAL_MESSAGE;
  }

  return message;
}
