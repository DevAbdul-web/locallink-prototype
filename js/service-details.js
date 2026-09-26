import {
  getServiceById,
  getServiceProviderById,
  getServiceReviewsByServiceId,
} from "./data-service.js";

import "./search.js";

import { loadSavedServices, saveSavedServices } from "./storage.js";

// ======================================================
// PAGE STATE
// ======================================================

const params = new URLSearchParams(window.location.search);

const serviceId = Number(params.get("id"));

let service = null;

let provider = null;

let serviceReviews = [];

let isServiceLoading = false;

let serviceInteractionsAttached = false;

let savedServices = loadSavedServices();

let serviceImages = [];

let currentImageIndex = 0;

// ======================================================
// DOM ELEMENTS
// ======================================================

const serviceMain = document.querySelector(".service-details-main");

const serviceMainImage = document.querySelector("#service-main-image");
const serviceGalleryCounter = document.querySelector(
  "#service-gallery-counter",
);
const serviceGalleryThumbnails = document.querySelector(
  "#service-gallery-thumbnails",
);

const serviceName = document.querySelector("#service-name");
const serviceRating = document.querySelector("#service-rating");
const serviceReviewLink = document.querySelector("#service-review-link");
const serviceAvailability = document.querySelector("#service-availability");
const serviceAvailabilityDot = document.querySelector(
  ".service-availability-dot",
);

const servicePrice = document.querySelector("#service-price");
const servicePricingType = document.querySelector("#service-pricing-type");
const serviceShortDescription = document.querySelector(
  "#service-short-description",
);
const serviceHighlights = document.querySelector("#service-highlights");

const requestServiceName = document.querySelector("#request-service-name");
const requestServicePrice = document.querySelector("#request-service-price");
const requestProviderName = document.querySelector("#request-provider-name");

const requestServiceButton = document.querySelector(
  "[data-action='request-service']",
);
const saveServiceButton = document.querySelector(
  "[data-action='save-service']",
);

const serviceProviderImage = document.querySelector("#service-provider-image");
const serviceProviderName = document.querySelector("#service-provider-name");
const serviceProviderStatus = document.querySelector(
  "#service-provider-status",
);
const serviceProviderRating = document.querySelector(
  "#service-provider-rating",
);
const serviceProviderReviews = document.querySelector(
  "#service-provider-reviews",
);
const serviceProviderLocation = document.querySelector(
  "#service-provider-location",
);
const serviceProviderDistance = document.querySelector(
  "#service-provider-distance",
);
const serviceProviderDescription = document.querySelector(
  "#service-provider-description",
);

const serviceFullDescription = document.querySelector(
  "#service-full-description",
);
const serviceDetailsList = document.querySelector("#service-details-list");

const serviceAverageRating = document.querySelector("#service-average-rating");
const serviceReviewCount = document.querySelector("#service-review-count");
const serviceReviewsList = document.querySelector("#service-reviews-list");

const serviceDescriptionPanel = document.querySelector(
  "#service-description-panel",
);
const serviceReviewsPanel = document.querySelector("#service-reviews-panel");

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

function formatCategory(category) {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPricingType(pricingType) {
  if (pricingType === "starting-from") {
    return "Starting price";
  }

  return "Fixed price";
}

function getDisplayedPrice(service) {
  const price = formatCurrency(service.price);

  if (service.pricingType === "starting-from") {
    return `From ${price}`;
  }

  return price;
}

function formatAvailability(availability) {
  if (availability === "available") {
    return "Available";
  }

  return "Currently unavailable";
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function calculateAverageRating(reviews) {
  if (reviews.length === 0) {
    return null;
  }

  const totalRating = reviews.reduce(
    (total, review) => total + review.rating,
    0,
  );

  return totalRating / reviews.length;
}

function getUniqueImages(service) {
  const images = [service.image, ...(service.images || [])].filter(Boolean);

  return [...new Set(images)];
}

// ======================================================
// SERVICE GALLERY
// ======================================================

function renderMainImage() {
  if (serviceImages.length === 0) return;

  serviceMainImage.src = serviceImages[currentImageIndex];
  serviceMainImage.alt = service.name;

  serviceGalleryCounter.textContent = `${currentImageIndex + 1} / ${serviceImages.length}`;

  const thumbnails = serviceGalleryThumbnails.querySelectorAll(
    ".service-gallery-thumbnail",
  );

  thumbnails.forEach((thumbnail, index) => {
    thumbnail.classList.toggle("active", index === currentImageIndex);
  });
}

function renderGallery() {
  serviceImages = getUniqueImages(service);

  serviceGalleryThumbnails.innerHTML = "";

  serviceImages.forEach((image, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "service-gallery-thumbnail";

    if (index === currentImageIndex) {
      button.classList.add("active");
    }

    button.dataset.imageIndex = index;

    button.innerHTML = `
      <img
        src="${image}"
        alt="${service.name} image ${index + 1}"
      />
    `;

    serviceGalleryThumbnails.append(button);
  });

  renderMainImage();

  const previousButton = document.querySelector(
    "[data-action='previous-service-image']",
  );

  const nextButton = document.querySelector(
    "[data-action='next-service-image']",
  );

  const hasMultipleImages = serviceImages.length > 1;

  previousButton.hidden = !hasMultipleImages;
  nextButton.hidden = !hasMultipleImages;
  serviceGalleryCounter.hidden = !hasMultipleImages;
  serviceGalleryThumbnails.hidden = !hasMultipleImages;
}

function previousImage() {
  currentImageIndex =
    (currentImageIndex - 1 + serviceImages.length) % serviceImages.length;

  renderMainImage();
}

function nextImage() {
  currentImageIndex = (currentImageIndex + 1) % serviceImages.length;

  renderMainImage();
}

// ======================================================
// SERVICE INFORMATION
// ======================================================

function renderServiceInformation() {
  const averageRating = calculateAverageRating(serviceReviews);

  serviceName.textContent = service.name;

  serviceShortDescription.textContent = service.description;

  servicePrice.textContent = getDisplayedPrice(service);

  servicePricingType.textContent = formatPricingType(service.pricingType);

  serviceAvailability.textContent = formatAvailability(service.availability);

  const isAvailable = service.availability === "available";

  serviceAvailability.parentElement.classList.toggle(
    "unavailable",
    !isAvailable,
  );

  serviceAvailabilityDot.classList.toggle("unavailable", !isAvailable);

  if (averageRating === null) {
    serviceRating.textContent = "New";
    serviceReviewLink.textContent = "No reviews yet";
  } else {
    serviceRating.textContent = averageRating.toFixed(1);

    serviceReviewLink.textContent = `${serviceReviews.length} ${
      serviceReviews.length === 1 ? "review" : "reviews"
    }`;
  }

  serviceHighlights.innerHTML = `
    <span>
      <i data-lucide="briefcase-business"></i>
      ${formatCategory(service.category)}
    </span>

    <span>
      <i data-lucide="map-pin"></i>
      ${provider.distance} km away
    </span>

    <span>
      <i data-lucide="badge-check"></i>
      ${formatPricingType(service.pricingType)}
    </span>
  `;
}

// ======================================================
// REQUEST PANEL
// ======================================================

function renderRequestPanel() {
  requestServiceName.textContent = service.name;
  requestServicePrice.textContent = getDisplayedPrice(service);
  requestProviderName.textContent = provider.name;

  const serviceIsAvailable = service.availability === "available";

  const providerIsAvailable = provider.isAvailable === true;

  const canRequestService = serviceIsAvailable && providerIsAvailable;

  requestServiceButton.disabled = !canRequestService;

  const buttonText = requestServiceButton.querySelector("span");

  if (!serviceIsAvailable) {
    buttonText.textContent = "Currently Unavailable";

    return;
  }

  if (!providerIsAvailable) {
    buttonText.textContent = "Provider Unavailable";

    return;
  }

  buttonText.textContent = "Request Service";
}

// ======================================================
// PROVIDER
// ======================================================

function renderProvider() {
  serviceProviderImage.src = provider.image;
  serviceProviderImage.alt = provider.name;

  serviceProviderName.textContent = provider.name;

  serviceProviderStatus.textContent = provider.isAvailable
    ? "Available"
    : "Unavailable";

  serviceProviderStatus.classList.toggle("unavailable", !provider.isAvailable);

  serviceProviderRating.textContent = provider.rating.toFixed(1);

  serviceProviderReviews.textContent = `(${provider.reviewCount} reviews)`;

  serviceProviderLocation.textContent = provider.location;

  serviceProviderDistance.textContent = `${provider.distance} km away`;

  serviceProviderDescription.textContent = provider.description;
}

// ======================================================
// DESCRIPTION
// ======================================================

function renderDescription() {
  serviceFullDescription.textContent = service.description;

  serviceDetailsList.innerHTML = `
    <div class="service-detail-row">
      <span>Category</span>
      <strong>${formatCategory(service.category)}</strong>
    </div>

    <div class="service-detail-row">
      <span>Pricing</span>
      <strong>${formatPricingType(service.pricingType)}</strong>
    </div>

    <div class="service-detail-row">
      <span>Starting price</span>
      <strong>${getDisplayedPrice(service)}</strong>
    </div>

    <div class="service-detail-row">
      <span>Service area</span>
      <strong>${provider.serviceArea}</strong>
    </div>

    <div class="service-detail-row">
      <span>Provider location</span>
      <strong>${provider.location}</strong>
    </div>
  `;
}

// ======================================================
// REVIEWS
// ======================================================

function renderReviews() {
  const averageRating = calculateAverageRating(serviceReviews);

  if (serviceReviews.length === 0) {
    serviceAverageRating.textContent = "New";
    serviceReviewCount.textContent = "No reviews yet";

    serviceReviewsList.innerHTML = `
      <div class="service-reviews-empty">
        <i data-lucide="message-circle"></i>

        <h3>No reviews yet</h3>

        <p>
          This service has not received any customer reviews yet.
        </p>
      </div>
    `;

    return;
  }

  serviceAverageRating.textContent = averageRating.toFixed(1);

  serviceReviewCount.textContent = `${serviceReviews.length} ${
    serviceReviews.length === 1 ? "review" : "reviews"
  }`;

  serviceReviewsList.innerHTML = serviceReviews
    .map((review) => {
      const stars = "★".repeat(review.rating);

      return `
        <article class="service-review-card">
          <div class="service-review-card-header">
            <div>
              <strong>${review.userName}</strong>

              <span>${formatDate(review.date)}</span>
            </div>

            <span class="service-review-stars">
              ${stars}
            </span>
          </div>

          <p>${review.comment}</p>
        </article>
      `;
    })
    .join("");
}

// ======================================================
// SAVED SERVICES
// ======================================================

function updateSaveButton() {
  const isSaved = savedServices.some(
    (savedService) => savedService.id === service.id,
  );

  saveServiceButton.classList.toggle("saved", isSaved);

  saveServiceButton.querySelector("span").textContent = isSaved
    ? "Saved"
    : "Save Service";
}

function toggleSavedService() {
  const isSaved = savedServices.some(
    (savedService) => savedService.id === service.id,
  );

  if (isSaved) {
    savedServices = savedServices.filter(
      (savedService) => savedService.id !== service.id,
    );
  } else {
    savedServices.push({
      id: service.id,
      providerId: service.providerId,
      name: service.name,
      price: service.price,
      pricingType: service.pricingType,
      availability: service.availability,
      image: service.image,
    });
  }

  saveSavedServices(savedServices);

  updateSaveButton();
}

// ======================================================
// TABS
// ======================================================

function openServiceTab(tabName) {
  const tabButtons = document.querySelectorAll("[data-service-tab]");

  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.serviceTab === tabName);
  });

  serviceDescriptionPanel.hidden = tabName !== "description";

  serviceReviewsPanel.hidden = tabName !== "reviews";
}

// ======================================================
// PAGE INTERACTIONS
// ======================================================

function attachServiceInteractions() {
  if (serviceInteractionsAttached) {
    return;
  }

  serviceInteractionsAttached = true;

  document
    .querySelector("[data-action='previous-service-image']")
    .addEventListener("click", previousImage);

  document
    .querySelector("[data-action='next-service-image']")
    .addEventListener("click", nextImage);

  serviceGalleryThumbnails.addEventListener("click", (event) => {
    const thumbnail = event.target.closest("[data-image-index]");

    if (!thumbnail) return;

    currentImageIndex = Number(thumbnail.dataset.imageIndex);

    renderMainImage();
  });

  serviceReviewLink.addEventListener("click", () => {
    openServiceTab("reviews");

    document.querySelector(".service-content-section").scrollIntoView({
      behavior: "smooth",
    });
  });

  document
    .querySelector(".service-content-tabs")
    .addEventListener("click", (event) => {
      const tabButton = event.target.closest("[data-service-tab]");

      if (!tabButton) return;

      openServiceTab(tabButton.dataset.serviceTab);
    });

  saveServiceButton.addEventListener("click", toggleSavedService);

  requestServiceButton.addEventListener("click", () => {
    const serviceIsAvailable = service.availability === "available";

    const providerIsAvailable = provider.isAvailable === true;

    if (!serviceIsAvailable || !providerIsAvailable) {
      return;
    }

    window.location.href = `./service-request.html?id=${service.id}`;
  });

  document
    .querySelector("[data-action='view-business']")
    .addEventListener("click", () => {
      window.location.href = `./business.html?type=provider&id=${provider.id}`;
    });
}

// ======================================================
// ASYNC PAGE STATES
// ======================================================

function showServiceLoading() {
  hideServiceError();

  if (document.querySelector("#service-loading-state")) {
    return;
  }

  const loading = document.createElement("div");

  loading.id = "service-loading-state";

  loading.className = "service-loading-overlay";

  loading.innerHTML = `
    <span
      class="service-loading-spinner"
    ></span>

    <strong>
      Loading service...
    </strong>

    <p>
      Getting the latest service
      information.
    </p>
  `;

  serviceMain.classList.add("service-is-loading");

  serviceMain.append(loading);
}

function hideServiceLoading() {
  document.querySelector("#service-loading-state")?.remove();

  serviceMain.classList.remove("service-is-loading");
}

function showServiceError() {
  hideServiceLoading();

  if (document.querySelector("#service-error-state")) {
    return;
  }

  const error = document.createElement("div");

  error.id = "service-error-state";

  error.className = "service-loading-overlay service-error-overlay";

  error.innerHTML = `
    <i data-lucide="wifi-off"></i>

    <strong>
      Couldn't load service
    </strong>

    <p>
      Something went wrong while
      loading this service.
    </p>

    <button
      type="button"
      data-action="retry-service"
    >
      Try again
    </button>
  `;

  serviceMain.classList.add("service-is-loading");

  serviceMain.append(error);

  refreshIcons();
}

function hideServiceError() {
  document.querySelector("#service-error-state")?.remove();

  serviceMain.classList.remove("service-is-loading");
}

// ======================================================
// NOT FOUND
// ======================================================

function renderServiceNotFound() {
  serviceMain.innerHTML = `
    <section class="service-not-found">
      <i data-lucide="circle-alert"></i>

      <h1>Service not found</h1>

      <p>
        The service you are looking for may no longer be available.
      </p>

      <a href="./explore.html?type=services">
        Explore Services
      </a>
    </section>
  `;

  lucide.createIcons();
}

// ======================================================
// INITIALISE PAGE
// ======================================================

async function initializeServicePage() {
  if (isServiceLoading) {
    return;
  }

  if (!serviceId) {
    renderServiceNotFound();

    return;
  }

  isServiceLoading = true;

  hideServiceError();

  showServiceLoading();

  try {
    service = await getServiceById(serviceId);

    if (!service) {
      hideServiceLoading();

      renderServiceNotFound();

      return;
    }

    // Provider and reviews are independent
    // once the service is known.

    const [loadedProvider, loadedReviews] = await Promise.all([
      getServiceProviderById(service.providerId),

      getServiceReviewsByServiceId(service.id),
    ]);

    if (!loadedProvider) {
      hideServiceLoading();

      renderServiceNotFound();

      return;
    }

    provider = loadedProvider;

    serviceReviews = loadedReviews;

    hideServiceLoading();

    document.title = `${service.name} | LocalLink`;

    renderGallery();

    renderServiceInformation();

    renderRequestPanel();

    renderProvider();

    renderDescription();

    renderReviews();

    updateSaveButton();

    attachServiceInteractions();

    refreshIcons();
  } catch (error) {
    console.error("Unable to load service:", error);

    showServiceError();
  } finally {
    isServiceLoading = false;
  }
}

// ======================================================
// RETRY
// ======================================================

document.addEventListener("click", (event) => {
  const retryButton = event.target.closest('[data-action="retry-service"]');

  if (!retryButton) {
    return;
  }

  initializeServicePage();
});

// ======================================================
// START PAGE
// ======================================================

initializeServicePage();
