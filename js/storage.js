// storage.js

export function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

export function loadCart() {
  try {
    const savedCart = localStorage.getItem("cart");
    return JSON.parse(savedCart) || [];
  } catch (error) {
    console.log(error.message);
    return [];
  }
}

export function saveSavedBusinesses(savedBusinesses) {
  localStorage.setItem("savedBusinesses", JSON.stringify(savedBusinesses));
}

export function loadSavedBusinesses() {
  try {
    const savedBusinesses = localStorage.getItem("savedBusinesses");
    return JSON.parse(savedBusinesses) || [];
  } catch (error) {
    console.log(error.message);
    return [];
  }
}

export function saveSavedProducts(savedProducts) {
  localStorage.setItem("savedProducts", JSON.stringify(savedProducts));
}

export function loadSavedProducts() {
  try {
    const savedProducts = localStorage.getItem("savedProducts");

    return JSON.parse(savedProducts) || [];
  } catch (error) {
    console.log(error.message);
    return [];
  }
}

export function saveSavedServices(savedServices) {
  localStorage.setItem("savedServices", JSON.stringify(savedServices));
}

export function loadSavedServices() {
  try {
    const savedServices = localStorage.getItem("savedServices");
    return JSON.parse(savedServices) || [];
  } catch (error) {
    console.log(error.message);
    return [];
  }
}

// ======================================================
// PRODUCT ORDERS
// ======================================================

export function saveOrders(orders) {
  localStorage.setItem("localLinkOrders", JSON.stringify(orders));
}

export function loadOrders() {
  try {
    const savedOrders = localStorage.getItem("localLinkOrders");

    return JSON.parse(savedOrders) || [];
  } catch (error) {
    console.log(error.message);

    return [];
  }
}

// ======================================================
// SERVICE REQUESTS
// ======================================================

const SERVICE_REQUEST_STORAGE_KEY = "localLinkServiceRequests";

export function saveServiceRequests(requests) {
  localStorage.setItem(SERVICE_REQUEST_STORAGE_KEY, JSON.stringify(requests));
}

export function loadServiceRequests() {
  try {
    const storedRequests = localStorage.getItem(SERVICE_REQUEST_STORAGE_KEY);

    if (!storedRequests) {
      return [];
    }

    const parsedRequests = JSON.parse(storedRequests);

    return Array.isArray(parsedRequests) ? parsedRequests : [];
  } catch (error) {
    console.error("Unable to load service requests:", error);

    return [];
  }
}
// ======================================================
// USER PROFILE
// ======================================================

export function saveUserProfile(userProfile) {
  localStorage.setItem("localLinkUserProfile", JSON.stringify(userProfile));
}

export function loadUserProfile() {
  try {
    const savedProfile = localStorage.getItem("localLinkUserProfile");

    return savedProfile ? JSON.parse(savedProfile) : null;
  } catch (error) {
    console.log(error.message);

    return null;
  }
}
