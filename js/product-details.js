// ======================================================
// IMPORTS
// ======================================================

import {
  getProductById,
  getStoreById,
  getProductReviewsByProductId,
} from "./data-service.js";

import "./search.js";

import { initializeCartUI, updateCartCount } from "./cart-ui.js";

import {
  loadCart,
  saveCart,
  loadSavedProducts,
  saveSavedProducts,
} from "./storage.js";

// ======================================================
// DOM ELEMENTS
// ======================================================

const productMainImage = document.querySelector("#product-main-image");

const productGalleryThumbnails = document.querySelector(
  "#product-gallery-thumbnails",
);

const productGalleryCounter = document.querySelector(
  "#product-gallery-counter",
);

const productName = document.querySelector("#product-name");

const productRating = document.querySelector("#product-rating");

const productReviewLink = document.querySelector("#product-review-link");

const productAvailability = document.querySelector("#product-availability");

const productPrice = document.querySelector("#product-price");

const productShortDescription = document.querySelector(
  "#product-short-description",
);

const productHighlights = document.querySelector("#product-highlights");

const productVariantsSection = document.querySelector(
  "#product-variants-section",
);

const productVariants = document.querySelector("#product-variants");

const productQuantity = document.querySelector("#product-quantity");

const productDeliveryOption = document.querySelector(
  "#product-delivery-option",
);

const productPickupOption = document.querySelector("#product-pickup-option");

const productBusinessImage = document.querySelector("#product-business-image");

const productBusinessName = document.querySelector("#product-business-name");

const productBusinessStatus = document.querySelector(
  "#product-business-status",
);

const productBusinessRating = document.querySelector(
  "#product-business-rating",
);

const productBusinessReviews = document.querySelector(
  "#product-business-reviews",
);

const productBusinessLocation = document.querySelector(
  "#product-business-location",
);

const productBusinessDistance = document.querySelector(
  "#product-business-distance",
);

const productBusinessDescription = document.querySelector(
  "#product-business-description",
);

const productFullDescription = document.querySelector(
  "#product-full-description",
);

const productDetailsList = document.querySelector("#product-details-list");

const productAverageRating = document.querySelector("#product-average-rating");

const productReviewCount = document.querySelector("#product-review-count");

const productReviewsList = document.querySelector("#product-reviews-list");

const descriptionPanel = document.querySelector("#product-description-panel");

const reviewsPanel = document.querySelector("#product-reviews-panel");

const productTabs = document.querySelectorAll("[data-product-tab]");

const addToCartButton = document.querySelector("[data-action='add-to-cart']");

const saveProductButton = document.querySelector(
  "[data-action='save-product']",
);

const viewBusinessButton = document.querySelector(
  "[data-action='view-business']",
);

const previousImageButton = document.querySelector(
  "[data-action='previous-product-image']",
);

const nextImageButton = document.querySelector(
  "[data-action='next-product-image']",
);

const increaseQuantityButton = document.querySelector(
  "[data-action='increase-quantity']",
);

const decreaseQuantityButton = document.querySelector(
  "[data-action='decrease-quantity']",
);

// ======================================================
// APPLICATION STATE
// ======================================================

let currentImageIndex = 0;

let quantity = 1;

const selectedVariants = {};

let cart = loadCart();

let savedProducts = loadSavedProducts();

let currentProduct = null;

let currentProductStore = null;

let currentProductReviews = [];

let isProductLoading = false;

let productInteractionsAttached = false;

// ======================================================
// HELPERS
// ======================================================

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function formatPrice(price) {
  return "₦" + price.toLocaleString("en-NG");
}

function formatText(value) {
  return value
    .split("-")
    .map((word) => {
      return word[0].toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function calculateAverageRating(reviews) {
  if (reviews.length === 0) {
    return null;
  }

  const totalRating = reviews.reduce((total, review) => {
    return total + review.rating;
  }, 0);

  return totalRating / reviews.length;
}

// ======================================================
// MAIN INITIALIZATION
// ======================================================

async function initProductDetails() {
  if (isProductLoading) {
    return;
  }

  const params = new URLSearchParams(window.location.search);

  const id = Number(params.get("id"));

  if (!id) {
    renderProductNotFound();

    return;
  }

  isProductLoading = true;

  hideProductError();

  showProductLoading();

  try {
    // First we need the product because
    // its storeId tells us which store
    // owns the product.

    currentProduct = await getProductById(id);

    if (!currentProduct) {
      hideProductLoading();

      renderProductNotFound();

      return;
    }

    // Once the product is known, its store
    // and reviews are independent requests,
    // so they can load concurrently.

    const [productStore, productReviews] = await Promise.all([
      getStoreById(currentProduct.storeId),

      getProductReviewsByProductId(currentProduct.id),
    ]);

    if (!productStore) {
      hideProductLoading();

      renderProductNotFound();

      return;
    }

    currentProductStore = productStore;

    currentProductReviews = productReviews;

    hideProductLoading();

    // ==================================================
    // RENDER PAGE
    // ==================================================

    updateSaveButton(currentProduct);

    renderProductInformation(currentProduct, currentProductReviews);

    renderGallery(currentProduct);

    renderVariants(currentProduct);

    renderBusiness(currentProductStore);

    renderFulfillment(currentProductStore);

    renderProductDescription(currentProduct);

    renderReviews(currentProductReviews);

    attachProductInteractions(currentProduct, currentProductStore);

    initializeCartUI();

    refreshIcons();
  } catch (error) {
    console.error("Unable to load product:", error);

    showProductError();
  } finally {
    isProductLoading = false;
  }
}

// ======================================================
// SAVED PRODUCTS
// ======================================================

function updateSaveButton(product) {
  const isSaved = savedProducts.some((savedProduct) => {
    return savedProduct.id === product.id;
  });

  saveProductButton.classList.toggle("saved", isSaved);

  const buttonText = saveProductButton.querySelector("span");

  buttonText.textContent = isSaved ? "Saved" : "Save Item";

  const heartIcon = saveProductButton.querySelector("svg");

  if (heartIcon) {
    heartIcon.classList.toggle("saved-heart", isSaved);
  }
}

function toggleSavedProduct(product) {
  const isSaved = savedProducts.some((savedProduct) => {
    return savedProduct.id === product.id;
  });

  if (isSaved) {
    savedProducts = savedProducts.filter((savedProduct) => {
      return savedProduct.id !== product.id;
    });
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

  updateSaveButton(product);
}

// ======================================================
// PRODUCT INFORMATION
// ======================================================

function renderProductInformation(product, reviews) {
  productName.textContent = product.name;
  productPrice.textContent = formatPrice(product.price);
  productAvailability.textContent = formatText(product.availability);
  productShortDescription.textContent = product.description;

  const averageRating = calculateAverageRating(reviews);

  if (averageRating !== null) {
    productRating.textContent = averageRating.toFixed(1);

    productReviewLink.textContent = `${reviews.length} ${
      reviews.length === 1 ? "review" : "reviews"
    }`;
  } else {
    productRating.textContent = "New";

    productReviewLink.textContent = "No reviews yet";
  }

  renderProductHighlights(product);
}

// ======================================================
// PRODUCT HIGHLIGHTS
// ======================================================

function renderProductHighlights(product) {
  productHighlights.replaceChildren();

  const highlights = [
    {
      label: "Brand",
      value: product.brand,
    },

    {
      label: "Category",
      value: formatText(product.category),
    },

    {
      label: "Size",
      value: product.size,
    },
  ];

  const fragment = document.createDocumentFragment();

  highlights.forEach((highlight) => {
    if (!highlight.value) {
      return;
    }

    const item = document.createElement("div");

    item.classList.add("product-highlight-item");

    item.innerHTML = `
      <span>${highlight.label}</span>

      <strong>${highlight.value}</strong>
    `;

    fragment.append(item);
  });

  productHighlights.append(fragment);
}

// ======================================================
// PRODUCT GALLERY
// ======================================================

function renderGallery(product) {
  const images = [product.image, ...(product.images || [])];

  const uniqueImages = [...new Set(images)];

  productGalleryThumbnails.replaceChildren();

  currentImageIndex = 0;

  updateGalleryImage(product, uniqueImages);

  if (uniqueImages.length <= 1) {
    previousImageButton.hidden = true;

    nextImageButton.hidden = true;

    productGalleryCounter.hidden = true;
  } else {
    previousImageButton.hidden = false;

    nextImageButton.hidden = false;

    productGalleryCounter.hidden = false;
  }

  const fragment = document.createDocumentFragment();

  uniqueImages.forEach((image, index) => {
    const button = document.createElement("button");

    button.type = "button";

    button.classList.add("product-gallery-thumbnail");

    button.dataset.index = index;

    if (index === currentImageIndex) {
      button.classList.add("active");
    }

    button.innerHTML = `
      <img
        src="${image}"
        alt="${product.name} image ${index + 1}"
      />
    `;

    fragment.append(button);
  });

  productGalleryThumbnails.append(fragment);

  productGalleryThumbnails.addEventListener("click", (event) => {
    const thumbnail = event.target.closest(".product-gallery-thumbnail");

    if (!thumbnail) {
      return;
    }

    currentImageIndex = Number(thumbnail.dataset.index);

    updateGalleryImage(product, uniqueImages);
  });

  previousImageButton.addEventListener("click", () => {
    if (currentImageIndex === 0) {
      return;
    }

    currentImageIndex--;

    updateGalleryImage(product, uniqueImages);
  });

  nextImageButton.addEventListener("click", () => {
    if (currentImageIndex === uniqueImages.length - 1) {
      return;
    }

    currentImageIndex++;

    updateGalleryImage(product, uniqueImages);
  });
}

function updateGalleryImage(product, images) {
  productMainImage.src = images[currentImageIndex];

  productMainImage.alt = `${product.name} image ${currentImageIndex + 1}`;

  productGalleryCounter.textContent = `${currentImageIndex + 1} / ${images.length}`;

  const thumbnails = productGalleryThumbnails.querySelectorAll(
    ".product-gallery-thumbnail",
  );

  thumbnails.forEach((thumbnail) => {
    thumbnail.classList.toggle(
      "active",

      Number(thumbnail.dataset.index) === currentImageIndex,
    );
  });

  previousImageButton.disabled = currentImageIndex === 0;

  nextImageButton.disabled = currentImageIndex === images.length - 1;
}

// ======================================================
// VARIANTS
// ======================================================

function renderVariants(product) {
  productVariants.replaceChildren();

  // Reset variants in case this function
  // is called again in the future.

  Object.keys(selectedVariants).forEach((key) => {
    delete selectedVariants[key];
  });

  if (!product.variants) {
    productVariantsSection.hidden = true;

    return;
  }

  productVariantsSection.hidden = false;

  const fragment = document.createDocumentFragment();

  Object.entries(product.variants).forEach(([variantType, options]) => {
    const group = document.createElement("div");

    group.classList.add("product-variant-group");

    const title = document.createElement("h3");

    title.textContent = formatText(variantType);

    group.append(title);

    const optionsContainer = document.createElement("div");

    optionsContainer.classList.add("product-variant-buttons");

    options.forEach((option, index) => {
      const button = document.createElement("button");

      button.type = "button";

      button.classList.add("product-variant-button");

      button.dataset.variantType = variantType;

      button.dataset.variantValue = option;

      button.textContent = option;

      const shouldSelect =
        option === product.size ||
        (index === 0 && !options.includes(product.size));

      if (shouldSelect) {
        button.classList.add("active");

        selectedVariants[variantType] = option;
      }

      optionsContainer.append(button);
    });

    group.append(optionsContainer);

    fragment.append(group);
  });

  productVariants.append(fragment);
}

// ======================================================
// BUSINESS
// ======================================================

function renderBusiness(store) {
  productBusinessImage.src = store.image;

  productBusinessImage.alt = store.name;

  productBusinessName.textContent = store.name;

  productBusinessStatus.textContent = store.isOpen
    ? `Open until ${store.closingTime}`
    : "Closed";

  productBusinessStatus.classList.toggle("open", store.isOpen);

  productBusinessRating.textContent = store.rating.toFixed(1);

  productBusinessReviews.textContent = `${store.reviewCount} ${
    store.reviewCount === 1 ? "review" : "reviews"
  }`;

  productBusinessLocation.textContent = store.location;

  productBusinessDistance.textContent = `${store.distance} km away`;

  productBusinessDescription.textContent = store.description;
}

// ======================================================
// LOCAL FULFILLMENT
// ======================================================

function renderFulfillment(store) {
  productDeliveryOption.hidden = !store.fulfillment.deliveryAvailable;

  productPickupOption.hidden = !store.fulfillment.pickupAvailable;
}

// ======================================================
// PRODUCT DESCRIPTION
// ======================================================

function renderProductDescription(product) {
  productFullDescription.textContent = product.description;

  productDetailsList.replaceChildren();

  const details = [
    ["Brand", product.brand],

    ["Category", formatText(product.category)],

    ["Size", product.size],

    ["Availability", formatText(product.availability)],
  ];

  const fragment = document.createDocumentFragment();

  details.forEach(([label, value]) => {
    if (!value) {
      return;
    }

    const row = document.createElement("div");

    row.classList.add("product-detail-row");

    row.innerHTML = `
      <span>${label}</span>

      <strong>${value}</strong>
    `;

    fragment.append(row);
  });

  productDetailsList.append(fragment);
}

// ======================================================
// REVIEWS
// ======================================================

function renderReviews(reviews) {
  productReviewsList.replaceChildren();

  const averageRating = calculateAverageRating(reviews);

  if (reviews.length === 0) {
    productAverageRating.textContent = "New";

    productReviewCount.textContent = "No reviews yet";

    productReviewsList.innerHTML = `
      <div class="product-reviews-empty">

        <i data-lucide="message-square"></i>

        <h3>No reviews yet</h3>

        <p>
          This product has not received
          any reviews yet.
        </p>

      </div>
    `;

    return;
  }

  productAverageRating.textContent = averageRating.toFixed(1);

  productReviewCount.textContent = `${reviews.length} ${
    reviews.length === 1 ? "review" : "reviews"
  }`;

  const fragment = document.createDocumentFragment();

  reviews.forEach((review) => {
    const reviewCard = document.createElement("article");

    reviewCard.classList.add("product-review-card");

    const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);

    const formattedDate = new Date(review.date).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    reviewCard.innerHTML = `
      <div class="product-review-card-header">

        <div>
          <strong>
            ${review.userName}
          </strong>

          <span class="product-review-stars">
            ${stars}
          </span>
        </div>

        <time datetime="${review.date}">
          ${formattedDate}
        </time>

      </div>

      <p>${review.comment}</p>
    `;

    fragment.append(reviewCard);
  });

  productReviewsList.append(fragment);
}

// ======================================================
// INTERACTIONS
// ======================================================

function attachProductInteractions(product, store) {
  if (productInteractionsAttached) {
    return;
  }

  productInteractionsAttached = true;

  // Quantity

  increaseQuantityButton.addEventListener("click", () => {
    quantity++;

    productQuantity.textContent = quantity;
  });

  decreaseQuantityButton.addEventListener("click", () => {
    if (quantity <= 1) {
      return;
    }

    quantity--;

    productQuantity.textContent = quantity;
  });

  // Variants

  productVariants.addEventListener("click", (event) => {
    const button = event.target.closest(".product-variant-button");

    if (!button) {
      return;
    }

    const variantType = button.dataset.variantType;

    const variantValue = button.dataset.variantValue;

    selectedVariants[variantType] = variantValue;

    productVariants
      .querySelectorAll(`[data-variant-type="${variantType}"]`)
      .forEach((variantButton) => {
        variantButton.classList.remove("active");
      });

    button.classList.add("active");
  });

  // Add to cart

  addToCartButton.addEventListener("click", () => {
    addProductToCart(product, store);
  });

  // Save / unsave product

  saveProductButton.addEventListener("click", () => {
    toggleSavedProduct(product);
  });

  // View Business

  viewBusinessButton.addEventListener("click", () => {
    window.location.href = `./business.html?type=store&id=${store.id}`;
  });

  // Description / Reviews tabs

  productTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activateProductTab(tab.dataset.productTab);
    });
  });

  // Review link

  productReviewLink.addEventListener("click", () => {
    activateProductTab("reviews");

    reviewsPanel.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });

  // Disable purchasing if unavailable

  if (product.availability === "out-of-stock") {
    addToCartButton.disabled = true;

    addToCartButton.querySelector("span").textContent = "Out of Stock";

    increaseQuantityButton.disabled = true;

    decreaseQuantityButton.disabled = true;
  }
}

// ======================================================
// CART
// ======================================================

function normalizeVariants(variants = {}) {
  return Object.keys(variants)
    .sort()
    .reduce((normalizedVariants, key) => {
      normalizedVariants[key] = variants[key];

      return normalizedVariants;
    }, {});
}

function haveSameVariants(firstVariants = {}, secondVariants = {}) {
  const normalizedFirstVariants = normalizeVariants(firstVariants);
  const normalizedSecondVariants = normalizeVariants(secondVariants);

  return (
    JSON.stringify(normalizedFirstVariants) ===
    JSON.stringify(normalizedSecondVariants)
  );
}

function findMatchingCartItem(productId, variants = {}) {
  return cart.find((cartItem) => {
    const cartProductId = cartItem.productId ?? cartItem.id;

    if (cartProductId !== productId) {
      return false;
    }

    return haveSameVariants(cartItem.selectedVariants || {}, variants);
  });
}

function addProductToCart(product, store) {
  if (product.availability === "out-of-stock") {
    return;
  }

  const currentVariants = {
    ...selectedVariants,
  };

  const existingCartItem = findMatchingCartItem(product.id, currentVariants);

  if (existingCartItem) {
    existingCartItem.quantity =
      (Number(existingCartItem.quantity) || 1) + quantity;
  } else {
    cart.push({
      ...product,

      quantity,

      selectedVariants: currentVariants,

      store: {
        id: store.id,
        name: store.name,
        location: store.location,
      },
    });
  }

  saveCart(cart);

  // Synchronize the header cart badge immediately
  updateCartCount();

  updateAddToCartFeedback();
}

function updateAddToCartFeedback() {
  const buttonText = addToCartButton.querySelector("span");

  if (!buttonText) {
    return;
  }

  const originalText = buttonText.textContent;

  buttonText.textContent = "Added to Cart";

  addToCartButton.classList.add("added");

  setTimeout(() => {
    buttonText.textContent = originalText;

    addToCartButton.classList.remove("added");
  }, 1200);
}

// ======================================================
// CONTENT TABS
// ======================================================

function activateProductTab(tabName) {
  productTabs.forEach((tab) => {
    tab.classList.toggle(
      "active",

      tab.dataset.productTab === tabName,
    );
  });

  descriptionPanel.hidden = tabName !== "description";

  reviewsPanel.hidden = tabName !== "reviews";

  lucide.createIcons();
}

// ======================================================
// ASYNC PAGE STATES
// ======================================================

function showProductLoading() {
  hideProductError();

  if (document.querySelector("#product-loading-state")) {
    return;
  }

  const main = document.querySelector(".product-details-main");

  const loading = document.createElement("div");

  loading.id = "product-loading-state";

  loading.className = "product-loading-overlay";

  loading.innerHTML = `
    <span
      class="product-loading-spinner"
    ></span>

    <strong>
      Loading product...
    </strong>

    <p>
      Getting the latest product
      information.
    </p>
  `;

  main.classList.add("product-is-loading");

  main.append(loading);
}

function hideProductLoading() {
  document.querySelector("#product-loading-state")?.remove();

  document
    .querySelector(".product-details-main")
    ?.classList.remove("product-is-loading");
}

function showProductError() {
  hideProductLoading();

  if (document.querySelector("#product-error-state")) {
    return;
  }

  const main = document.querySelector(".product-details-main");

  const error = document.createElement("div");

  error.id = "product-error-state";

  error.className = `
      product-loading-overlay
      product-error-overlay
    `;

  error.innerHTML = `
    <i data-lucide="wifi-off"></i>

    <strong>
      Couldn't load product
    </strong>

    <p>
      Something went wrong while
      loading this product.
    </p>

    <button
      type="button"
      data-action="retry-product"
    >
      Try again
    </button>
  `;

  main.classList.add("product-is-loading");

  main.append(error);

  refreshIcons();
}

function hideProductError() {
  document.querySelector("#product-error-state")?.remove();

  document
    .querySelector(".product-details-main")
    ?.classList.remove("product-is-loading");
}

// ======================================================
// PRODUCT NOT FOUND
// ======================================================

function renderProductNotFound() {
  const main = document.querySelector(".product-details-main");

  main.innerHTML = `
    <section class="product-not-found">

      <i data-lucide="package-x"></i>

      <h1>Product not found</h1>

      <p>
        This product may no longer
        be available.
      </p>

      <a href="./explore.html">
        Explore nearby businesses
      </a>

    </section>
  `;

  lucide.createIcons();
}

document.addEventListener("click", (event) => {
  const retryButton = event.target.closest('[data-action="retry-product"]');

  if (!retryButton) {
    return;
  }

  initProductDetails();
});

// ======================================================
// START PAGE
// ======================================================

initProductDetails();
