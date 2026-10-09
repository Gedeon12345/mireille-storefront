import mongoose from "mongoose";
import { buildSearchText } from "../services/catalogQuery.js";
import { getStockStatus } from "../utils/stock.js";
import { slugify } from "../utils/text.js";

const isInteger = { validator: Number.isInteger, message: "{PATH} doit être un entier (en centimes)" };

const productSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, uppercase: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    brand: { type: String, required: true, trim: true, index: true },
    // Slug de la catégorie (voir Category) : simple à filtrer et stable.
    category: { type: String, required: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    imageUrl: { type: String, required: true, trim: true },
    imageAlt: { type: String, required: true, trim: true, maxlength: 200 },

    // Les montants sont stockés en centimes d'euro (entiers) pour éviter les erreurs d'arrondi.
    priceCents: { type: Number, required: true, min: 0, validate: isInteger },
    oldPriceCents: {
      type: Number,
      min: 0,
      validate: [
        isInteger,
        {
          validator(value) {
            return value === undefined || value === null || value > this.priceCents;
          },
          message: "oldPriceCents doit être supérieur au prix actuel",
        },
      ],
    },

    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0, validate: isInteger },
    stockQuantity: { type: Number, required: true, min: 0, default: 0, validate: isInteger },
    badge: { type: String, enum: ["Nouveau", "Promo"] },

    compatibility: { type: [String], default: [] },
    // Marques de véhicules concernées ; "*" = pièce universelle.
    compatibleBrands: { type: [String], default: [], index: true },

    isActive: { type: Boolean, default: true, index: true },
    // Texte normalisé (sans accents, en minuscules) utilisé par la recherche. Jamais renvoyé par l'API.
    searchText: { type: String, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.searchText;
        // Quantité exacte réservée à l'administration (voir utils/serializers.js) ; le public voit stockStatus.
        delete ret.stockQuantity;
        return ret;
      },
    },
  },
);

productSchema.virtual("stockStatus").get(function stockStatus() {
  return getStockStatus(this.stockQuantity);
});

productSchema.virtual("discountPercent").get(function discountPercent() {
  return this.oldPriceCents ? Math.round((1 - this.priceCents / this.oldPriceCents) * 100) : 0;
});

// Ce hook s'exécute avec create() et save(). Il n'est PAS appelé par insertMany() ni updateMany() :
// pour modifier un produit, chargez-le puis appelez save().
productSchema.pre("validate", function buildDerivedFields() {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  this.searchText = buildSearchText(this);
});

export const Product = mongoose.model("Product", productSchema);
