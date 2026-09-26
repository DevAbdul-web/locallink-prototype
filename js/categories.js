// ============================================================
// IMPORTS
// ============================================================

import { getCategories, getServiceCategories } from "./data-service.js";

// ============================================================
// DOM REFERENCES
// ============================================================

const categories = document.querySelector("#categories");

const serviceCategories = document.querySelector("#service-categories");

// ============================================================
// STATE
// ============================================================

let isServiceCategoriesOpen = false;

let serviceCategoriesData = null;

let isServiceCategoriesLoading = false;

// ============================================================
// CATEGORY RENDERING
// ============================================================

function renderCategories(data) {
  const template = document.querySelector(".category-template");

  const fragment = document.createDocumentFragment();

  categories.replaceChildren();

  data.forEach((categoryData) => {
    const category = template.content.cloneNode(true);

    category.querySelector(".category-icon").textContent = categoryData.icon;

    category.querySelector(".category-name").textContent = categoryData.name;

    category.querySelector(".category-description").textContent =
      categoryData.description;

    category.querySelector(".category-card").dataset.category = categoryData.id;

    fragment.append(category);
  });

  categories.append(fragment);
}

// ============================================================
// SERVICE CATEGORY RENDERING
// ============================================================

function renderServiceCategories(data) {
  const template = document.querySelector(".service-category-template");

  const fragment = document.createDocumentFragment();

  serviceCategories.replaceChildren();

  data.forEach((serviceData) => {
    const serviceCategory = template.content.cloneNode(true);

    serviceCategory.querySelector(
      ".service-category-card",
    ).dataset.serviceCategory = serviceData.id;

    serviceCategory.querySelector(".service-category-icon").textContent =
      serviceData.icon;

    serviceCategory.querySelector(".service-category-name").textContent =
      serviceData.name;

    fragment.append(serviceCategory);
  });

  serviceCategories.append(fragment);
}

// ============================================================
// SERVICE CATEGORY LOADING STATE
// ============================================================

function renderServiceCategoriesLoading() {
  serviceCategories.innerHTML = `
    <div
      class="service-categories-loading"
      aria-live="polite"
    >
      <span
        class="service-categories-spinner"
      ></span>

      <span>
        Loading services...
      </span>
    </div>
  `;
}

// ============================================================
// SERVICE CATEGORY ERROR STATE
// ============================================================

function renderServiceCategoriesError() {
  serviceCategories.innerHTML = `
    <div
      class="service-categories-error"
    >
      <span>
        Couldn't load service categories.
      </span>

      <button
        type="button"
        data-action="retry-service-categories"
      >
        Try again
      </button>
    </div>
  `;
}

// ============================================================
// LOAD MAIN CATEGORIES
// ============================================================

async function loadCategories() {
  try {
    const categoriesData = await getCategories();

    renderCategories(categoriesData);
  } catch (error) {
    console.error("Unable to load categories:", error);

    categories.innerHTML = `
      <div class="categories-error">
        Couldn't load categories.
      </div>
    `;
  }
}

// ============================================================
// LOAD SERVICE CATEGORIES
// ============================================================

async function loadServiceCategories() {
  if (isServiceCategoriesLoading) {
    return;
  }

  // ------------------------------------------
  // USE ALREADY LOADED DATA
  // ------------------------------------------

  if (serviceCategoriesData) {
    renderServiceCategories(serviceCategoriesData);

    return;
  }

  isServiceCategoriesLoading = true;

  renderServiceCategoriesLoading();

  try {
    serviceCategoriesData = await getServiceCategories();

    renderServiceCategories(serviceCategoriesData);
  } catch (error) {
    console.error("Unable to load service categories:", error);

    renderServiceCategoriesError();
  } finally {
    isServiceCategoriesLoading = false;
  }
}

// ============================================================
// OPEN SERVICE CATEGORIES
// ============================================================

async function openServiceCategories(categoryCard) {
  isServiceCategoriesOpen = true;

  categoryCard.hidden = true;

  await loadServiceCategories();
}

// ============================================================
// CLOSE SERVICE CATEGORIES
// ============================================================

function closeServiceCategories() {
  serviceCategories.replaceChildren();

  isServiceCategoriesOpen = false;

  const servicesCategoryCard = document.querySelector(
    '[data-category="services"]',
  );

  if (servicesCategoryCard) {
    servicesCategoryCard.hidden = false;
  }
}

// ============================================================
// CATEGORY EVENTS
// ============================================================

if (categories) {
  categories.addEventListener("click", async (event) => {
    const categoryCard = event.target.closest("[data-category]");

    if (!categoryCard) {
      return;
    }

    const category = categoryCard.dataset.category;

    // ------------------------------------------
    // SERVICES
    // ------------------------------------------

    if (category === "services") {
      if (!isServiceCategoriesOpen) {
        await openServiceCategories(categoryCard);
      } else {
        closeServiceCategories();
      }

      return;
    }

    // ------------------------------------------
    // STORE CATEGORY
    // ------------------------------------------

    window.location.href =
      "category.html?type=stores&category=" + encodeURIComponent(category);
  });
}

// ============================================================
// SERVICE CATEGORY EVENTS
// ============================================================

if (serviceCategories) {
  serviceCategories.addEventListener("click", (event) => {
    // ------------------------------------------
    // RETRY
    // ------------------------------------------

    const retryButton = event.target.closest(
      '[data-action="retry-service-categories"]',
    );

    if (retryButton) {
      loadServiceCategories();

      return;
    }

    // ------------------------------------------
    // OPEN CATEGORY
    // ------------------------------------------

    const serviceCategoryCard = event.target.closest("[data-service-category]");

    if (!serviceCategoryCard) {
      return;
    }

    const serviceCategory = serviceCategoryCard.dataset.serviceCategory;

    window.location.href =
      "category.html?type=providers&serviceCategory=" +
      encodeURIComponent(serviceCategory);
  });
}

// ============================================================
// CLOSE WHEN CLICKING OUTSIDE
// ============================================================

document.addEventListener("click", (event) => {
  if (!isServiceCategoriesOpen) {
    return;
  }

  const servicesCategoryCard = document.querySelector(
    '[data-category="services"]',
  );

  const clickedInsideServicesCard = servicesCategoryCard?.contains(
    event.target,
  );

  const clickedInsideServiceCategories = serviceCategories?.contains(
    event.target,
  );

  if (!clickedInsideServicesCard && !clickedInsideServiceCategories) {
    closeServiceCategories();
  }
});

// ============================================================
// INITIALIZE
// ============================================================

if (categories) {
  loadCategories();
}
