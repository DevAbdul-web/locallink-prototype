import {
  getStoreById,
  getServiceProviderById,
  getProductsByStoreId,
  getServicesByProviderId,
  getReviewsByBusiness,
} from "./data-service.js";

import "./search.js";

import { initializeCartUI, updateCartCount } from "./cart-ui.js";

import {
  loadSavedBusinesses,
  saveSavedBusinesses,
  loadSavedProducts,
  saveSavedProducts,
  loadSavedServices,
  saveSavedServices,
  loadCart,
  saveCart,
} from "./storage.js";
// ======================================================
// DOM REFERENCES
// ======================================================

// Main business content

const businessContent = document.querySelector(".business-content");
const businessInfoCard = document.querySelector(".business-info-card");

// Business identity

const businessName = document.querySelector("#business-name");
const businessCategory = document.querySelector("#business-category");
const businessRating = document.querySelector("#business-rating");
const businessReviewsCount = document.querySelector("#business-reviews-count");
const businessDistance = document.querySelector("#business-distance");
const businessLocation = document.querySelector("#business-location");
const businessDescription = document.querySelector("#business-description");

// Gallery

const businessMainImage = document.querySelector("#business-main-image");
const businessGalleryGrid = document.querySelector("#business-gallery-grid");

const galleryCurrentImage = document.querySelector(".gallery-current-image");
const galleryViewer = document.querySelector("#gallery-viewer");
const galleryViewerImage = document.querySelector("#gallery-viewer-image");
const galleryCounter = document.querySelector("#gallery-counter");
const galleryPrevious = document.querySelector("#gallery-previous");
const galleryNext = document.querySelector("#gallery-next");
const galleryClose = document.querySelector("#gallery-close");
const galleryThumbnails = document.querySelector("#gallery-thumbnails");

// Business status / information

const businessStatus = document.querySelector("#business-status");
const businessStatusDot = document.querySelector("#business-status-dot");

const businessOpeningHours = document.querySelector("#business-opening-hours");
const openingHoursToggle = document.querySelector("#opening-hours-toggle");

const businessPhoneNumber = document.querySelector("#business-phone");
const businessEmail = document.querySelector("#business-email");
const businessAddress = document.querySelector("#business-address");

const businessDelivery = document.querySelector("#business-delivery");
const businessDeliveryLabel = document.querySelector(
  "#business-delivery-label",
);

// Products

const businessProducts = document.querySelector("#business-products");
const businessProductEmpty = document.querySelector("#business-products-empty");
const loadMoreProductsButton = document.querySelector("#load-more-products");

// Services

const businessServices = document.querySelector("#business-services");
const businessServicesEmpty = document.querySelector(
  "#business-services-empty",
);
const loadMoreServicesButton = document.querySelector("#load-more-services");

// Tabs

const businessTabs = document.querySelector(".business-tabs");
const businessPrimaryContents = document.querySelector(
  ".business-primary-content",
);

// Reviews

const businessReviewsContainer = document.querySelector("#business-reviews");
const businessReviewsEmpty = document.querySelector("#business-reviews-empty");

// About

const businessAbout = document.querySelector("#business-about");

// Save / share

const businessIdentityAction = document.querySelector(
  ".business-identity-actions",
);

const businessSave = businessIdentityAction.querySelector(
  "[data-action='save-business']",
);

const businessSaveSpan = businessSave.querySelector("span");

const businessShare = businessIdentityAction.querySelector(
  "[data-action='share-business']",
);

const businessShareSpan = businessShare.querySelector("span");

// Mobile

const mobileBusinessLayout = window.matchMedia("(max-width: 700px)");

const mobileBusinessInfoToggle = document.querySelector(
  ".mobile-business-info-toggle",
);

// ======================================================
// URL / BUSINESS DATA
// ======================================================

const params = new URLSearchParams(window.location.search);

const type = params.get("type");
const businessId = Number(params.get("id"));

const validBusinessType = type === "store" || type === "provider";

let business = null;

let isBusinessLoading = false;

// ======================================================
// STATE
// ======================================================

const ITEMS_PER_PAGE = 10;

let visibleProductCount = ITEMS_PER_PAGE;
let visibleServiceCount = ITEMS_PER_PAGE;

let currentImageIndex = 0;
let openingHoursExpanded = false;

let savedBusinesses = loadSavedBusinesses();
let savedProducts = loadSavedProducts();
let savedServices = loadSavedServices();

let cart = loadCart();

let allBusinessImages = [];
let allOpeningHours = [];
let visibleOpeningHours = [];

let businessProductsData = [];
let businessServicesData = [];
let businessReviews = [];

let touchStartX = 0;
let touchStartY = 0;

// ======================================================
// HELPERS
// ======================================================

function formatCategory(category) {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function refreshIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

function showBusinessLoading() {
  const loading = document.createElement("div");

  loading.className = "business-loading-overlay";

  loading.id = "business-loading-state";

  loading.innerHTML = `
    <span
      class="business-loading-spinner"
    ></span>

    <strong>
      Loading business...
    </strong>

    <p>
      Getting the latest business
      information.
    </p>
  `;

  businessContent.classList.add("business-is-loading");

  businessContent.append(loading);
}

function hideBusinessLoading() {
  document.querySelector("#business-loading-state")?.remove();

  businessContent.classList.remove("business-is-loading");
}

function showBusinessLoadError() {
  hideBusinessLoading();

  const error = document.createElement("div");

  error.className = "business-loading-overlay business-error-overlay";

  error.id = "business-error-state";

  error.innerHTML = `
    <i data-lucide="wifi-off"></i>

    <strong>
      Couldn't load business
    </strong>

    <p>
      Something went wrong while
      loading this business.
    </p>

    <button
      type="button"
      data-action="retry-business"
    >
      Try again
    </button>
  `;

  businessContent.classList.add("business-is-loading");

  businessContent.append(error);

  refreshIcons();
}

function hideBusinessLoadError() {
  document.querySelector("#business-error-state")?.remove();

  businessContent.classList.remove("business-is-loading");
}

// ======================================================
// NOT FOUND
// ======================================================

function renderBusinessNotFound() {
  businessContent.innerHTML = `
    <section class="business-not-found">
      <i data-lucide="store"></i>

      <h1>Business not found</h1>

      <p>
        The business you are looking for could not be found.
      </p>

      <a href="./category.html">
        Explore Local Businesses
      </a>
    </section>
  `;

  refreshIcons();
}

// ======================================================
// BUSINESS DATA
// ======================================================

async function prepareBusinessData() {
  const requests = [];

  if (type === "store") {
    requests.push(getProductsByStoreId(businessId));
  } else {
    requests.push(Promise.resolve([]));
  }

  if (type === "provider") {
    requests.push(getServicesByProviderId(businessId));
  } else {
    requests.push(Promise.resolve([]));
  }

  requests.push(getReviewsByBusiness(type, businessId));

  const [products, services, reviews] = await Promise.all(requests);

  businessProductsData = products;

  businessServicesData = services;

  businessReviews = reviews;

  allBusinessImages = [business.image, ...(business.images || [])].filter(
    Boolean,
  );

  allOpeningHours = Object.entries(business.openingHours || {});

  visibleOpeningHours = allOpeningHours.slice(0, 3);
}

// ======================================================
// BUSINESS IDENTITY
// ======================================================

function renderBusinessIdentity() {
  businessName.textContent = business.name;

  businessCategory.textContent = formatCategory(business.category);

  businessRating.textContent = business.rating;

  businessReviewsCount.textContent = `(${business.reviewCount} reviews)`;

  businessDistance.textContent = `${business.distance} km`;

  businessLocation.textContent = business.location;

  businessDescription.textContent = business.description;

  document.title = `${business.name} | LocalLink`;
}

// ======================================================
// BUSINESS INFORMATION
// ======================================================

function renderBusinessInformation() {
  businessPhoneNumber.textContent = business.phone;
  businessEmail.textContent = business.email;
  businessAddress.textContent = business.address;

  if (type === "store") {
    businessDeliveryLabel.textContent = "Delivery";

    businessDelivery.textContent = business.fulfillment.deliveryAvailable
      ? "Delivery Available"
      : "Delivery Unavailable";

    businessStatus.textContent = business.isOpen
      ? `Open Now • Closes: ${business.closingTime}`
      : "Closed";
  } else {
    businessDeliveryLabel.textContent = "Service Area";

    businessDelivery.textContent = business.serviceArea;

    businessStatus.textContent = business.isAvailable
      ? "Available"
      : "Unavailable";
  }

  const isAvailable = type === "store" ? business.isOpen : business.isAvailable;

  businessStatusDot.classList.toggle("available", isAvailable);

  businessStatusDot.classList.toggle("unavailable", !isAvailable);
}

// ======================================================
// BUSINESS GALLERY
// ======================================================

function renderBusinessGallery() {
  businessMainImage.src = business.image;
  businessMainImage.alt = business.name;

  businessGalleryGrid.replaceChildren();
  galleryThumbnails.replaceChildren();

  const galleryFragment = document.createDocumentFragment();

  const thumbnailFragment = document.createDocumentFragment();

  const visibleGalleryImages = (business.images || []).slice(0, 4);

  const remainingPhotos =
    (business.images || []).length - visibleGalleryImages.length;

  visibleGalleryImages.forEach((image, index) => {
    const wrapper = document.createElement("div");

    wrapper.classList.add("business-gallery-item");
    wrapper.dataset.index = index + 1;

    wrapper.innerHTML = `
      <img
        src="${image}"
        alt="${business.name}"
      />

      ${
        index === visibleGalleryImages.length - 1 && remainingPhotos > 0
          ? `
            <button
              type="button"
              class="gallery-more-button"
            >
              +${remainingPhotos} Photos
            </button>
          `
          : ""
      }
    `;

    galleryFragment.append(wrapper);
  });

  allBusinessImages.forEach((image, index) => {
    const thumbnail = document.createElement("img");

    thumbnail.src = image;
    thumbnail.alt = `${business.name} image ${index + 1}`;

    thumbnail.dataset.index = index;

    thumbnailFragment.append(thumbnail);
  });

  businessGalleryGrid.append(galleryFragment);
  galleryThumbnails.append(thumbnailFragment);
}

function updateGalleryThumbnails() {
  const thumbnails = galleryThumbnails.querySelectorAll("img");

  thumbnails.forEach((thumbnail) => {
    thumbnail.classList.toggle(
      "active",
      Number(thumbnail.dataset.index) === currentImageIndex,
    );
  });

  const activeThumbnail = galleryThumbnails.querySelector(
    `[data-index="${currentImageIndex}"]`,
  );

  activeThumbnail?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "nearest",
  });
}

function updateGalleryCounter() {
  galleryCounter.textContent = `${currentImageIndex + 1} / ${allBusinessImages.length}`;
}

function openGallery(index) {
  currentImageIndex = index;

  galleryViewerImage.src = allBusinessImages[currentImageIndex];

  galleryViewerImage.alt = business.name;

  updateGalleryCounter();
  updateGalleryThumbnails();

  galleryViewer.hidden = false;
}

function closeGallery() {
  galleryViewer.hidden = true;
}

function changeGalleryImage(targetIndex) {
  if (targetIndex === currentImageIndex) return;

  if (targetIndex < 0 || targetIndex >= allBusinessImages.length) {
    return;
  }

  const movingBackward = targetIndex < currentImageIndex;

  const incomingStartPosition = movingBackward ? "-100%" : "100%";

  const currentExitPosition = movingBackward ? "100%" : "-100%";

  const incomingImage = document.createElement("img");

  incomingImage.classList.add("gallery-incoming-image");

  incomingImage.src = allBusinessImages[targetIndex];

  incomingImage.alt = business.name;

  incomingImage.style.transform = `translateX(${incomingStartPosition})`;

  galleryCurrentImage.append(incomingImage);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      galleryViewerImage.style.transform = `translateX(${currentExitPosition})`;

      incomingImage.style.transform = "translateX(0)";
    });
  });

  incomingImage.addEventListener(
    "transitionend",
    () => {
      currentImageIndex = targetIndex;

      galleryViewerImage.style.transition = "none";

      galleryViewerImage.src = allBusinessImages[currentImageIndex];

      galleryViewerImage.style.transform = "translateX(0)";

      galleryViewerImage.offsetWidth;

      incomingImage.remove();

      galleryViewerImage.style.transition = "";

      updateGalleryCounter();
      updateGalleryThumbnails();
    },
    { once: true },
  );
}

function showNextGalleryImage() {
  if (currentImageIndex < allBusinessImages.length - 1) {
    changeGalleryImage(currentImageIndex + 1);
  }
}

function showPreviousGalleryImage() {
  if (currentImageIndex > 0) {
    changeGalleryImage(currentImageIndex - 1);
  }
}

// ======================================================
// OPENING HOURS
// ======================================================

function renderOpeningHours(hours) {
  const fragment = document.createDocumentFragment();

  businessOpeningHours.replaceChildren();

  hours.forEach(([day, time]) => {
    const row = document.createElement("div");

    row.classList.add("opening-hour-row");

    row.innerHTML = `
      <span class="opening-day">
        ${formatCategory(day)}
      </span>

      <span class="opening-time">
        ${time}
      </span>
    `;

    fragment.append(row);
  });

  businessOpeningHours.append(fragment);
}

function toggleOpeningHours() {
  openingHoursExpanded = !openingHoursExpanded;

  renderOpeningHours(
    openingHoursExpanded ? allOpeningHours : visibleOpeningHours,
  );

  openingHoursToggle.textContent = openingHoursExpanded
    ? "Show less"
    : "See all";
}

// ======================================================
// PRODUCTS
// ======================================================

function productHasVariants(product) {
  if (!product.variants) {
    return false;
  }

  return Object.values(product.variants).some((options) => {
    return Array.isArray(options) && options.length > 0;
  });
}

function getProductCartQuantity(productId) {
  return cart.reduce((totalQuantity, cartItem) => {
    const cartProductId = cartItem.productId ?? cartItem.id;

    if (cartProductId !== productId) {
      return totalQuantity;
    }

    return totalQuantity + (Number(cartItem.quantity) || 1);
  }, 0);
}

function renderProductCartButton(button, product) {
  if (!button) {
    return;
  }

  button.dataset.id = product.id;

  /*
    Products with variants should not be added directly
    from the Business page because the customer has not
    selected the required options yet.

    They are sent to Product Details instead.
  */
  if (productHasVariants(product)) {
    button.dataset.action = "choose-options";

    button.classList.remove("in-cart");

    button.innerHTML = `
      <span>Choose Options</span>
      <i data-lucide="arrow-right"></i>
    `;

    return;
  }

  button.dataset.action = "add-to-cart";

  const quantityInCart = getProductCartQuantity(product.id);

  if (quantityInCart > 0) {
    button.classList.add("in-cart");

    button.innerHTML = `
      <i data-lucide="check"></i>
      <span>In Cart (${quantityInCart})</span>
    `;

    return;
  }

  button.classList.remove("in-cart");

  button.innerHTML = `
    <i data-lucide="shopping-cart"></i>
    <span>Add to Cart</span>
  `;
}

function renderProducts(products) {
  const fragment = document.createDocumentFragment();

  const template = document.querySelector("#business-product-template");

  businessProducts.replaceChildren();

  if (products.length === 0) {
    businessProductEmpty.hidden = false;
    return;
  }

  businessProductEmpty.hidden = true;

  products.forEach((product) => {
    const card = template.content.cloneNode(true);

    const image = card.querySelector(".business-item-image");

    image.src = product.image;
    image.alt = product.name;

    card.querySelector(".business-item-name").textContent = product.name;

    card.querySelector(".business-item-price").textContent = formatCurrency(
      product.price,
    );

    card.querySelector(".business-item-availability").textContent =
      formatCategory(product.availability);

    // --------------------------
    // SAVE PRODUCT
    // --------------------------

    const saveButton = card.querySelector(".item-save-button");

    if (saveButton) {
      saveButton.dataset.id = product.id;
    }

    // --------------------------
    // ADD TO CART / OPTIONS
    // --------------------------

    const addToCartButton = card.querySelector("[data-action='add-to-cart']");

    renderProductCartButton(addToCartButton, product);

    // --------------------------
    // PRODUCT DETAILS
    // --------------------------

    const detailsButton = card.querySelector("[data-action='product-details']");

    if (detailsButton) {
      detailsButton.dataset.id = product.id;
    }

    fragment.append(card);
  });

  businessProducts.append(fragment);
}

function displayProducts() {
  const visibleProducts = businessProductsData.slice(0, visibleProductCount);

  renderProducts(visibleProducts);

  loadMoreProductsButton.hidden =
    visibleProductCount >= businessProductsData.length;

  refreshIcons();

  updateProductSaveButtons();
}

function addProductToCart(productId, actionButton) {
  const product = businessProductsData.find(
    (product) => product.id === productId,
  );

  if (!product) {
    return;
  }

  if (product.availability === "out-of-stock") {
    return;
  }

  /*
    Safety check.

    Even if this function somehow gets called for a
    variant product, we do not add it without selections.
  */
  if (productHasVariants(product)) {
    window.location.href = `./product.html?id=${product.id}`;

    return;
  }

  const existingCartItem = cart.find((cartItem) => {
    const cartProductId = cartItem.productId ?? cartItem.id;

    return cartProductId === productId;
  });

  if (existingCartItem) {
    existingCartItem.quantity = (Number(existingCartItem.quantity) || 1) + 1;
  } else {
    cart.push({
      ...product,

      quantity: 1,

      selectedVariants: {},

      store: {
        id: business.id,
        name: business.name,
        location: business.location,
      },
    });
  }

  saveCart(cart);

  // Update the global cart badge immediately
  updateCartCount();

  updateProductCartButton(actionButton, productId);
}

function updateProductCartButton(button, productId) {
  if (!button) {
    return;
  }

  const product = businessProductsData.find(
    (product) => product.id === productId,
  );

  if (!product) {
    return;
  }

  renderProductCartButton(button, product);

  refreshIcons();
}

// ======================================================
// SERVICES
// ======================================================

function renderServices(services) {
  const fragment = document.createDocumentFragment();

  const template = document.querySelector("#business-service-template");

  businessServices.replaceChildren();

  if (services.length === 0) {
    businessServicesEmpty.hidden = false;
    return;
  }

  businessServicesEmpty.hidden = true;

  services.forEach((service) => {
    const card = template.content.cloneNode(true);

    const image = card.querySelector(".business-item-image");

    image.src = service.image;
    image.alt = service.name;

    card.querySelector(".business-item-name").textContent = service.name;

    card.querySelector(".business-item-price").textContent =
      service.pricingType === "starting-from"
        ? `From ${formatCurrency(service.price)}`
        : formatCurrency(service.price);

    card.querySelector(".business-item-availability").textContent =
      formatCategory(service.availability);

    const saveButton = card.querySelector(".item-save-button");

    if (saveButton) {
      saveButton.dataset.id = service.id;
    }

    const requestButton = card.querySelector("[data-action='request-service']");

    if (requestButton) {
      requestButton.dataset.id = service.id;
    }

    // SERVICE DETAILS ENTRY POINT
    const detailsButton = card.querySelector("[data-action='service-details']");

    if (detailsButton) {
      detailsButton.dataset.id = service.id;
    }

    fragment.append(card);
  });

  businessServices.append(fragment);
}

function displayServices() {
  const visibleServices = businessServicesData.slice(0, visibleServiceCount);

  renderServices(visibleServices);

  loadMoreServicesButton.hidden =
    visibleServiceCount >= businessServicesData.length;

  refreshIcons();

  updateServiceSaveButtons();
}

// ======================================================
// SAVE PRODUCTS
// ======================================================

function isProductSaved(productId) {
  return savedProducts.some((product) => product.id === productId);
}

function toggleSavedProduct(productId) {
  const product = businessProductsData.find(
    (product) => product.id === productId,
  );

  if (!product) return;

  if (isProductSaved(productId)) {
    savedProducts = savedProducts.filter(
      (savedProduct) => savedProduct.id !== productId,
    );
  } else {
    savedProducts.push({
      id: product.id,
      storeId: product.storeId,
      name: product.name,
      price: product.price,
      image: product.image,
      availability: product.availability,
    });
  }

  saveSavedProducts(savedProducts);

  updateProductSaveButtons();
}

function updateProductSaveButtons() {
  const saveButtons = businessProducts.querySelectorAll(".item-save-button");

  saveButtons.forEach((button) => {
    const productId = Number(button.dataset.id);
    const saved = isProductSaved(productId);

    button.classList.toggle("saved", saved);

    button.setAttribute(
      "aria-label",
      saved ? "Remove saved product" : "Save product",
    );

    button.setAttribute("aria-pressed", String(saved));

    const heartIcon = button.querySelector("svg");

    if (heartIcon) {
      heartIcon.classList.toggle("saved-heart", saved);
    }
  });
}
// ======================================================
// SAVE SERVICES
// ======================================================

function isServiceSaved(serviceId) {
  return savedServices.some((service) => service.id === serviceId);
}

function toggleSavedService(serviceId) {
  const service = businessServicesData.find(
    (service) => service.id === serviceId,
  );
  if (!service) return;

  if (isServiceSaved(serviceId)) {
    savedServices = savedServices.filter(
      (savedService) => savedService.id !== serviceId,
    );
  } else {
    savedServices.push({
      id: service.id,
      providerId: service.providerId,
      name: service.name,
      price: service.price,
      pricingType: service.pricingType,
      image: service.image,
      availability: service.availability,
    });
  }

  saveSavedServices(savedServices);

  updateServiceSaveButtons();
}

function updateServiceSaveButtons() {
  const saveButtons = businessServices.querySelectorAll(".item-save-button");

  saveButtons.forEach((button) => {
    const serviceId = Number(button.dataset.id);
    const saved = isServiceSaved(serviceId);

    button.classList.toggle("saved", saved);

    button.setAttribute(
      "aria-label",
      saved ? "Remove saved service" : "Save service",
    );

    button.setAttribute("aria-pressed", String(saved));

    const heartIcon = button.querySelector("svg");

    if (heartIcon) {
      heartIcon.classList.toggle("saved-heart", saved);
    }
  });
}

// ======================================================
// TABS
// ======================================================

function activateTab(tab) {
  const allTabs = businessTabs.querySelectorAll(".business-tab");

  const allPanels = businessPrimaryContents.querySelectorAll(
    ".business-tab-panel",
  );

  const tabButton = businessTabs.querySelector(`[data-tab="${tab}"]`);

  const panel = businessPrimaryContents.querySelector(`[data-panel="${tab}"]`);

  if (!tabButton || !panel) return;

  allTabs.forEach((button) => {
    button.classList.remove("active");
  });

  allPanels.forEach((panel) => {
    panel.classList.remove("active");
  });

  tabButton.classList.add("active");
  panel.classList.add("active");
}

// ======================================================
// REVIEWS
// ======================================================

function renderReviews(reviews) {
  const fragment = document.createDocumentFragment();

  businessReviewsContainer.replaceChildren();

  if (reviews.length === 0) {
    businessReviewsEmpty.hidden = false;
    return;
  }

  businessReviewsEmpty.hidden = true;

  reviews.forEach((review) => {
    const reviewCard = document.createElement("article");

    reviewCard.classList.add("business-review-card");

    reviewCard.innerHTML = `
      <div class="review-header">

        <div class="review-user">

          <div class="review-avatar">
            ${review.userName[0].toUpperCase()}
          </div>

          <div>
            <strong class="review-user-name">
              ${review.userName}
            </strong>

            <span class="review-date">
              ${review.date}
            </span>
          </div>

        </div>

        <div class="review-rating">
          ${"★".repeat(review.rating)}
          ${"☆".repeat(5 - review.rating)}
        </div>

      </div>

      <p class="review-comment">
        ${review.comment}
      </p>
    `;

    fragment.append(reviewCard);
  });

  businessReviewsContainer.append(fragment);
}

// ======================================================
// ABOUT
// ======================================================

function renderAbout() {
  const fulfilmentInformation =
    type === "store"
      ? `
        <span class="about-detail-label">
          Fulfilment
        </span>

        <span class="about-detail-value">
          ${
            business.fulfillment.deliveryAvailable
              ? "Delivery Available"
              : "Delivery Unavailable"
          }
          •
          ${
            business.fulfillment.pickupAvailable
              ? "Pickup Available"
              : "Pickup Unavailable"
          }
        </span>
      `
      : `
        <span class="about-detail-label">
          Service Area
        </span>

        <span class="about-detail-value">
          ${business.serviceArea}
        </span>
      `;

  businessAbout.innerHTML = `
    <div class="about-description">

      <h3>${business.name}</h3>

      <p>
        ${business.description}
      </p>

    </div>

    <div class="about-details">

      <h3>Business Details</h3>

      <div class="about-detail-row">
        <span class="about-detail-label">
          Category
        </span>

        <span class="about-detail-value">
          ${formatCategory(business.category)}
        </span>
      </div>

      <div class="about-detail-row">
        <span class="about-detail-label">
          Location
        </span>

        <span class="about-detail-value">
          ${business.location}
        </span>
      </div>

      <div class="about-detail-row">
        <span class="about-detail-label">
          Member since
        </span>

        <span class="about-detail-value">
          ${business.joinedYear}
        </span>
      </div>

      <div class="about-detail-row">
        ${fulfilmentInformation}
      </div>

    </div>
  `;
}

// ======================================================
// SAVE BUSINESS
// ======================================================

function isBusinessSaved() {
  return savedBusinesses.some(
    (savedBusiness) =>
      savedBusiness.id === businessId && savedBusiness.type === type,
  );
}

function updateBusinessSaveButton() {
  const saved = isBusinessSaved();

  businessSaveSpan.textContent = saved ? "Saved" : "Save";

  businessSave.classList.toggle("saved", saved);
}

function toggleSavedBusiness() {
  if (isBusinessSaved()) {
    savedBusinesses = savedBusinesses.filter(
      (savedBusiness) =>
        savedBusiness.id !== businessId || savedBusiness.type !== type,
    );
  } else {
    savedBusinesses.push({
      type,
      id: businessId,
    });
  }

  saveSavedBusinesses(savedBusinesses);

  updateBusinessSaveButton();
}

// ======================================================
// SHARE BUSINESS
// ======================================================

async function shareBusiness() {
  try {
    if (navigator.share) {
      await navigator.share({
        title: business.name,
        text: `Check out ${business.name} on LocalLink.`,
        url: window.location.href,
      });

      return;
    }

    await navigator.clipboard.writeText(window.location.href);

    businessShareSpan.textContent = "Link copied";

    setTimeout(() => {
      businessShareSpan.textContent = "Share";
    }, 2000);
  } catch (error) {
    console.log(error.message);
  }
}

// ======================================================
// MOBILE BUSINESS INFORMATION
// ======================================================

function updateBusinessInfoPosition(event) {
  if (event.matches) {
    businessContent.prepend(businessInfoCard);
  } else {
    businessContent.append(businessInfoCard);
  }
}

function toggleMobileBusinessInformation() {
  const expanded = businessInfoCard.classList.toggle("mobile-expanded");

  mobileBusinessInfoToggle.setAttribute("aria-expanded", expanded);
}

// ======================================================
// PRODUCT / SERVICE NAVIGATION
// ======================================================

function handleProductAction(event) {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    return;
  }

  const action = actionButton.dataset.action;
  const productId = Number(actionButton.dataset.id);

  if (!productId) {
    return;
  }

  if (action === "product-details") {
    window.location.href = `./product.html?id=${productId}`;

    return;
  }

  if (action === "choose-options") {
    window.location.href = `./product.html?id=${productId}`;

    return;
  }

  if (action === "save-product") {
    toggleSavedProduct(productId);

    return;
  }

  if (action === "add-to-cart") {
    addProductToCart(productId, actionButton);

    return;
  }
}

function handleServiceAction(event) {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    return;
  }

  const action = actionButton.dataset.action;
  const serviceId = Number(actionButton.dataset.id);

  if (!serviceId) {
    return;
  }

  // --------------------------
  // SERVICE DETAILS
  // --------------------------

  if (action === "service-details") {
    window.location.href = `./service.html?id=${serviceId}`;

    return;
  }

  // --------------------------
  // REQUEST SERVICE
  // --------------------------

  if (action === "request-service") {
    window.location.href = `./service-request.html?id=${serviceId}`;

    return;
  }

  // --------------------------
  // SAVE SERVICE
  // --------------------------

  if (action === "save-service") {
    toggleSavedService(serviceId);

    return;
  }
}

// ======================================================
// BUSINESS ACTIONS
// ======================================================

async function handleBusinessAction(event) {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) return;

  const action = actionButton.dataset.action;

  if (action === "save-business") {
    toggleSavedBusiness();
    return;
  }

  if (action === "share-business") {
    await shareBusiness();
  }
}

// ======================================================
// TAB EVENTS
// ======================================================

function handleTabClick(event) {
  const tabButton = event.target.closest("[data-tab]");

  if (!tabButton) return;

  activateTab(tabButton.dataset.tab);
}

// ======================================================
// GALLERY EVENTS
// ======================================================

function handleGalleryGridClick(event) {
  const galleryItem = event.target.closest(".business-gallery-item");

  if (!galleryItem) return;

  openGallery(Number(galleryItem.dataset.index));
}

function handleThumbnailClick(event) {
  const thumbnail = event.target.closest("img");

  if (!thumbnail) return;

  changeGalleryImage(Number(thumbnail.dataset.index));
}

function handleGalleryKeyboard(event) {
  if (galleryViewer.hidden) return;

  if (event.key === "ArrowRight") {
    showNextGalleryImage();
    return;
  }

  if (event.key === "ArrowLeft") {
    showPreviousGalleryImage();
    return;
  }

  if (event.key === "Escape") {
    closeGallery();
  }
}

function handleGalleryTouchStart(event) {
  touchStartX = event.touches[0].clientX;

  touchStartY = event.touches[0].clientY;
}

function handleGalleryTouchEnd(event) {
  const touchEndX = event.changedTouches[0].clientX;

  const touchEndY = event.changedTouches[0].clientY;

  const differenceX = touchStartX - touchEndX;

  const differenceY = touchStartY - touchEndY;

  const horizontalSwipe = Math.abs(differenceX) > Math.abs(differenceY);

  if (horizontalSwipe) {
    if (differenceX > 50) {
      showNextGalleryImage();
    } else if (differenceX < -50) {
      showPreviousGalleryImage();
    }

    return;
  }

  if (differenceY < -50) {
    closeGallery();
  }
}

// ======================================================
// LOAD MORE
// ======================================================

function loadMoreProducts() {
  visibleProductCount += ITEMS_PER_PAGE;

  displayProducts();
}

function loadMoreServices() {
  visibleServiceCount += ITEMS_PER_PAGE;

  displayServices();
}

// ======================================================
// EVENT LISTENERS
// ======================================================

function attachEventListeners() {
  businessIdentityAction.addEventListener("click", handleBusinessAction);

  businessTabs.addEventListener("click", handleTabClick);

  businessProducts.addEventListener("click", handleProductAction);

  businessServices.addEventListener("click", handleServiceAction);

  loadMoreProductsButton.addEventListener("click", loadMoreProducts);

  loadMoreServicesButton.addEventListener("click", loadMoreServices);

  openingHoursToggle.addEventListener("click", toggleOpeningHours);

  businessGalleryGrid.addEventListener("click", handleGalleryGridClick);

  businessMainImage.addEventListener("click", () => openGallery(0));

  galleryNext.addEventListener("click", showNextGalleryImage);

  galleryPrevious.addEventListener("click", showPreviousGalleryImage);

  galleryClose.addEventListener("click", closeGallery);

  galleryThumbnails.addEventListener("click", handleThumbnailClick);

  document.addEventListener("keydown", handleGalleryKeyboard);

  galleryViewerImage.addEventListener("touchstart", handleGalleryTouchStart);

  galleryViewerImage.addEventListener("touchend", handleGalleryTouchEnd);

  mobileBusinessLayout.addEventListener("change", updateBusinessInfoPosition);

  mobileBusinessInfoToggle.addEventListener(
    "click",
    toggleMobileBusinessInformation,
  );
}

// ======================================================
// INITIALIZE
// ======================================================

async function initializeBusinessPage() {
  if (isBusinessLoading) {
    return;
  }

  if (!validBusinessType || !businessId) {
    renderBusinessNotFound();

    return;
  }

  isBusinessLoading = true;

  hideBusinessLoadError();

  showBusinessLoading();

  try {
    business =
      type === "store"
        ? await getStoreById(businessId)
        : await getServiceProviderById(businessId);

    if (!business) {
      hideBusinessLoading();

      renderBusinessNotFound();

      return;
    }

    await prepareBusinessData();

    hideBusinessLoading();

    renderBusinessIdentity();

    renderBusinessInformation();

    renderBusinessGallery();

    renderOpeningHours(visibleOpeningHours);

    displayProducts();

    displayServices();

    renderReviews(businessReviews);

    renderAbout();

    updateBusinessSaveButton();

    updateBusinessInfoPosition(mobileBusinessLayout);

    if (type === "store") {
      activateTab("products");
    } else {
      activateTab("services");
    }

    refreshIcons();
  } catch (error) {
    console.error("Unable to load business:", error);

    showBusinessLoadError();
  } finally {
    isBusinessLoading = false;
  }
}

// ======================================================
// ONE-TIME SETUP
// ======================================================

function initializeBusinessEvents() {
  attachEventListeners();

  initializeCartUI();

  document.addEventListener("click", (event) => {
    const retryButton = event.target.closest('[data-action="retry-business"]');

    if (!retryButton) {
      return;
    }

    initializeBusinessPage();
  });
}

initializeBusinessEvents();

initializeBusinessPage();
