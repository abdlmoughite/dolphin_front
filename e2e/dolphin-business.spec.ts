import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = (process.env.DOLPHIN_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '').replace(/\/api\/v1$/, '');
const apiBase = `${apiRoot}/api/v1`;
const adminEmail = process.env.DOLPHIN_ADMIN_EMAIL || 'admin.dev@dolphin.local';
const adminPassword = process.env.DOLPHIN_ADMIN_PASSWORD;
const runId = Date.now();
const dirname = path.dirname(fileURLToPath(import.meta.url));
const customer = {
  email: `customer.${runId}@dolphin.local`,
  password: `Customer-${runId}!`,
  firstName: 'Client',
  lastName: 'Playwright',
};

let product: { id: number; slug: string; name: string; sku?: string; category: { id: number }; images?: { id: number }[]; variants: { id: number; sku: string; inventory?: { quantity?: number } }[] };
let deliveryZone: { id: number; city: string };
let createdOrderId = '';
let uploadImagePaths: string[] = [];
let adminTokens: { access: string; refresh: string };

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  const health = await request.get(`${apiBase}/products/?page_size=1`);
  console.info(`E2E API check: GET ${apiBase}/products/?page_size=1 -> ${health.status()}`);
  expect(health.ok()).toBeTruthy();

  const products = await request.get(`${apiBase}/products/`);
  expect(products.ok()).toBeTruthy();
  const productList = await products.json();
  product = productList.results.find((item: typeof product) => item.variants?.length > 0);
  expect(product, 'Un produit actif avec variante est requis').toBeTruthy();

  const zones = await request.get(`${apiBase}/delivery-zones/`);
  expect(zones.ok()).toBeTruthy();
  const zoneList = await zones.json();
  deliveryZone = zoneList.results[0];
  expect(deliveryZone, 'Une zone de livraison est requise').toBeTruthy();

  const mediaDirs = [path.resolve(dirname, '../../backend/media/products'), path.resolve(dirname, '../../backend/media/categories'), path.resolve(dirname, '../../backend/media/banners')];
  uploadImagePaths = mediaDirs.flatMap((mediaDir) => fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir).filter((name) => /\.(png|jpe?g|webp)$/i.test(name)).map((name) => path.join(mediaDir, name)) : []).slice(0, 2);
  expect(uploadImagePaths.length, 'Deux images locales sont requises pour le scenario upload multiple').toBeGreaterThanOrEqual(2);
  expect(adminPassword, 'DOLPHIN_ADMIN_PASSWORD doit etre defini pour les tests admin').toBeTruthy();

  adminTokens = await loginApi(request, adminEmail, adminPassword || '');
});

test('1. Inscription client', async ({ page }) => {
  await page.goto('/inscription');
  await page.locator('input[name="email"]').fill(customer.email);
  await page.locator('input[name="password"]').fill(customer.password);
  await page.locator('input[name="first_name"]').fill(customer.firstName);
  await page.locator('input[name="last_name"]').fill(customer.lastName);
  const registerResponsePromise = page.waitForResponse((response) => response.url().includes('/api/v1/auth/register/') && response.request().method() === 'POST');
  await page.getByRole('button', { name: /Creer le compte/i }).click();
  const registerResponse = await registerResponsePromise;
  const registerBody = await safeJson(registerResponse);
  console.info(JSON.stringify({
    event: 'register-response',
    method: registerResponse.request().method(),
    url: registerResponse.url(),
    status: registerResponse.status(),
    frontendUrl: page.url(),
    apiBase,
    body: sanitizeResponse(registerBody),
  }));
  expect(registerResponse.status()).toBe(201);
  await expect(page).toHaveURL(/\/compte/);
});

test('2. Connexion client', async ({ page }) => {
  await page.goto('/connexion');
  await page.locator('input[name="email"]').fill(customer.email);
  await page.locator('input[name="password"]').fill(customer.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/compte/);
});

test('3. Consultation catalogue', async ({ page }) => {
  await page.goto('/catalogue');
  await expect(page.getByRole('heading', { name: /Catalogue DOLPHIN/i })).toBeVisible();
  await expect(page.getByText(product.name).first()).toBeVisible();
});

test('4. Filtrage produit', async ({ page }) => {
  await page.goto('/catalogue');
  await page.getByPlaceholder('Recherche produit').fill(product.name.slice(0, 8));
  await expect(page).toHaveURL(/search=/);
  await expect(page.getByText(product.name).first()).toBeVisible();
});

test('5. Ajout d une variante au panier', async ({ page }) => {
  await loginCustomer(page);
  await page.goto(`/produit/${product.slug}`);
  await page.getByRole('button', { name: /Ajouter au panier/i }).click();
  await page.goto('/panier');
  await expect(page.getByText(product.name).first()).toBeVisible();
});

test('6. Checkout et creation de commande', async ({ page, request }) => {
  const beforeProduct = await request.get(`${apiBase}/products/${product.slug}/`);
  expect(beforeProduct.ok()).toBeTruthy();
  const beforeDetail = await beforeProduct.json();
  const beforeQuantity = beforeDetail.variants?.[0]?.inventory?.quantity;
  await loginCustomer(page);
  await page.goto(`/produit/${product.slug}`);
  await page.getByRole('button', { name: /Ajouter au panier/i }).click();
  await page.goto('/panier');
  await page.locator('input[type="number"]').first().fill('25');
  await expect(page.locator('input[type="number"]').first()).toHaveValue('25');
  await page.goto('/checkout');
  await page.locator('input[name="guest_email"]').fill(customer.email);
  await page.locator('input[name="shipping_full_name"]').fill(`${customer.firstName} ${customer.lastName}`);
  await page.locator('input[name="shipping_phone"]').fill('0612345678');
  await page.locator('textarea[name="shipping_address"]').fill('12 rue Test Dolphin, Casablanca');
  await page.locator('select[name="delivery_zone_id"]').selectOption(String(deliveryZone.id));
  await page.locator('select[name="payment_method"]').selectOption('COD');
  await page.getByRole('button', { name: /Confirmer la commande/i }).click();
  await expect(page).toHaveURL(/\/confirmation\/\d+/);
  createdOrderId = page.url().split('/').pop() || '';
  expect(createdOrderId).toMatch(/\d+/);
  const afterProduct = await request.get(`${apiBase}/products/${product.slug}/`);
  expect(afterProduct.ok()).toBeTruthy();
  const afterDetail = await afterProduct.json();
  expect(afterDetail.variants?.[0]?.inventory?.quantity).toBe(beforeQuantity);
});

test('7. Consultation de la commande dans compte', async ({ page }) => {
  await loginCustomer(page);
  await page.goto('/compte');
  await expect(page.getByRole('heading', { name: /Mon compte/i })).toBeVisible();
  await expect(page.getByText(/DOL-/).first()).toBeVisible();
});

test('8. Creation d une demande de retour', async ({ page, request }) => {
  if (createdOrderId) {
    await request.post(`${apiBase}/orders/${createdOrderId}/transition/`, { headers: authHeaders(adminTokens.access), data: { status: 'CONFIRMED' } });
    await request.post(`${apiBase}/orders/${createdOrderId}/transition/`, { headers: authHeaders(adminTokens.access), data: { status: 'PREPARING' } });
    await request.post(`${apiBase}/orders/${createdOrderId}/transition/`, { headers: authHeaders(adminTokens.access), data: { status: 'SHIPPED' } });
    await request.post(`${apiBase}/orders/${createdOrderId}/transition/`, { headers: authHeaders(adminTokens.access), data: { status: 'DELIVERED' } });
  }
  await loginCustomer(page);
  await page.goto('/compte');
  const returnButton = page.getByRole('button', { name: /^Retour$/ }).first();
  await expect(returnButton).toBeVisible();
  await returnButton.click();
  await page.locator('textarea[placeholder="Motif du retour"]').fill('Produit teste via Playwright');
  await page.locator('form input[type="number"]').first().fill('1');
  await page.getByRole('button', { name: /Envoyer la demande/i }).click();
  await expect(page.getByText(/Retour demande|demande/i).first()).toBeVisible();
});

test('9. Connexion admin', async ({ page }) => {
  await loginAdmin(page);
  await expect(page).toHaveURL(/\/developer|\/admin/);
});

test('10. Modification du statut d une commande', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin/orders');
  const firstAdvance = page.getByRole('button', { name: /Confirmer|Avancer/i }).first();
  if (await firstAdvance.isEnabled().catch(() => false)) {
    await firstAdvance.click();
    await expect(page.getByText(/Statut de commande mis a jour/i)).toBeVisible();
  } else {
    await expect(page.getByRole('heading', { name: /Commandes/i })).toBeVisible();
  }
});

test('11. CRUD produit complet avec images, variante, fiche, panier et suppression', async ({ page, request }) => {
  await loginAdmin(page);
  const productName = `Produit Playwright ${runId}`;
  const productSku = `PW-${runId}`;
  const variantOneSku = `${productSku}-V1`;
  const variantTwoSku = `${productSku}-V2`;

  await page.goto('/admin/products');
  await page.getByRole('button', { name: /Nouveau produit/i }).click();
  await page.getByLabel('Nom', { exact: true }).fill(productName);
  await page.getByLabel('SKU unique').fill(productSku);
  await page.getByLabel('Categorie').selectOption({ index: 1 });
  await page.getByLabel('Prix normal').fill('199');
  await page.getByLabel('Statut').selectOption('ACTIVE');
  await page.getByRole('button', { name: /Ajouter une variante/i }).click();
  await page.locator('input[placeholder="SKU variante"]').first().fill(variantOneSku);
  await page.locator('input[placeholder="Couleur"]').first().fill('Bleu');
  await page.locator('input[placeholder="Prix propre"]').first().fill('209');
  await page.getByRole('button', { name: /Ajouter une variante/i }).click();
  await page.locator('input[placeholder="SKU variante"]').nth(1).fill(variantTwoSku);
  await page.locator('input[placeholder="Couleur"]').nth(1).fill('Noir');
  await page.locator('input[type="file"]').setInputFiles(uploadImagePaths);
  await page.getByRole('button', { name: /Enregistrer/i }).click();
  await expect(page.getByText(/Produit enregistre/i)).toBeVisible();
  await page.getByPlaceholder(/Rechercher par nom/i).fill(productName);
  await expect(page.getByText(productName).first()).toBeVisible();

  const createdResponse = await request.get(`${apiBase}/products/?search=${encodeURIComponent(productSku)}`, { headers: authHeaders(adminTokens.access) });
  expect(createdResponse.ok()).toBeTruthy();
  const createdList = await createdResponse.json();
  const createdProduct = createdList.results.find((item: typeof product) => item.sku === productSku);
  expect(createdProduct, 'Le produit cree doit etre retrouve par SKU').toBeTruthy();
  expect(createdProduct.images?.length || 0).toBeGreaterThanOrEqual(2);
  expect(createdProduct.variants.length).toBe(2);

  await page.goto(`/admin/products/${createdProduct.slug}/edit`);
  await expect(page.getByLabel('Nom', { exact: true })).toHaveValue(productName);
  await page.getByLabel('Prix promo').fill('179');
  await page.getByRole('button', { name: /Enregistrer/i }).click();
  await expect(page.getByText(/Produit enregistre/i)).toBeVisible();

  await page.goto(`/admin/products/${createdProduct.slug}/edit`);
  await expect(page.getByRole('button', { name: /Definir principale/i }).first()).toBeVisible();
  await page.getByRole('button', { name: /Definir principale/i }).first().click();
  await expect(page.getByText(/Image principale mise a jour/i)).toBeVisible();
  await page.getByRole('button', { name: /^Supprimer$/i }).first().click();
  await expect(page.getByText(/Image supprimee/i)).toBeVisible();

  await page.goto(`/produit/${createdProduct.slug}`);
  await expect(page.getByRole('heading', { name: productName })).toBeVisible();
  await expect(page.getByRole('button', { name: /Wishlist/i })).toBeVisible();
  await page.getByRole('button', { name: /Ajouter au panier/i }).click();
  await expect(page.getByText(/Panier mis a jour/i)).toBeVisible();
  await expect(page.getByText(/Avis clients/i)).toBeVisible();
  await expect(page.getByText(/Produits similaires/i)).toBeVisible();
  await page.goto('/panier');
  await expect(page.getByText(productName).first()).toBeVisible();
  await page.getByRole('button', { name: /^Supprimer$/i }).first().click();
  await expect(page.getByText(/Votre panier est vide/i)).toBeVisible();

  const variantlessResponse = await request.post(`${apiBase}/products/`, {
    headers: authHeaders(adminTokens.access),
    data: { name: `Sans variante Playwright ${runId}`, sku: `NOVAR-${runId}`, category_id: product.category.id, regular_price: '89.00', status: 'ACTIVE', variants_payload: [] },
  });
  expect(variantlessResponse.ok()).toBeTruthy();
  const variantlessProduct = await variantlessResponse.json();
  expect(variantlessProduct.variants.length).toBe(0);
  await page.goto(`/produit/${variantlessProduct.slug}`);
  await expect(page.getByText('Aucune variante')).toBeVisible();
  await expect(page.getByRole('button', { name: /Ajouter au panier/i })).toBeEnabled();
  await page.getByRole('button', { name: /Ajouter au panier/i }).click();
  await expect(page.getByText(/Panier mis a jour/i)).toBeVisible();
  await page.goto('/panier');
  await expect(page.getByText(variantlessProduct.name).first()).toBeVisible();
  await page.getByRole('button', { name: /^Supprimer$/i }).first().click();
  await expect(page.getByText(/Votre panier est vide/i)).toBeVisible();
  await expect(page.getByText(/stock|rupture/i)).toHaveCount(0);

  const adminNoVariantName = `Admin zero variante ${runId}`;
  const adminNoVariantSku = `ADMIN-NOVAR-${runId}`;
  await page.goto('/admin/products');
  await page.getByRole('button', { name: /Nouveau produit/i }).click();
  await page.getByLabel('Nom', { exact: true }).fill(adminNoVariantName);
  await page.getByLabel('SKU unique').fill(adminNoVariantSku);
  await page.getByLabel('Categorie').selectOption({ index: 1 });
  await page.getByLabel('Prix normal').fill('129');
  await page.getByLabel('Statut').selectOption('ACTIVE');
  await expect(page.locator('input[placeholder="Stock"]')).toHaveCount(0);
  await page.getByRole('button', { name: /Enregistrer/i }).click();
  await expect(page.getByText(/Produit enregistre/i)).toBeVisible();
  let adminNoVariantResponse = await request.get(`${apiBase}/products/?search=${encodeURIComponent(adminNoVariantSku)}`, { headers: authHeaders(adminTokens.access) });
  let adminNoVariant = (await adminNoVariantResponse.json()).results.find((item: typeof product) => item.sku === adminNoVariantSku);
  expect(adminNoVariant.variants.length).toBe(0);

  await page.goto(`/admin/products/${adminNoVariant.slug}/edit`);
  await page.getByRole('button', { name: /Enregistrer/i }).click();
  await expect(page.getByText(/Produit enregistre/i)).toBeVisible();
  adminNoVariantResponse = await request.get(`${apiBase}/products/?search=${encodeURIComponent(adminNoVariantSku)}`, { headers: authHeaders(adminTokens.access) });
  adminNoVariant = (await adminNoVariantResponse.json()).results.find((item: typeof product) => item.sku === adminNoVariantSku);
  expect(adminNoVariant.variants.length).toBe(0);

  await page.goto(`/admin/products/${adminNoVariant.slug}/edit`);
  await page.getByRole('button', { name: /Ajouter une variante/i }).click();
  await page.locator('input[placeholder="SKU variante"]').first().fill(`${adminNoVariantSku}-V1`);
  await page.getByRole('button', { name: /Enregistrer/i }).click();
  await expect(page.getByText(/Produit enregistre/i)).toBeVisible();
  adminNoVariantResponse = await request.get(`${apiBase}/products/?search=${encodeURIComponent(adminNoVariantSku)}`, { headers: authHeaders(adminTokens.access) });
  adminNoVariant = (await adminNoVariantResponse.json()).results.find((item: typeof product) => item.sku === adminNoVariantSku);
  expect(adminNoVariant.variants.length).toBe(1);

  await page.goto(`/admin/products/${adminNoVariant.slug}/edit`);
  await page.locator('input[placeholder="SKU variante"]').first().locator('xpath=ancestor::div[contains(@class, "grid")][1]').getByRole('button').click();
  await page.getByRole('button', { name: /Enregistrer/i }).click();
  await expect(page.getByText(/Produit enregistre/i)).toBeVisible();
  adminNoVariantResponse = await request.get(`${apiBase}/products/?search=${encodeURIComponent(adminNoVariantSku)}`, { headers: authHeaders(adminTokens.access) });
  adminNoVariant = (await adminNoVariantResponse.json()).results.find((item: typeof product) => item.sku === adminNoVariantSku);
  expect(adminNoVariant.variants.length).toBe(0);

  const toggledCategoryName = `Categorie Toggle ${runId}`;
  const toggledCategory = await request.post(`${apiBase}/categories/`, {
    headers: authHeaders(adminTokens.access),
    data: { name: toggledCategoryName, display_order: 1, description: 'Categorie test activation' },
  });
  expect(toggledCategory.ok()).toBeTruthy();
  const toggledCategoryData = await toggledCategory.json();
  const toggledProductName = `Produit categorie toggle ${runId}`;
  const toggledProductSku = `CAT-TOGGLE-${runId}`;
  const toggledProductResponse = await request.post(`${apiBase}/products/`, {
    headers: authHeaders(adminTokens.access),
    data: { name: toggledProductName, sku: toggledProductSku, category_id: toggledCategoryData.id, regular_price: '149.00', status: 'ACTIVE', variants_payload: [{ sku: `${toggledProductSku}-V1` }] },
  });
  expect(toggledProductResponse.ok()).toBeTruthy();
  const toggledProduct = await toggledProductResponse.json();

  await page.goto('/catalogue');
  await expect(page.getByText(toggledProductName).first()).toBeVisible();
  await expect(page.locator('option', { hasText: toggledCategoryName })).toHaveCount(1);

  await page.goto('/admin/categories');
  const categoryRow = page.locator('tr', { hasText: toggledCategoryName });
  await expect(categoryRow).toBeVisible();
  await categoryRow.getByRole('button', { name: /Desactiver/i }).click();
  await expect(page.getByText(/masquera également tous ses produits/i)).toBeVisible();
  await page.locator('.fixed').getByRole('button', { name: /^Desactiver$/i }).click();
  await expect(page.getByText(/Categorie desactivee/i)).toBeVisible();
  await expect(categoryRow.getByText('INACTIVE', { exact: true })).toBeVisible();

  await page.goto('/catalogue');
  await expect(page.getByText(toggledProductName)).toHaveCount(0);
  await expect(page.locator('option', { hasText: toggledCategoryName })).toHaveCount(0);
  const blockedCart = await request.post(`${apiBase}/cart/add/`, { data: { variant_id: toggledProduct.variants[0].id, quantity: 1 } });
  expect(blockedCart.status()).toBe(400);

  await page.goto('/admin/categories');
  const inactiveCategoryRow = page.locator('tr', { hasText: toggledCategoryName });
  await inactiveCategoryRow.getByRole('button', { name: /Activer/i }).click();
  await page.locator('.fixed').getByRole('button', { name: /^Activer$/i }).click();
  await expect(page.getByText(/Categorie activee/i)).toBeVisible();
  await expect(inactiveCategoryRow.getByText('ACTIVE', { exact: true })).toBeVisible();
  await page.goto('/catalogue');
  await expect(page.getByText(toggledProductName).first()).toBeVisible();
  await expect(page.locator('option', { hasText: toggledCategoryName })).toHaveCount(1);

  await page.goto('/admin/products');
  await page.getByPlaceholder(/Rechercher par nom/i).fill(productName);
  const row = page.locator('tr', { hasText: productName });
  await expect(row).toBeVisible();
  await row.getByRole('button').last().click();
  await expect(page.getByText(/Supprimer ce produit/i)).toBeVisible();
  await page.getByRole('button', { name: /^Supprimer$/i }).click();
  await expect(page.getByText(/Produit supprime ou archive/i)).toBeVisible();

  const firstBulkProduct = await request.post(`${apiBase}/products/`, {
    headers: authHeaders(adminTokens.access),
    data: { name: `Bulk Playwright A ${runId}`, sku: `BULK-${runId}-A`, category_id: product.category.id, regular_price: '99.00', status: 'ACTIVE', variants_payload: [{ sku: `BULK-${runId}-A-V1` }] },
  });
  const secondBulkProduct = await request.post(`${apiBase}/products/`, {
    headers: authHeaders(adminTokens.access),
    data: { name: `Bulk Playwright B ${runId}`, sku: `BULK-${runId}-B`, category_id: product.category.id, regular_price: '109.00', status: 'ACTIVE', variants_payload: [{ sku: `BULK-${runId}-B-V1` }] },
  });
  expect(firstBulkProduct.ok()).toBeTruthy();
  expect(secondBulkProduct.ok()).toBeTruthy();

  await page.goto('/catalogue');
  await expect(page.getByText(`Bulk Playwright A ${runId}`).first()).toBeVisible();
  await expect(page.getByText(`Bulk Playwright B ${runId}`).first()).toBeVisible();

  await page.goto('/admin/products');
  await page.getByPlaceholder(/Rechercher par nom/i).fill('');
  await page.locator('select').first().selectOption('ACTIVE');
  await page.getByLabel('Selectionner la page').check();
  await page.getByRole('button', { name: /Selectionner les \d+ resultats filtres/i }).click();
  await page.getByRole('button', { name: /Supprimer tous les produits/i }).click();
  await expect(page.getByText(/produit\(s\).*historique/i)).toBeVisible();
  await page.getByLabel('Confirmation').fill('SUPPRIMER TOUS LES PRODUITS');
  await page.getByRole('button', { name: /^Supprimer$/i }).click();
  await expect(page.getByText(/produit\(s\) traite/i)).toBeVisible();
  await expect(page.getByText('Aucun produit disponible pour le moment.')).toBeVisible();

  await page.goto('/');
  await expect(page.getByText('Aucun produit disponible pour le moment.').first()).toBeVisible();
  await page.goto('/catalogue');
  await expect(page.getByText('Aucun produit disponible pour le moment.')).toBeVisible();
  await expect(page.getByText(`Bulk Playwright A ${runId}`)).toHaveCount(0);
  await loginCustomer(page);
  await page.getByRole('button', { name: 'retours' }).click();
  await expect(page.getByText(product.name).first()).toBeVisible();
});

async function loginCustomer(page: import('@playwright/test').Page) {
  await page.goto('/connexion');
  await page.locator('input[name="email"]').fill(customer.email);
  await page.locator('input[name="password"]').fill(customer.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/compte/);
}

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/connexion');
  await page.locator('input[name="email"]').fill(adminEmail);
  await page.locator('input[name="password"]').fill(adminPassword || '');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/developer|\/admin/);
}

async function loginApi(request: import('@playwright/test').APIRequestContext, email: string, password: string) {
  const response = await request.post(`${apiBase}/auth/login/`, { data: { email, password } });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return { access: data.access as string, refresh: data.refresh as string };
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function safeJson(response: import('@playwright/test').Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function sanitizeResponse(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitizeResponse);
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (/token|access|refresh|password|secret/i.test(key)) {
      output[key] = '[redacted]';
    } else if (typeof item === 'object' && item !== null) {
      output[key] = sanitizeResponse(item);
    } else {
      output[key] = item;
    }
  }
  return output;
}
