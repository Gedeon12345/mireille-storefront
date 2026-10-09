import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { buildAdminProductFilter } from "../../services/catalogQuery.js";
import { ApiError } from "../../utils/ApiError.js";
import { toAdminProduct } from "../../utils/serializers.js";

async function assertCategoryExists(slug) {
  if (!(await Category.exists({ slug }))) {
    throw ApiError.badRequest("Catégorie inconnue", [{ field: "category", message: `la catégorie « ${slug} » n'existe pas` }]);
  }
}

async function findProductOrFail(id) {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Produit introuvable");
  return product;
}

export async function listProducts(req, res) {
  const { page, limit, ...filters } = req.validated.query;
  const filter = buildAdminProductFilter(filters);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({
    data: products.map(toAdminProduct),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export async function getProduct(req, res) {
  res.json({ data: toAdminProduct(await findProductOrFail(req.validated.params.id)) });
}

export async function createProduct(req, res) {
  await assertCategoryExists(req.validated.body.category);
  const product = await Product.create(req.validated.body);

  res.status(201).json({ data: toAdminProduct(product) });
}

export async function updateProduct(req, res) {
  const product = await findProductOrFail(req.validated.params.id);
  const changes = req.validated.body;
  if (changes.category) await assertCategoryExists(changes.category);

  // null = « effacer la valeur » (ancien prix, badge) ; le slug reste stable pour ne pas casser les liens.
  for (const [field, value] of Object.entries(changes)) product.set(field, value === null ? undefined : value);

  if (product.oldPriceCents && product.oldPriceCents <= product.priceCents) {
    throw ApiError.badRequest("L'ancien prix doit être supérieur au prix actuel");
  }
  await product.save();

  res.json({ data: toAdminProduct(product) });
}

/** « Supprimer » = archiver : les anciennes commandes gardent leur lien avec le produit. Restauration : PATCH isActive true. */
export async function archiveProduct(req, res) {
  const product = await findProductOrFail(req.validated.params.id);
  product.isActive = false;
  await product.save();

  res.json({ data: toAdminProduct(product) });
}
