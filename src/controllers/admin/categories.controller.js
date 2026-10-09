import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { ApiError } from "../../utils/ApiError.js";

export async function createCategory(req, res) {
  const category = await Category.create(req.validated.body);
  res.status(201).json({ data: category });
}

// Le slug ne change jamais : les produits y font référence.
export async function updateCategory(req, res) {
  const category = await Category.findOneAndUpdate(
    { slug: req.validated.params.slug },
    { $set: req.validated.body },
    { new: true, runValidators: true },
  );
  if (!category) throw ApiError.notFound("Catégorie introuvable");

  res.json({ data: category });
}

export async function deleteCategory(req, res) {
  const { slug } = req.validated.params;

  if (await Product.exists({ category: slug })) {
    throw ApiError.conflict("Cette catégorie contient encore des produits : déplacez-les ou archivez-les d'abord");
  }
  const { deletedCount } = await Category.deleteOne({ slug });
  if (deletedCount === 0) throw ApiError.notFound("Catégorie introuvable");

  res.status(204).end();
}
