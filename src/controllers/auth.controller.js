import { User } from "../models/User.js";
import { signToken } from "../services/token.js";
import { ApiError } from "../utils/ApiError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

// Haché factice : quand l'e-mail n'existe pas, on fait quand même le calcul pour que la réponse
// ne soit pas plus rapide (ce qui permettrait de deviner quels e-mails ont un compte).
const DUMMY_HASH = await hashPassword("mot-de-passe-factice");

const INVALID_CREDENTIALS = "E-mail ou mot de passe incorrect";

export async function register(req, res) {
  const { password, ...profile } = req.validated.body;

  // Seuls les champs listés dans le schéma zod arrivent ici : le rôle ne peut pas être imposé par le client.
  const user = await User.create({ ...profile, passwordHash: await hashPassword(password) });

  res.status(201).json({ data: { user, token: signToken(user) } });
}

export async function login(req, res) {
  const { email, password } = req.validated.body;

  const user = await User.findOne({ email }).select("+passwordHash");
  const passwordIsValid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordIsValid || !user.isActive) throw ApiError.unauthorized(INVALID_CREDENTIALS);

  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

  res.json({ data: { user, token: signToken(user) } });
}

export function getMe(req, res) {
  res.json({ data: { user: req.user } });
}

export async function updateMe(req, res) {
  req.user.set(req.validated.body);
  await req.user.save();

  res.json({ data: { user: req.user } });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.validated.body;

  const user = await User.findById(req.user.id).select("+passwordHash");
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    // 400 et non 401 : le client ne doit pas déconnecter l'utilisateur pour une simple faute de frappe.
    throw ApiError.badRequest("Mot de passe actuel incorrect");
  }

  user.passwordHash = await hashPassword(newPassword);
  // Arrondi à la seconde : les anciens jetons deviennent invalides, le nouveau (émis juste après) reste valable.
  user.passwordChangedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
  await user.save();

  res.json({ data: { user, token: signToken(user) } });
}
