// ======================================================
// DATA IMPORTS
// ======================================================

import {
  storesData,
  productsData,
  serviceProvidersData,
  servicesData,
  categoriesData,
  serviceCategoriesData,
  reviewsData,
  productReviewsData,
  serviceReviewsData,
} from "./data.js";

// ======================================================
// MOCK API CONFIGURATION
// ======================================================

const MIN_DELAY = 250;
const MAX_DELAY = 650;

// ======================================================
// INTERNAL HELPERS
// ======================================================

function createDelay() {
  const delay =
    Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;

  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

async function simulateRequest(data) {
  await createDelay();

  return data;
}

// ======================================================
// STORES
// ======================================================

export async function getStores() {
  const stores = await simulateRequest(storesData);

  return stores;
}

export async function getStoreById(id) {
  const stores = await getStores();

  const store = stores.find((store) => store.id === Number(id));

  return store || null;
}

// ======================================================
// PRODUCTS
// ======================================================

export async function getProducts() {
  const products = await simulateRequest(productsData);

  return products;
}

export async function getProductById(id) {
  const products = await getProducts();

  const product = products.find((product) => product.id === Number(id));

  return product || null;
}

// ======================================================
// STORE PRODUCTS
// ======================================================

export async function getProductsByStoreId(storeId) {
  const products = await getProducts();

  return products.filter((product) => product.storeId === Number(storeId));
}

// ======================================================
// SERVICE PROVIDERS
// ======================================================

export async function getServiceProviders() {
  const providers = await simulateRequest(serviceProvidersData);

  return providers;
}

export async function getServiceProviderById(id) {
  const providers = await getServiceProviders();

  const provider = providers.find((provider) => provider.id === Number(id));

  return provider || null;
}

// ======================================================
// SERVICES
// ======================================================

export async function getServices() {
  const services = await simulateRequest(servicesData);

  return services;
}

export async function getServiceById(id) {
  const services = await getServices();

  const service = services.find((service) => service.id === Number(id));

  return service || null;
}

// ======================================================
// PROVIDER SERVICES
// ======================================================

export async function getServicesByProviderId(providerId) {
  const services = await getServices();

  return services.filter(
    (service) => service.providerId === Number(providerId),
  );
}

// ======================================================
// ALL BUSINESSES
// ======================================================

export async function getBusinesses() {
  const [stores, providers] = await Promise.all([
    getStores(),
    getServiceProviders(),
  ]);

  const storeBusinesses = stores.map((store) => ({
    ...store,

    businessType: "store",
  }));

  const providerBusinesses = providers.map((provider) => ({
    ...provider,

    businessType: "provider",
  }));

  return [...storeBusinesses, ...providerBusinesses];
}

// ======================================================
// BUSINESS BY TYPE + ID
// ======================================================

export async function getBusinessById(type, id) {
  if (type === "store") {
    return getStoreById(id);
  }

  if (type === "provider") {
    return getServiceProviderById(id);
  }

  return null;
}

// ======================================================
// CATEGORIES
// ======================================================

export async function getCategories() {
  const categories = await simulateRequest(categoriesData);

  return categories;
}

export async function getServiceCategories() {
  const categories = await simulateRequest(serviceCategoriesData);

  return categories;
}

// ======================================================
// REVIEWS
// ======================================================

export async function getReviews() {
  return simulateRequest(reviewsData);
}

export async function getReviewsByBusiness(businessType, businessId) {
  const reviews = await getReviews();

  return reviews.filter(
    (review) =>
      review.businessType === businessType &&
      review.businessId === Number(businessId),
  );
}

// ======================================================
// PRODUCT REVIEWS
// ======================================================

export async function getProductReviews() {
  return simulateRequest(productReviewsData);
}

export async function getProductReviewsByProductId(productId) {
  const reviews = await getProductReviews();

  return reviews.filter((review) => review.productId === Number(productId));
}

// ======================================================
// SERVICE REVIEWS
// ======================================================

export async function getServiceReviews() {
  return simulateRequest(serviceReviewsData);
}

export async function getServiceReviewsByServiceId(serviceId) {
  const reviews = await getServiceReviews();

  return reviews.filter((review) => review.serviceId === Number(serviceId));
}
