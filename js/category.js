// ======================================================
// IMPORTS
// ======================================================

import "./search.js";

import {
  getStores,
  getServiceProviders,
  getCategories,
  getServiceCategories,
} from "./data-service.js";

import { renderStores, stores } from "./stores.js";

import {
  renderServiceProviders,
  serviceProviders,
} from "./service-providers.js";

// ======================================================
// DOM REFERENCES
// ======================================================

const storesSection = document.querySelector("#category-stores");

const providersSection = document.querySelector("#category-providers");

const storeCategoryName = document.querySelector(".stores-category-name");

const providersCategoryName = document.querySelector(
  ".providers-category-name",
);

const emptyStore = document.querySelector(".empty-store");

const emptyProvider = document.querySelector(".empty-provider");

const alternativeStores = document.querySelector(".alternative-stores");

const alternativeProviders = document.querySelector(".alternative-providers");

const categoryTitle = document.querySelector("#category-title");

const categoryDescription = document.querySelector("#category-description");

const exploreType = document.querySelector("#explore-type");

const storeCategoryList = document.querySelector("#store-category-list");

const serviceCategoryList = document.querySelector("#service-category-list");

// ======================================================
// URL / APPLICATION STATE
// ======================================================

const initialParams = new URLSearchParams(window.location.search);

let currentType = initialParams.get("type") || "stores";

let currentCategory = initialParams.get("category");

let currentServiceCategory = initialParams.get("serviceCategory");

// ======================================================
// APPLICATION DATA
// ======================================================

let storesData = [];

let serviceProvidersData = [];

let categoriesData = [];

let serviceCategoriesData = [];

let isCategoryLoading = false;

let hasLoadedData = false;

// ======================================================
// HELPERS
// ======================================================

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function sortByDistance(data) {
  return [...data].sort((a, b) => a.distance - b.distance);
}

function isValidType(type) {
  return type === "stores" || type === "providers";
}

// ======================================================
// URL MANAGEMENT
// ======================================================

function buildCurrentUrl() {
  const params = new URLSearchParams();

  params.set("type", currentType);

  if (currentType === "stores" && currentCategory) {
    params.set("category", currentCategory);
  }

  if (currentType === "providers" && currentServiceCategory) {
    params.set("serviceCategory", currentServiceCategory);
  }

  return `${window.location.pathname}?` + params.toString();
}

function updateUrl({ replace = false } = {}) {
  const url = buildCurrentUrl();

  if (replace) {
    window.history.replaceState(null, "", url);

    return;
  }

  window.history.pushState(null, "", url);
}

function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);

  currentType = params.get("type") || "stores";

  currentCategory = params.get("category");

  currentServiceCategory = params.get("serviceCategory");
}

// ======================================================
// PAGE HEADER
// ======================================================

function updatePageHeader() {
  if (currentType === "stores") {
    categoryTitle.textContent = "Explore Stores";

    categoryDescription.textContent =
      "Discover nearby businesses and shop from stores around you.";

    return;
  }

  if (currentType === "providers") {
    categoryTitle.textContent = "Explore Services";

    categoryDescription.textContent =
      "Find local professionals and services available around you.";

    return;
  }

  categoryTitle.textContent = "Explore";

  categoryDescription.textContent =
    "Find businesses, products, and services around you.";
}

// ======================================================
// LOADING STATE
// ======================================================

function renderLoadingState() {
  const showStores = currentType === "stores";

  const showProviders = currentType === "providers";

  storesSection.style.display = showStores ? "block" : "none";

  providersSection.style.display = showProviders ? "block" : "none";

  if (showStores) {
    storeCategoryName.textContent = "Loading nearby stores...";

    stores.innerHTML = `
      <div
        class="category-data-state"
        aria-live="polite"
      >
        <span
          class="category-loading-spinner"
        ></span>

        <p>
          Finding stores near you...
        </p>
      </div>
    `;
  }

  if (showProviders) {
    providersCategoryName.textContent = "Loading services...";

    serviceProviders.innerHTML = `
      <div
        class="category-data-state"
        aria-live="polite"
      >
        <span
          class="category-loading-spinner"
        ></span>

        <p>
          Finding service providers...
        </p>
      </div>
    `;
  }
}

// ======================================================
// ERROR STATE
// ======================================================

function renderErrorState() {
  const errorMarkup = `
    <div
      class="
        category-data-state
        category-error-state
      "
    >
      <i data-lucide="wifi-off"></i>

      <strong>
        Couldn't load this page
      </strong>

      <p>
        Something went wrong while
        loading LocalLink data.
      </p>

      <button
        type="button"
        data-action="retry-category-data"
      >
        Try again
      </button>
    </div>
  `;

  if (currentType === "stores") {
    storesSection.style.display = "block";

    providersSection.style.display = "none";

    storeCategoryName.textContent = "Stores";

    stores.innerHTML = errorMarkup;
  }

  if (currentType === "providers") {
    storesSection.style.display = "none";

    providersSection.style.display = "block";

    providersCategoryName.textContent = "Service Providers";

    serviceProviders.innerHTML = errorMarkup;
  }

  refreshIcons();
}

// ======================================================
// STORE RENDERING
// ======================================================

function renderStorePage() {
  storesSection.style.display = "block";

  providersSection.style.display = "none";

  if (!currentCategory) {
    emptyStore.style.display = "none";

    alternativeStores.style.display = "none";

    storeCategoryName.textContent = "Nearby Stores";

    renderStores(sortByDistance(storesData));

    return;
  }

  const storesCategory = categoriesData.find(
    (categoryData) => categoryData.id === currentCategory,
  );

  if (!storesCategory) {
    storeCategoryName.textContent = "Category not found";

    emptyStore.style.display = "block";

    emptyStore.textContent = "The store category you requested does not exist.";

    alternativeStores.style.display = "none";

    stores.replaceChildren();

    return;
  }

  storeCategoryName.textContent = storesCategory.name;

  const categoryStores = storesData.filter(
    (store) => store.category === currentCategory,
  );

  if (categoryStores.length > 0) {
    emptyStore.style.display = "none";

    alternativeStores.style.display = "none";

    renderStores(sortByDistance(categoryStores));

    return;
  }

  emptyStore.style.display = "block";

  emptyStore.textContent = `No stores available in ${storesCategory.name}.`;

  alternativeStores.style.display = "block";

  alternativeStores.textContent = "Explore other nearby stores";

  const otherStores = storesData.filter(
    (store) => store.category !== currentCategory,
  );

  renderStores(sortByDistance(otherStores));
}

// ======================================================
// PROVIDER RENDERING
// ======================================================

function renderProviderPage() {
  storesSection.style.display = "none";

  providersSection.style.display = "block";

  if (!currentServiceCategory) {
    emptyProvider.style.display = "none";

    alternativeProviders.style.display = "none";

    providersCategoryName.textContent = "Service Providers";

    renderServiceProviders(sortByDistance(serviceProvidersData));

    return;
  }

  const providerCategory = serviceCategoriesData.find(
    (categoryData) => categoryData.id === currentServiceCategory,
  );

  if (!providerCategory) {
    providersCategoryName.textContent = "Category not found";

    emptyProvider.style.display = "block";

    emptyProvider.textContent =
      "The service category you requested does not exist.";

    alternativeProviders.style.display = "none";

    serviceProviders.replaceChildren();

    return;
  }

  providersCategoryName.textContent = providerCategory.name;

  const categoryProviders = serviceProvidersData.filter(
    (provider) => provider.category === currentServiceCategory,
  );

  if (categoryProviders.length > 0) {
    emptyProvider.style.display = "none";

    alternativeProviders.style.display = "none";

    renderServiceProviders(sortByDistance(categoryProviders));

    return;
  }

  emptyProvider.style.display = "block";

  emptyProvider.textContent = `No providers available in ${providerCategory.name}.`;

  alternativeProviders.style.display = "block";

  alternativeProviders.textContent = "Explore other nearby service providers";

  const otherProviders = serviceProvidersData.filter(
    (provider) => provider.category !== currentServiceCategory,
  );

  renderServiceProviders(sortByDistance(otherProviders));
}

// ======================================================
// INVALID PAGE
// ======================================================

function renderInvalidPage() {
  storesSection.style.display = "none";

  providersSection.style.display = "none";

  categoryTitle.textContent = "Invalid page";

  categoryDescription.textContent =
    "The exploration type you requested does not exist.";
}

// ======================================================
// STORE FILTERS
// ======================================================

function renderStoreCategoryFilters() {
  const fragment = document.createDocumentFragment();

  storeCategoryList.replaceChildren();

  const all = document.createElement("li");

  all.innerHTML = `
    <button
      type="button"
      data-category="all"
    >
      All

      <span class="stores-count">
        (${storesData.length})
      </span>
    </button>
  `;

  fragment.append(all);

  categoriesData.forEach((categoryData) => {
    if (categoryData.id === "services") {
      return;
    }

    const categoryStores = storesData.filter(
      (store) => store.category === categoryData.id,
    );

    const li = document.createElement("li");

    li.innerHTML = `
        <button
          type="button"
          data-category="${categoryData.id}"
        >
          ${categoryData.name}

          <span
            class="stores-count"
          >
            (${categoryStores.length})
          </span>
        </button>
      `;

    fragment.append(li);
  });

  storeCategoryList.append(fragment);
}

// ======================================================
// PROVIDER FILTERS
// ======================================================

function renderProviderCategoryFilters() {
  const fragment = document.createDocumentFragment();

  serviceCategoryList.replaceChildren();

  const all = document.createElement("li");

  all.innerHTML = `
    <button
      type="button"
      data-service-category="all"
    >
      All

      <span class="providers-count">
        (${serviceProvidersData.length})
      </span>
    </button>
  `;

  fragment.append(all);

  serviceCategoriesData.forEach((categoryData) => {
    const categoryProviders = serviceProvidersData.filter(
      (provider) => provider.category === categoryData.id,
    );

    const li = document.createElement("li");

    li.innerHTML = `
        <button
          type="button"
          data-service-category="${categoryData.id}"
        >
          ${categoryData.name}

          <span
            class="providers-count"
          >
            (${categoryProviders.length})
          </span>
        </button>
      `;

    fragment.append(li);
  });

  serviceCategoryList.append(fragment);
}

// ======================================================
// ACTIVE STATES
// ======================================================

function updateActiveStates() {
  const storesTab = document.querySelector("#stores-tab");

  const providersTab = document.querySelector("#providers-tab");

  storesTab.classList.toggle("active", currentType === "stores");

  providersTab.classList.toggle("active", currentType === "providers");

  const activeStoreCategory = currentCategory || "all";

  storeCategoryList.querySelectorAll("[data-category]").forEach((filter) => {
    filter.classList.toggle(
      "active",
      currentType === "stores" &&
        filter.dataset.category === activeStoreCategory,
    );
  });

  const activeServiceCategory = currentServiceCategory || "all";

  serviceCategoryList
    .querySelectorAll("[data-service-category]")
    .forEach((filter) => {
      filter.classList.toggle(
        "active",
        currentType === "providers" &&
          filter.dataset.serviceCategory === activeServiceCategory,
      );
    });
}

// ======================================================
// CENTRAL PAGE RENDER
// ======================================================

function renderCurrentView() {
  updatePageHeader();

  if (currentType === "stores") {
    renderStorePage();
  } else if (currentType === "providers") {
    renderProviderPage();
  } else {
    renderInvalidPage();
  }

  updateActiveStates();

  refreshIcons();
}

// ======================================================
// CHANGE TYPE
// ======================================================

function changeExploreType(selectedType) {
  // Already active:
  // do absolutely nothing.
  if (selectedType === currentType) {
    return;
  }

  currentType = selectedType;

  /*
   * Each side remembers its own
   * category selection.
   *
   * Example:
   *
   * Stores → Electronics
   * Providers → Plumbing
   *
   * Switching back to Stores
   * restores Electronics.
   */

  updateUrl();

  renderCurrentView();
}

// ======================================================
// CHANGE STORE CATEGORY
// ======================================================

function changeStoreCategory(selectedCategory) {
  const normalizedCategory =
    selectedCategory === "all" ? null : selectedCategory;

  // Already active:
  // don't rerender or change history.
  if (currentType === "stores" && normalizedCategory === currentCategory) {
    return;
  }

  currentType = "stores";

  currentCategory = normalizedCategory;

  updateUrl();

  renderCurrentView();
}

// ======================================================
// CHANGE SERVICE CATEGORY
// ======================================================

function changeServiceCategory(selectedCategory) {
  const normalizedCategory =
    selectedCategory === "all" ? null : selectedCategory;

  // Already active:
  // don't rerender or change history.
  if (
    currentType === "providers" &&
    normalizedCategory === currentServiceCategory
  ) {
    return;
  }

  currentType = "providers";

  currentServiceCategory = normalizedCategory;

  updateUrl();

  renderCurrentView();
}

// ======================================================
// LOAD DATA
// ======================================================

async function loadCategoryData() {
  if (isCategoryLoading) {
    return;
  }

  isCategoryLoading = true;

  renderLoadingState();

  try {
    const [
      loadedStores,
      loadedProviders,
      loadedCategories,
      loadedServiceCategories,
    ] = await Promise.all([
      getStores(),
      getServiceProviders(),
      getCategories(),
      getServiceCategories(),
    ]);

    storesData = loadedStores;

    serviceProvidersData = loadedProviders;

    categoriesData = loadedCategories;

    serviceCategoriesData = loadedServiceCategories;

    hasLoadedData = true;

    renderStoreCategoryFilters();

    renderProviderCategoryFilters();

    renderCurrentView();
  } catch (error) {
    console.error("Unable to load category data:", error);

    renderErrorState();
  } finally {
    isCategoryLoading = false;
  }
}

// ======================================================
// EXPLORE TYPE EVENTS
// ======================================================

exploreType.addEventListener("click", (event) => {
  const storesTab = event.target.closest("#stores-tab");

  if (storesTab) {
    changeExploreType("stores");

    return;
  }

  const providersTab = event.target.closest("#providers-tab");

  if (providersTab) {
    changeExploreType("providers");
  }
});

// ======================================================
// STORE CATEGORY EVENTS
// ======================================================

storeCategoryList.addEventListener("click", (event) => {
  const categoryButton = event.target.closest("[data-category]");

  if (!categoryButton) {
    return;
  }

  changeStoreCategory(categoryButton.dataset.category);
});

// ======================================================
// SERVICE CATEGORY EVENTS
// ======================================================

serviceCategoryList.addEventListener("click", (event) => {
  const categoryButton = event.target.closest("[data-service-category]");

  if (!categoryButton) {
    return;
  }

  changeServiceCategory(categoryButton.dataset.serviceCategory);
});

// ======================================================
// BUSINESS EVENTS
// ======================================================

stores.addEventListener("click", (event) => {
  const viewBusinessButton = event.target.closest(
    "[data-action='view-business']",
  );

  if (!viewBusinessButton) {
    return;
  }

  const store = event.target.closest("[data-id]");

  if (!store) {
    return;
  }

  window.location.href =
    "business.html?type=store&id=" + encodeURIComponent(store.dataset.id);
});

serviceProviders.addEventListener("click", (event) => {
  const viewBusinessButton = event.target.closest(
    "[data-action='view-business']",
  );

  if (!viewBusinessButton) {
    return;
  }

  const provider = event.target.closest("[data-id]");

  if (!provider) {
    return;
  }

  window.location.href =
    "business.html?type=provider&id=" + encodeURIComponent(provider.dataset.id);
});

// ======================================================
// RETRY
// ======================================================

document.addEventListener("click", (event) => {
  const retryButton = event.target.closest(
    '[data-action="retry-category-data"]',
  );

  if (!retryButton) {
    return;
  }

  loadCategoryData();
});

// ======================================================
// BROWSER BACK / FORWARD
// ======================================================

window.addEventListener("popstate", () => {
  readStateFromUrl();

  if (!hasLoadedData) {
    return;
  }

  renderCurrentView();
});

// ======================================================
// INITIALIZE
// ======================================================

async function initializeCategory() {
  refreshIcons();

  if (!window.location.search) {
    updateUrl({
      replace: true,
    });
  }

  await loadCategoryData();
}

initializeCategory();
