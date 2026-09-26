// =====================================
// SAVED.JS
// =====================================

// ======================================================
// IMPORTS
// ======================================================

import {
  getProducts,
  getServices,
  getStores,
  getServiceProviders,
} from "./data-service.js";

import {
  loadSavedBusinesses,
  saveSavedBusinesses,
  loadSavedProducts,
  saveSavedProducts,
  loadSavedServices,
  saveSavedServices,
} from "./storage.js";

import "./search.js";

// ======================================================
// DOM REFERENCES
// ======================================================

const savedContent = document.querySelector("#saved-content");

const savedEmpty = document.querySelector("#saved-empty");

const savedEmptyMessage = document.querySelector("#saved-empty-message");

const savedTotal = document.querySelector("#saved-total");

const savedFilters = document.querySelector(".saved-filters");

const allCount = document.querySelector("#all-count");

const businessCount = document.querySelector("#business-count");

const productCount = document.querySelector("#product-count");

const serviceCount = document.querySelector("#service-count");

// ======================================================
// PERSISTED USER STATE
// ======================================================

let savedBusinesses = loadSavedBusinesses();

let savedProducts = loadSavedProducts();

let savedServices = loadSavedServices();

// ======================================================
// CATALOGUE STATE
// ======================================================

let stores = [];

let serviceProviders = [];

let products = [];

let services = [];

// ======================================================
// PAGE STATE
// ======================================================

let activeFilter = "all";

let isSavedLoading = false;

// ======================================================
// HELPERS
// ======================================================

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCategory(category = "") {
  return category
    .split("-")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

// ======================================================
// RESOLVE SAVED BUSINESSES
// ======================================================

function getResolvedBusinesses() {
  return savedBusinesses
    .map((savedBusiness) => {
      let business = null;

      if (savedBusiness.type === "store") {
        business = stores.find((store) => store.id === savedBusiness.id);
      }

      if (savedBusiness.type === "provider") {
        business = serviceProviders.find(
          (provider) => provider.id === savedBusiness.id,
        );
      }

      if (!business) {
        return null;
      }

      return {
        ...business,

        savedType: "business",

        businessType: savedBusiness.type,
      };
    })
    .filter(Boolean);
}

// ======================================================
// RESOLVE SAVED PRODUCTS
// ======================================================

function getResolvedProducts() {
  return savedProducts
    .map((savedProduct) => {
      const product = products.find(
        (product) => product.id === savedProduct.id,
      );

      if (!product) {
        return null;
      }

      const store = stores.find((store) => store.id === product.storeId);

      return {
        ...product,

        savedType: "product",

        businessName: store?.name || "Local business",
      };
    })
    .filter(Boolean);
}

// ======================================================
// RESOLVE SAVED SERVICES
// ======================================================

function getResolvedServices() {
  return savedServices
    .map((savedService) => {
      const service = services.find(
        (service) => service.id === savedService.id,
      );

      if (!service) {
        return null;
      }

      const provider = serviceProviders.find(
        (provider) => provider.id === service.providerId,
      );

      return {
        ...service,

        savedType: "service",

        businessName: provider?.name || "Local provider",
      };
    })
    .filter(Boolean);
}

// ======================================================
// COUNTS
// ======================================================

function updateCounts() {
  const businesses = getResolvedBusinesses();

  const resolvedProducts = getResolvedProducts();

  const resolvedServices = getResolvedServices();

  const total =
    businesses.length + resolvedProducts.length + resolvedServices.length;

  savedTotal.textContent = `${total} ${
    total === 1 ? "saved item" : "saved items"
  }`;

  allCount.textContent = total;

  businessCount.textContent = businesses.length;

  productCount.textContent = resolvedProducts.length;

  serviceCount.textContent = resolvedServices.length;
}

// ======================================================
// BUSINESS CARD
// ======================================================

function createBusinessCard(business) {
  const article = document.createElement("article");

  article.className = "saved-card saved-business-card";

  const statusAvailable =
    business.businessType === "store" ? business.isOpen : business.isAvailable;

  const statusText =
    business.businessType === "store"
      ? business.isOpen
        ? "Open now"
        : "Closed"
      : business.isAvailable
        ? "Available"
        : "Unavailable";

  article.innerHTML = `
    <button
      type="button"
      class="saved-remove-button"
      data-action="remove-business"
      data-id="${business.id}"
      data-business-type="${business.businessType}"
      aria-label="Remove ${business.name} from saved"
    >
      <i data-lucide="heart"></i>
    </button>


    <button
      type="button"
      class="saved-card-link"
      data-action="open-business"
      data-id="${business.id}"
      data-business-type="${business.businessType}"
    >

      <div
        class="saved-card-image-wrapper"
      >

        <img
          src="${business.image}"
          alt="${business.name}"
          class="saved-card-image"
        />

        <span
          class="
            saved-status
            ${statusAvailable ? "available" : ""}
          "
        >
          ${statusText}
        </span>

      </div>


      <div class="saved-card-body">

        <span
          class="saved-card-type"
        >
          ${
            business.businessType === "store"
              ? "Local Store"
              : "Service Provider"
          }
        </span>

        <h2>
          ${business.name}
        </h2>

        <p
          class="saved-card-category"
        >
          ${formatCategory(business.category)}
        </p>


        <div class="saved-card-meta">

          <span>
            <i data-lucide="star"></i>

            ${business.rating}
          </span>

          <span>
            <i data-lucide="map-pin"></i>

            ${business.distance} km
          </span>

        </div>


        <div
          class="saved-card-business"
        >

          <i data-lucide="map-pin"></i>

          <span>
            ${business.location}
          </span>

        </div>

      </div>

    </button>
  `;

  return article;
}

// ======================================================
// PRODUCT CARD
// ======================================================

function createProductCard(product) {
  const article = document.createElement("article");

  article.className = "saved-card saved-product-card";

  article.innerHTML = `
    <button
      type="button"
      class="saved-remove-button"
      data-action="remove-product"
      data-id="${product.id}"
      aria-label="Remove ${product.name} from saved"
    >
      <i data-lucide="heart"></i>
    </button>


    <button
      type="button"
      class="saved-card-link"
      data-action="open-product"
      data-id="${product.id}"
    >

      <div
        class="saved-card-image-wrapper"
      >

        <img
          src="${product.image}"
          alt="${product.name}"
          class="saved-card-image"
        />

      </div>


      <div class="saved-card-body">

        <span
          class="saved-card-type"
        >
          Product
        </span>

        <h2>
          ${product.name}
        </h2>

        <strong
          class="saved-card-price"
        >
          ${formatCurrency(product.price)}
        </strong>


        <div
          class="saved-card-business"
        >

          <i data-lucide="store"></i>

          <span>
            ${product.businessName}
          </span>

        </div>

      </div>

    </button>
  `;

  return article;
}

// ======================================================
// SERVICE CARD
// ======================================================

function createServiceCard(service) {
  const article = document.createElement("article");

  article.className = "saved-card saved-service-card";

  const price =
    service.pricingType === "starting-from"
      ? `From ${formatCurrency(service.price)}`
      : formatCurrency(service.price);

  article.innerHTML = `
    <button
      type="button"
      class="saved-remove-button"
      data-action="remove-service"
      data-id="${service.id}"
      aria-label="Remove ${service.name} from saved"
    >
      <i data-lucide="heart"></i>
    </button>


    <button
      type="button"
      class="saved-card-link"
      data-action="open-service"
      data-id="${service.id}"
    >

      <div
        class="saved-card-image-wrapper"
      >

        <img
          src="${service.image}"
          alt="${service.name}"
          class="saved-card-image"
        />

      </div>


      <div class="saved-card-body">

        <span
          class="saved-card-type"
        >
          Service
        </span>

        <h2>
          ${service.name}
        </h2>

        <strong
          class="saved-card-price"
        >
          ${price}
        </strong>


        <div
          class="saved-card-business"
        >

          <i
            data-lucide="briefcase-business"
          ></i>

          <span>
            ${service.businessName}
          </span>

        </div>

      </div>

    </button>
  `;

  return article;
}

// ======================================================
// EMPTY STATE
// ======================================================

function renderEmptyState() {
  savedContent.replaceChildren();

  savedEmpty.hidden = false;

  if (activeFilter === "business") {
    savedEmptyMessage.textContent = "Businesses you save will appear here.";
  }

  if (activeFilter === "product") {
    savedEmptyMessage.textContent = "Products you save will appear here.";
  }

  if (activeFilter === "service") {
    savedEmptyMessage.textContent = "Services you save will appear here.";
  }

  if (activeFilter === "all") {
    savedEmptyMessage.textContent =
      "Save businesses, products and services while exploring LocalLink and they will appear here.";
  }

  refreshIcons();
}

// ======================================================
// SECTION
// ======================================================

function createSection(title, subtitle, items, createCard) {
  const section = document.createElement("section");

  section.className = "saved-section";

  const heading = document.createElement("div");

  heading.className = "saved-section-heading";

  heading.innerHTML = `
    <div>

      <span>
        ${subtitle}
      </span>

      <h2>
        ${title}
      </h2>

    </div>

    <span
      class="saved-section-count"
    >
      ${items.length}
    </span>
  `;

  const grid = document.createElement("div");

  grid.className = "saved-grid";

  items.forEach((item) => {
    grid.append(createCard(item));
  });

  section.append(heading, grid);

  return section;
}

// ======================================================
// RENDER SAVED
// ======================================================

function renderSaved() {
  const businesses = getResolvedBusinesses();

  const resolvedProducts = getResolvedProducts();

  const resolvedServices = getResolvedServices();

  savedContent.replaceChildren();

  savedEmpty.hidden = true;

  let hasContent = false;

  // --------------------------
  // BUSINESSES
  // --------------------------

  if (
    (activeFilter === "all" || activeFilter === "business") &&
    businesses.length > 0
  ) {
    savedContent.append(
      createSection(
        "Businesses",
        "Places worth returning to",
        businesses,
        createBusinessCard,
      ),
    );

    hasContent = true;
  }

  // --------------------------
  // PRODUCTS
  // --------------------------

  if (
    (activeFilter === "all" || activeFilter === "product") &&
    resolvedProducts.length > 0
  ) {
    savedContent.append(
      createSection(
        "Products",
        "Items you liked",
        resolvedProducts,
        createProductCard,
      ),
    );

    hasContent = true;
  }

  // --------------------------
  // SERVICES
  // --------------------------

  if (
    (activeFilter === "all" || activeFilter === "service") &&
    resolvedServices.length > 0
  ) {
    savedContent.append(
      createSection(
        "Services",
        "Services to revisit",
        resolvedServices,
        createServiceCard,
      ),
    );

    hasContent = true;
  }

  if (!hasContent) {
    renderEmptyState();

    return;
  }

  refreshIcons();
}

// ======================================================
// LOADING STATE
// ======================================================

function renderSavedLoading() {
  savedEmpty.hidden = true;

  savedContent.innerHTML = `
    <section
      class="saved-data-state"
    >

      <span
        class="saved-loading-spinner"
      ></span>

      <strong>
        Loading your saved items...
      </strong>

      <p>
        Getting the latest information
        for your saved businesses,
        products and services.
      </p>

    </section>
  `;
}

// ======================================================
// ERROR STATE
// ======================================================

function renderSavedError() {
  savedEmpty.hidden = true;

  savedContent.innerHTML = `
    <section
      class="
        saved-data-state
        saved-error-state
      "
    >

      <i data-lucide="wifi-off"></i>

      <strong>
        Couldn't load saved items
      </strong>

      <p>
        Something went wrong while
        loading the latest information.
      </p>

      <button
        type="button"
        data-action="retry-saved"
      >
        Try again
      </button>

    </section>
  `;

  refreshIcons();
}

// ======================================================
// REMOVE SAVED BUSINESS
// ======================================================

function removeBusiness(businessType, businessId) {
  savedBusinesses = savedBusinesses.filter((business) => {
    return !(business.type === businessType && business.id === businessId);
  });

  saveSavedBusinesses(savedBusinesses);

  updatePage();
}

// ======================================================
// REMOVE SAVED PRODUCT
// ======================================================

function removeProduct(productId) {
  savedProducts = savedProducts.filter((product) => product.id !== productId);

  saveSavedProducts(savedProducts);

  updatePage();
}

// ======================================================
// REMOVE SAVED SERVICE
// ======================================================

function removeService(serviceId) {
  savedServices = savedServices.filter((service) => service.id !== serviceId);

  saveSavedServices(savedServices);

  updatePage();
}

// ======================================================
// FILTERS
// ======================================================

function changeFilter(filter) {
  activeFilter = filter;

  const filterButtons = savedFilters.querySelectorAll("[data-filter]");

  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === activeFilter);
  });

  renderSaved();
}

// ======================================================
// SAVED ACTIONS
// ======================================================

function handleSavedAction(event) {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    return;
  }

  const action = actionButton.dataset.action;

  // --------------------------
  // RETRY
  // --------------------------

  if (action === "retry-saved") {
    loadSavedCatalogue();

    return;
  }

  const id = Number(actionButton.dataset.id);

  if (!id) {
    return;
  }

  // --------------------------
  // OPEN BUSINESS
  // --------------------------

  if (action === "open-business") {
    const businessType = actionButton.dataset.businessType;

    window.location.href = `./business.html?type=${businessType}&id=${id}`;

    return;
  }

  // --------------------------
  // OPEN PRODUCT
  // --------------------------

  if (action === "open-product") {
    window.location.href = `./product.html?id=${id}`;

    return;
  }

  // --------------------------
  // OPEN SERVICE
  // --------------------------

  if (action === "open-service") {
    window.location.href = `./service.html?id=${id}`;

    return;
  }

  // --------------------------
  // REMOVE BUSINESS
  // --------------------------

  if (action === "remove-business") {
    const businessType = actionButton.dataset.businessType;

    removeBusiness(businessType, id);

    return;
  }

  // --------------------------
  // REMOVE PRODUCT
  // --------------------------

  if (action === "remove-product") {
    removeProduct(id);

    return;
  }

  // --------------------------
  // REMOVE SERVICE
  // --------------------------

  if (action === "remove-service") {
    removeService(id);
  }
}

// ======================================================
// EVENT LISTENERS
// ======================================================

function attachEventListeners() {
  savedFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");

    if (!button) {
      return;
    }

    changeFilter(button.dataset.filter);
  });

  savedContent.addEventListener("click", handleSavedAction);
}

// ======================================================
// UPDATE PAGE
// ======================================================

function updatePage() {
  updateCounts();

  renderSaved();
}

// ======================================================
// LOAD CATALOGUE DATA
// ======================================================

async function loadSavedCatalogue() {
  if (isSavedLoading) {
    return;
  }

  isSavedLoading = true;

  renderSavedLoading();

  try {
    const [loadedStores, loadedProviders, loadedProducts, loadedServices] =
      await Promise.all([
        getStores(),
        getServiceProviders(),
        getProducts(),
        getServices(),
      ]);

    stores = loadedStores;

    serviceProviders = loadedProviders;

    products = loadedProducts;

    services = loadedServices;

    updatePage();
  } catch (error) {
    console.error("Unable to load saved items:", error);

    renderSavedError();
  } finally {
    isSavedLoading = false;
  }
}

// ======================================================
// INITIALIZE
// ======================================================

function initializeSavedPage() {
  attachEventListeners();

  refreshIcons();

  loadSavedCatalogue();
}

initializeSavedPage();
