import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";

async function countProductsBySlug() {
  const counts = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  return new Map(counts.map(({ _id, count }) => [_id, count]));
}

export async function listCategories(_req, res) {
  const [categories, countBySlug] = await Promise.all([
    Category.find().sort({ order: 1, name: 1 }),
    countProductsBySlug(),
  ]);

  res.json({
    data: categories.map((category) => ({
      ...category.toJSON(),
      productCount: countBySlug.get(category.slug) ?? 0,
    })),
  });
}

export async function getCategory(req, res) {
  const { slug } = req.validated.params;
  const category = await Category.findOne({ slug });
  if (!category) throw ApiError.notFound("Catégorie introuvable");

  const productCount = await Product.countDocuments({ category: slug, isActive: true });
  res.json({ data: { ...category.toJSON(), productCount } });
}
