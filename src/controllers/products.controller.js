import { Product } from "../models/Product.js";
import { buildProductFilter, buildSort } from "../services/catalogQuery.js";
import { ApiError } from "../utils/ApiError.js";

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
const RELATED_LIMIT = 4;

// isValidObjectId() accepterait n'importe quel texte de 12 caractères : on teste le format exact.
function findActiveProduct(idOrSlug) {
  const criteria = OBJECT_ID_PATTERN.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };
  return Product.findOne({ ...criteria, isActive: true });
}

export async function listProducts(req, res) {
  const { page, limit, sort, ...filters } = req.validated.query;
  const filter = buildProductFilter(filters);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(buildSort(sort))
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({
    data: products,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export async function getProduct(req, res) {
  const product = await findActiveProduct(req.validated.params.idOrSlug);
  if (!product) throw ApiError.notFound("Produit introuvable");

  res.json({ data: product });
}

export async function getRelatedProducts(req, res) {
  const product = await findActiveProduct(req.validated.params.idOrSlug);
  if (!product) throw ApiError.notFound("Produit introuvable");

  const related = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    isActive: true,
  })
    .sort({ rating: -1, _id: 1 })
    .limit(RELATED_LIMIT);

  res.json({ data: related });
}
