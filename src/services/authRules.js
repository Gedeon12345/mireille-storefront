/**
 * Un jeton émis avant le dernier changement de mot de passe n'est plus valable.
 * `issuedAt` est en secondes (claim "iat" du JWT) ; on compare donc à la seconde près.
 */
export function tokenIssuedBeforePasswordChange(issuedAt, passwordChangedAt) {
  if (!passwordChangedAt) return false;
  return issuedAt < Math.floor(passwordChangedAt.getTime() / 1000);
}
