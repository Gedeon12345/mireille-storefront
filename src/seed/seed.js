import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";

const readJson = async (name) =>
  JSON.parse(await readFile(new URL(`./data/${name}.json`, import.meta.url), "utf8"));

if (env.NODE_ENV === "production" && !process.argv.includes("--force")) {
  console.error("Seed refusé en production : il efface les données. Ajoutez --force si c'est voulu.");
  process.exit(1);
}

try {
  const [categories, products] = await Promise.all([readJson("categories"), readJson("products")]);

  await connectDatabase(env.MONGODB_URI);
  // init() attend la création des index (unicité de reference et slug) avant d'insérer.
  await Promise.all([Category.init(), Product.init()]);
  await Promise.all([Category.deleteMany({}), Product.deleteMany({})]);

  await Category.insertMany(categories);
  await Product.create(products); // create() (et non insertMany) exécute le hook qui fabrique slug et searchText

  console.log(`Seed terminé : ${categories.length} catégories, ${products.length} produits.`);
} catch (error) {
  console.error("Seed impossible :", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
