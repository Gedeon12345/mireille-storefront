import { User } from "../../models/User.js";
import { ApiError } from "../../utils/ApiError.js";
import { escapeRegExp } from "../../utils/text.js";

export async function listUsers(req, res) {
  const { page, limit, q, role } = req.validated.query;

  const filter = {};
  if (role) filter.role = role;
  if (q) {
    const pattern = { $regex: escapeRegExp(q), $options: "i" };
    filter.$or = [{ email: pattern }, { firstName: pattern }, { lastName: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    data: users,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

/** Désactiver un compte lui coupe l'accès immédiatement (requireAuth relit l'utilisateur à chaque requête). */
export async function updateUserStatus(req, res) {
  const { id } = req.validated.params;
  if (id === req.user.id) throw ApiError.badRequest("Vous ne pouvez pas modifier l'état de votre propre compte");

  const user = await User.findByIdAndUpdate(id, { isActive: req.validated.body.isActive }, { new: true });
  if (!user) throw ApiError.notFound("Utilisateur introuvable");

  res.json({ data: user });
}
