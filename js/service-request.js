// ======================================================
// IMPORTS
// ======================================================

import { getServices, getServiceProviders } from "./data-service.js";

import {
  loadUserProfile,
  loadServiceRequests,
  saveServiceRequests,
} from "./storage.js";

import { initializeCartUI } from "./cart-ui.js";

import "./search.js";
// ======================================================
// PAGE DATA
// ======================================================

const params = new URLSearchParams(window.location.search);

const serviceId = Number(params.get("id"));

let service = null;

let provider = null;

// ======================================================
// DOM REFERENCES
// ======================================================
const serviceMain = document.querySelector(".service-request-main")

const requestLayout = document.querySelector("#service-request-layout");

const notFoundState = document.querySelector("#service-request-not-found");

const backToService = document.querySelector("#back-to-service");

const previewImage = document.querySelector("#request-preview-image");

const previewName = document.querySelector("#request-preview-name");

const previewProvider = document.querySelector("#request-preview-provider");

const previewPrice = document.querySelector("#request-preview-price");

const previewLocation = document.querySelector("#request-preview-location");

const requestForm = document.querySelector("#service-request-form");

const requestSteps = document.querySelectorAll("[data-request-step]");

const progressSteps = document.querySelectorAll("[data-progress-step]");

const progressFill = document.querySelector("#request-progress-fill");

const descriptionInput = document.querySelector("#request-description");

const descriptionCount = document.querySelector("#description-count");

const fulfillmentOptionsContainer = document.querySelector(
  "#fulfillment-options",
);

const customerLocationFields = document.querySelector(
  "#customer-location-fields",
);

const locationPrivacyNote = document.querySelector("#request-location-privacy");

const dateInput = document.querySelector("#request-date");

const timeInput = document.querySelector("#request-time");

const customerNameInput = document.querySelector("#request-customer-name");

const phoneInput = document.querySelector("#request-phone");

const submitButton = document.querySelector("#submit-service-request");

// Review

const reviewService = document.querySelector("#review-service");

const reviewProvider = document.querySelector("#review-provider");

const reviewPrice = document.querySelector("#review-price");

const reviewFulfillment = document.querySelector("#review-fulfillment");

const reviewAddressRow = document.querySelector("#review-address-row");

const reviewAddress = document.querySelector("#review-address");

const reviewDate = document.querySelector("#review-date");

const reviewTime = document.querySelector("#review-time");

const reviewContact = document.querySelector("#review-contact");

const reviewDescription = document.querySelector("#review-description");

// ======================================================
// APPLICATION STATE
// ======================================================

let customerProfile = null;

let selectedAddressId = null;

let showingAddressChoices = false;

let transitionInProgress = false;

// ======================================================
// REQUEST STATE
// ======================================================

const requestState = {
  currentStep: 1,

  description: "",

  fulfillmentType: null,

  preferredDate: "",

  preferredTime: "",

  customerName: "",

  phone: "",
};

// ======================================================
// CONSTANTS
// ======================================================

const TOTAL_STEPS = 4;

const fulfillmentConfiguration = {
  "customer-location": {
    label: "At my location",

    description: "The provider comes to your saved address.",

    icon: "house",
  },

  "provider-location": {
    label: "At provider's location",

    description: "You visit the provider at their business location.",

    icon: "store",
  },

  remote: {
    label: "Remote",

    description: "The service is delivered without an in-person visit.",

    icon: "monitor",
  },
};

// ======================================================
// GENERAL HELPERS
// ======================================================

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function formatCurrency(value) {
  return `₦${Number(value).toLocaleString("en-NG")}`;
}

function formatServicePrice(currentService) {
  if (!currentService) {
    return "";
  }

  const price = formatCurrency(currentService.price);

  if (currentService.pricingType === "starting-from") {
    return `From ${price}`;
  }

  return price;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(`${dateValue}T00:00:00`);

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(timeValue) {
  if (!timeValue) {
    return "";
  }

  const [hours, minutes] = timeValue.split(":").map(Number);

  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getTodayDateString() {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(today.getMonth() + 1).padStart(2, "0");

  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getFulfillmentConfiguration(type) {
  return (
    fulfillmentConfiguration[type] ?? {
      label: type,
      description: "",
      icon: "map-pin",
    }
  );
}

function generateRequestId() {
  const timestamp = Date.now().toString().slice(-6);

  const randomPart = Math.floor(100 + Math.random() * 900);

  return `SR-${timestamp}-${randomPart}`;
}

// ======================================================
// CUSTOMER PROFILE
// ======================================================

function initializeCustomerProfile() {
  customerProfile = loadUserProfile();

  if (!customerProfile) {
    requestState.customerName = "";

    requestState.phone = "";

    return;
  }

  requestState.customerName = customerProfile.name || "";

  requestState.phone = customerProfile.phone || "";

  if (customerNameInput) {
    customerNameInput.value = requestState.customerName;
  }

  if (phoneInput) {
    phoneInput.value = requestState.phone;
  }
}

// ======================================================
// CUSTOMER ADDRESS
// ======================================================

function getSavedAddresses() {
  return customerProfile?.addresses || [];
}

function getSelectedAddress() {
  return getSavedAddresses().find((address) => {
    return address.id === selectedAddressId;
  });
}

function initializeCustomerAddress() {
  const addresses = getSavedAddresses();

  if (addresses.length === 0) {
    selectedAddressId = null;

    return;
  }

  const defaultAddress = addresses.find((address) => {
    return address.isDefault;
  });

  selectedAddressId = defaultAddress?.id ?? addresses[0].id;
}

// ======================================================
// SERVICE INFORMATION
// ======================================================

function renderServiceInformation() {
  previewImage.src = service.image;

  previewImage.alt = service.name;

  previewName.textContent = service.name;

  previewProvider.textContent = provider.name;

  previewPrice.textContent = formatServicePrice(service);

  previewLocation.textContent = provider.location ?? "Local provider";

  backToService.href = `./service.html?id=${service.id}`;
}

// ======================================================
// FULFILLMENT OPTIONS
// ======================================================

function renderFulfillmentOptions() {
  const options =
    service.fulfillmentOptions?.length > 0
      ? service.fulfillmentOptions
      : ["customer-location"];

  fulfillmentOptionsContainer.innerHTML = options
    .map((type) => {
      const config = getFulfillmentConfiguration(type);

      return `
          <button
            type="button"
            class="request-fulfillment-option"
            data-action="select-fulfillment"
            data-fulfillment="${type}"
            aria-pressed="false"
          >

            <span class="request-fulfillment-icon">
              <i data-lucide="${config.icon}"></i>
            </span>

            <span class="request-fulfillment-content">

              <strong>
                ${config.label}
              </strong>

              <small>
                ${config.description}
              </small>

            </span>

            <span class="request-fulfillment-check">
              <i data-lucide="check"></i>
            </span>

          </button>
        `;
    })
    .join("");

  if (options.length === 1) {
    selectFulfillment(options[0]);
  }

  refreshIcons();
}

function selectFulfillment(type) {
  requestState.fulfillmentType = type;

  document.querySelectorAll("[data-fulfillment]").forEach((button) => {
    const selected = button.dataset.fulfillment === type;

    button.classList.toggle("selected", selected);

    button.setAttribute("aria-pressed", String(selected));
  });

  const needsCustomerAddress = type === "customer-location";

  customerLocationFields.hidden = !needsCustomerAddress;
  locationPrivacyNote.hidden = !needsCustomerAddress;

  if (needsCustomerAddress) {
    showingAddressChoices = false;

    renderCustomerAddress();
  }

  clearFieldError("fulfillment");

  clearFieldError("address");
}

// ======================================================
// RENDER CUSTOMER ADDRESS
// ======================================================

function renderCustomerAddress() {
  const addresses = getSavedAddresses();

  const selectedAddress = getSelectedAddress();

  if (addresses.length === 0) {
    customerLocationFields.innerHTML = `
      <div class="request-no-address">

        <span class="request-address-icon">
          <i data-lucide="map-pin-off"></i>
        </span>

        <div class="request-no-address-content">

          <strong>
            No saved address
          </strong>

          <p>
            Add an address to your profile
            before requesting a service at
            your location.
          </p>

        </div>

        <a
          href="./profile.html"
          class="request-manage-address-link"
        >
          Add address
        </a>

      </div>

      <p
        class="request-field-error"
        data-error-for="address"
      ></p>
    `;

    refreshIcons();

    return;
  }

  if (showingAddressChoices) {
    renderAddressChoices();

    return;
  }

  customerLocationFields.innerHTML = `
    <div class="request-saved-address-card">

      <div class="request-saved-address-header">

        <div>

          <span class="request-address-eyebrow">
            Service address
          </span>

          <strong>
            ${selectedAddress?.label || "Saved address"}
          </strong>

        </div>


        ${
          selectedAddress?.isDefault
            ? `
              <span class="request-default-badge">
                Default
              </span>
            `
            : ""
        }

      </div>


      <div class="request-saved-address-body">

        <span class="request-address-icon">
          <i data-lucide="map-pin"></i>
        </span>


        <div>

          <p>
            ${selectedAddress?.address || ""}
          </p>


          ${
            selectedAddress?.landmark
              ? `
                <small>
                  Landmark:
                  ${selectedAddress.landmark}
                </small>
              `
              : ""
          }

        </div>

      </div>


      <div class="request-saved-address-actions">

        ${
          addresses.length > 1
            ? `
              <button
                type="button"
                data-action="change-service-address"
              >
                <i data-lucide="repeat-2"></i>

                Change
              </button>
            `
            : ""
        }


        <a href="./profile.html">
          Manage addresses
        </a>

      </div>

    </div>


    <p
      class="request-field-error"
      data-error-for="address"
    ></p>
  `;

  refreshIcons();
}

// ======================================================
// ADDRESS CHOICES
// ======================================================

function renderAddressChoices() {
  const addresses = getSavedAddresses();

  customerLocationFields.innerHTML = `
    <div class="request-address-selector">

      <div class="request-address-selector-heading">

        <div>
          <strong>
            Choose service address
          </strong>

          <span>
            Select one of your saved addresses.
          </span>
        </div>


        <button
          type="button"
          data-action="close-address-choices"
          aria-label="Close address selection"
        >
          <i data-lucide="x"></i>
        </button>

      </div>


      <div class="request-address-options">

        ${addresses
          .map((address) => {
            const selected = address.id === selectedAddressId;

            return `
              <button
                type="button"
                class="
                  request-address-option
                  ${selected ? "selected" : ""}
                "
                data-action="select-service-address"
                data-address-id="${address.id}"
              >

                <span class="request-address-option-icon">
                  <i data-lucide="map-pin"></i>
                </span>


                <span class="request-address-option-content">

                  <strong>

                    ${address.label || "Address"}

                    ${
                      address.isDefault
                        ? `
                          <small class="request-default-badge">
                            Default
                          </small>
                        `
                        : ""
                    }

                  </strong>


                  <span>
                    ${address.address}
                  </span>


                  ${
                    address.landmark
                      ? `
                        <small>
                          ${address.landmark}
                        </small>
                      `
                      : ""
                  }

                </span>


                ${
                  selected
                    ? `
                      <span class="request-address-option-check">
                        <i data-lucide="circle-check"></i>
                      </span>
                    `
                    : ""
                }

              </button>
            `;
          })
          .join("")}

      </div>


      <a
        href="./profile.html"
        class="request-manage-address-link"
      >
        <i data-lucide="settings"></i>

        Manage addresses
      </a>

    </div>


    <p
      class="request-field-error"
      data-error-for="address"
    ></p>
  `;

  refreshIcons();
}

// ======================================================
// STATE SYNCHRONIZATION
// ======================================================

function syncInputsToState() {
  requestState.description = descriptionInput.value.trim();

  requestState.preferredDate = dateInput.value;

  requestState.preferredTime = timeInput.value;

  requestState.customerName = customerNameInput.value.trim();

  requestState.phone = phoneInput.value.trim();
}

// ======================================================
// ERRORS
// ======================================================

function getErrorElement(fieldName) {
  return document.querySelector(`[data-error-for="${fieldName}"]`);
}

function showFieldError(fieldName, message) {
  const errorElement = getErrorElement(fieldName);

  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;

  errorElement.classList.add("visible");
}

function clearFieldError(fieldName) {
  const errorElement = getErrorElement(fieldName);

  if (!errorElement) {
    return;
  }

  errorElement.textContent = "";

  errorElement.classList.remove("visible");
}

function clearStepErrors(step) {
  if (step === 1) {
    clearFieldError("description");
  }

  if (step === 2) {
    clearFieldError("fulfillment");

    clearFieldError("address");
  }

  if (step === 3) {
    clearFieldError("date");

    clearFieldError("time");

    clearFieldError("customerName");

    clearFieldError("phone");
  }
}

// ======================================================
// VALIDATION
// ======================================================

function validateStepOne() {
  clearStepErrors(1);

  if (requestState.description.length < 10) {
    showFieldError(
      "description",
      "Please give the provider a little more detail about what you need.",
    );

    descriptionInput.focus();

    return false;
  }

  return true;
}

function validateStepTwo() {
  clearStepErrors(2);

  if (!requestState.fulfillmentType) {
    showFieldError(
      "fulfillment",
      "Choose how you want to receive this service.",
    );

    return false;
  }

  /*
    At-my-location services now
    require a SAVED ADDRESS,
    rather than manually typed text.
  */

  if (
    requestState.fulfillmentType === "customer-location" &&
    !getSelectedAddress()
  ) {
    showFieldError("address", "Add or select an address before continuing.");

    return false;
  }

  return true;
}

function validatePhoneNumber(phone) {
  const normalizedPhone = phone.replace(/[\s()-]/g, "");

  return /^\+?\d{10,15}$/.test(normalizedPhone);
}

function validateStepThree() {
  clearStepErrors(3);

  let valid = true;

  if (!requestState.preferredDate) {
    showFieldError("date", "Choose your preferred service date.");

    valid = false;
  } else {
    const selectedDate = new Date(`${requestState.preferredDate}T00:00:00`);

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      showFieldError("date", "Choose today or a future date.");

      valid = false;
    }
  }

  if (!requestState.preferredTime) {
    showFieldError("time", "Choose your preferred time.");

    valid = false;
  }

  if (requestState.customerName.length < 2) {
    showFieldError("customerName", "Enter your full name.");

    valid = false;
  }

  if (!validatePhoneNumber(requestState.phone)) {
    showFieldError("phone", "Enter a valid phone number.");

    valid = false;
  }

  return valid;
}

function validateCurrentStep() {
  syncInputsToState();

  if (requestState.currentStep === 1) {
    return validateStepOne();
  }

  if (requestState.currentStep === 2) {
    return validateStepTwo();
  }

  if (requestState.currentStep === 3) {
    return validateStepThree();
  }

  return true;
}

// ======================================================
// PROGRESS
// ======================================================

function updateProgress() {
  const progressPercentage =
    ((requestState.currentStep - 1) / (TOTAL_STEPS - 1)) * 100;

  progressFill.style.width = `${progressPercentage}%`;

  progressSteps.forEach((stepElement) => {
    const stepNumber = Number(stepElement.dataset.progressStep);

    const isActive = stepNumber === requestState.currentStep;

    const isComplete = stepNumber < requestState.currentStep;

    stepElement.classList.toggle("active", isActive);

    stepElement.classList.toggle("complete", isComplete);

    const indicator = stepElement.querySelector("span");

    if (!indicator) {
      return;
    }

    if (isComplete) {
      indicator.innerHTML = `<i data-lucide="check"></i>`;
    } else {
      indicator.textContent = String(stepNumber);
    }
  });

  refreshIcons();
}

// ======================================================
// STEP TRANSITIONS
// ======================================================

function getStepElement(stepNumber) {
  return document.querySelector(`[data-request-step="${stepNumber}"]`);
}

function showStepImmediately(stepNumber) {
  requestSteps.forEach((step) => {
    const isCurrent = Number(step.dataset.requestStep) === stepNumber;

    step.hidden = !isCurrent;

    step.classList.toggle("active", isCurrent);
  });

  requestState.currentStep = stepNumber;

  updateProgress();
}

function transitionToStep(nextStep) {
  if (
    transitionInProgress ||
    nextStep < 1 ||
    nextStep > TOTAL_STEPS ||
    nextStep === requestState.currentStep
  ) {
    return;
  }

  transitionInProgress = true;

  const currentStepElement = getStepElement(requestState.currentStep);

  const nextStepElement = getStepElement(nextStep);

  const movingForward = nextStep > requestState.currentStep;

  currentStepElement.classList.add(
    movingForward ? "leaving-left" : "leaving-right",
  );

  window.setTimeout(() => {
    currentStepElement.hidden = true;

    currentStepElement.classList.remove(
      "active",
      "leaving-left",
      "leaving-right",
    );

    requestState.currentStep = nextStep;

    nextStepElement.hidden = false;

    nextStepElement.classList.add(
      movingForward ? "entering-right" : "entering-left",
    );

    /*
        Force the browser to paint
        the starting position before
        changing to the active state.
      */

    void nextStepElement.offsetWidth;

    nextStepElement.classList.add("active");

    nextStepElement.classList.remove("entering-right", "entering-left");

    updateProgress();

    window.scrollTo({
      top: requestForm.getBoundingClientRect().top + window.scrollY - 120,

      behavior: "smooth",
    });

    window.setTimeout(() => {
      transitionInProgress = false;
    }, 320);
  }, 180);
}

// ======================================================
// REVIEW
// ======================================================

function renderReview() {
  syncInputsToState();

  const fulfillment = getFulfillmentConfiguration(requestState.fulfillmentType);

  reviewService.textContent = service.name;

  reviewProvider.textContent = provider.name;

  reviewPrice.textContent = formatServicePrice(service);

  reviewFulfillment.textContent = fulfillment.label;

  if (requestState.fulfillmentType === "customer-location") {
    const selectedAddress = getSelectedAddress();

    reviewAddressRow.hidden = false;

    if (selectedAddress) {
      reviewAddress.textContent = selectedAddress.landmark
        ? `${selectedAddress.address} — ${selectedAddress.landmark}`
        : selectedAddress.address;
    } else {
      reviewAddress.textContent = "No address selected";
    }
  } else {
    reviewAddressRow.hidden = true;

    reviewAddress.textContent = "";
  }

  reviewDate.textContent = formatDate(requestState.preferredDate);

  reviewTime.textContent = formatTime(requestState.preferredTime);

  reviewContact.textContent = `${requestState.customerName} · ${requestState.phone}`;

  reviewDescription.textContent = requestState.description;
}

// ======================================================
// NAVIGATION
// ======================================================

function goToNextStep() {
  if (!validateCurrentStep()) {
    return;
  }

  if (requestState.currentStep === 3) {
    renderReview();
  }

  transitionToStep(requestState.currentStep + 1);
}

function goToPreviousStep() {
  clearStepErrors(requestState.currentStep);

  transitionToStep(requestState.currentStep - 1);
}

// ======================================================
// REQUEST CREATION
// ======================================================

function createServiceRequest() {
  const now = new Date().toISOString();

  const requestId = generateRequestId();

  const selectedAddress = getSelectedAddress();

  const fulfillment =
    requestState.fulfillmentType === "customer-location"
      ? {
          type: "customer-location",

          addressId: selectedAddress.id,

          addressLabel: selectedAddress.label || "Address",

          address: selectedAddress.address,

          landmark: selectedAddress.landmark || null,

          isDefaultAtRequestTime: Boolean(selectedAddress.isDefault),
        }
      : {
          type: requestState.fulfillmentType,

          addressId: null,

          addressLabel: null,

          address: null,

          landmark: null,

          isDefaultAtRequestTime: false,
        };

  return {
    id: requestId,

    serviceId: service.id,

    providerId: provider.id,

    service: {
      name: service.name,

      image: service.image,

      category: service.category,

      price: service.price,

      pricingType: service.pricingType,
    },

    provider: {
      name: provider.name,

      location: provider.location ?? "",
    },

    customer: {
      name: requestState.customerName,

      phone: requestState.phone,
    },

    description: requestState.description,

    fulfillment,

    schedule: {
      preferredDate: requestState.preferredDate,

      preferredTime: requestState.preferredTime,

      confirmedDate: null,

      confirmedTime: null,
    },

    status: "pending",

    quote: {
      status: "pending",

      amount: null,

      quotedAt: null,
    },

    payment: {
      status: "not-required",

      serviceAmount: null,

      serviceFee: 0,

      total: null,

      method: null,

      transactionId: null,

      paidAt: null,

      settlementStatus: "not-ready",

      settledAt: null,
    },

    completion: {
      otp: null,

      generatedAt: null,

      verifiedAt: null,
    },

    timeline: [
      {
        status: "pending",

        label: "Request submitted",

        timestamp: now,
      },
    ],

    createdAt: now,

    updatedAt: now,
  };
}

// ======================================================
// SUBMIT BUTTON STATE
// ======================================================

function setSubmittingState(submitting) {
  submitButton.disabled = submitting;

  if (submitting) {
    submitButton.innerHTML = `
      <span class="request-submit-spinner"></span>

      <span>
        Sending request...
      </span>
    `;
  } else {
    submitButton.innerHTML = `
      <span>
        Send Request
      </span>

      <i data-lucide="send"></i>
    `;

    refreshIcons();
  }
}

// ======================================================
// SUBMISSION
// ======================================================

function submitServiceRequest() {
  syncInputsToState();

  if (!validateStepOne()) {
    showStepImmediately(1);

    return;
  }

  if (!validateStepTwo()) {
    showStepImmediately(2);

    return;
  }

  if (!validateStepThree()) {
    showStepImmediately(3);

    return;
  }

  setSubmittingState(true);

  const newRequest = createServiceRequest();

  const requests = loadServiceRequests();

  requests.unshift(newRequest);

  saveServiceRequests(requests);

  /*
    Prototype asynchronous submission.
    Later this becomes an API request.
  */

  window.setTimeout(() => {
    window.location.href = `./service-tracking.html?id=${encodeURIComponent(
      newRequest.id,
    )}`;
  }, 700);
}

// ======================================================
// EVENT HANDLERS
// ======================================================

function handleRequestClick(event) {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    return;
  }

  const action = actionButton.dataset.action;

  // ----------------------------------
  // NEXT STEP
  // ----------------------------------

  if (action === "next-step") {
    goToNextStep();

    return;
  }

  // ----------------------------------
  // PREVIOUS STEP
  // ----------------------------------

  if (action === "previous-step") {
    goToPreviousStep();

    return;
  }

  // ----------------------------------
  // FULFILLMENT
  // ----------------------------------

  if (action === "select-fulfillment") {
    const fulfillmentType = actionButton.dataset.fulfillment;

    selectFulfillment(fulfillmentType);

    return;
  }

  // ----------------------------------
  // OPEN ADDRESS CHOICES
  // ----------------------------------

  if (action === "change-service-address") {
    showingAddressChoices = true;

    renderAddressChoices();

    return;
  }

  // ----------------------------------
  // CLOSE ADDRESS CHOICES
  // ----------------------------------

  if (action === "close-address-choices") {
    showingAddressChoices = false;

    renderCustomerAddress();

    return;
  }

  // ----------------------------------
  // SELECT ADDRESS
  // ----------------------------------

  if (action === "select-service-address") {
    const addressId = actionButton.dataset.addressId;

    const addressExists = getSavedAddresses().some((address) => {
      return address.id === addressId;
    });

    if (!addressExists) {
      return;
    }

    selectedAddressId = addressId;

    showingAddressChoices = false;

    clearFieldError("address");

    renderCustomerAddress();
  }
}

function handleDescriptionInput() {
  const length = descriptionInput.value.length;

  descriptionCount.textContent = `${length} / 1000`;

  requestState.description = descriptionInput.value.trim();

  if (requestState.description.length >= 10) {
    clearFieldError("description");
  }
}

function handleFormInput(event) {
  const target = event.target;

  if (target === dateInput) {
    requestState.preferredDate = dateInput.value;

    clearFieldError("date");

    return;
  }

  if (target === timeInput) {
    requestState.preferredTime = timeInput.value;

    clearFieldError("time");

    return;
  }

  if (target === customerNameInput) {
    requestState.customerName = customerNameInput.value.trim();

    if (requestState.customerName.length >= 2) {
      clearFieldError("customerName");
    }

    return;
  }

  if (target === phoneInput) {
    requestState.phone = phoneInput.value.trim();

    if (validatePhoneNumber(requestState.phone)) {
      clearFieldError("phone");
    }
  }
}

function attachEventListeners() {
  requestForm.addEventListener("click", handleRequestClick);

  requestForm.addEventListener("input", handleFormInput);

  descriptionInput.addEventListener("input", handleDescriptionInput);

  requestForm.addEventListener("submit", (event) => {
    event.preventDefault();

    submitServiceRequest();
  });
}

// ======================================================
// LOAD SERVICE CATALOGUE DATA
// ======================================================

async function loadServiceRequestData() {
  const [services, providers] = await Promise.all([
    getServices(),
    getServiceProviders(),
  ]);

  service =
    services.find((currentService) => {
      return currentService.id === serviceId;
    }) || null;

  if (!service) {
    provider = null;

    return;
  }

  provider =
    providers.find((currentProvider) => {
      return currentProvider.id === service.providerId;
    }) || null;
}

// ======================================================
// INVALID SERVICE
// ======================================================

function renderNotFound() {
  requestLayout.hidden = true;

  notFoundState.hidden = false;

  refreshIcons();
}

function showServiceRequestLoading() {
  hideServiceRequestError();

  if (document.querySelector("#service-request-loading")) {
    return;
  }

  const loading = document.createElement("div");

  loading.id = "service-request-loading";

  loading.className = "service-request-async-overlay";

  loading.innerHTML = `
    <span
      class="service-request-loading-spinner"
    ></span>

    <strong>
      Preparing your service request...
    </strong>

    <p>
      Loading the latest service and
      provider information.
    </p>
  `;

  serviceMain.classList.add("service-request-is-loading");

  serviceMain.append(loading);
}

function hideServiceRequestLoading() {
  document.querySelector("#service-request-loading")?.remove();

  serviceMain.classList.remove("service-request-is-loading");
}

function showServiceRequestError() {
  hideServiceRequestLoading();

  const error = document.createElement("div");

  error.id = "service-request-error";

  error.className = "service-request-async-overlay service-request-error-state";

  error.innerHTML = `
    <i data-lucide="wifi-off"></i>

    <strong>
      Couldn't load this service
    </strong>

    <p>
      Something went wrong while
      preparing your service request.
    </p>

    <button
      type="button"
      data-action="retry-service-request"
    >
      Try again
    </button>
  `;

  serviceMain.classList.add("service-request-is-loading");

  serviceMain.append(error);

  refreshIcons();
}

function hideServiceRequestError() {
  document.querySelector("#service-request-error")?.remove();

  serviceMain.classList.remove("service-request-is-loading");
}

document.addEventListener("click", (event) => {
  const retryButton = event.target.closest(
    '[data-action="retry-service-request"]',
  );

  if (!retryButton) {
    return;
  }

  initializeServiceRequestPage();
});

// ======================================================
// INITIALIZATION
// ======================================================

async function initializeServiceRequestPage() {
  initializeCartUI();

  hideServiceRequestError();

  showServiceRequestLoading();

  try {
    await loadServiceRequestData();

    if (!service || !provider) {
      hideServiceRequestLoading();

      renderNotFound();

      return;
    }

    if (service.availability !== "available") {
      hideServiceRequestLoading();

      renderNotFound();

      return;
    }

    hideServiceRequestLoading();

    initializeCustomerProfile();
    initializeCustomerAddress();

    dateInput.min = getTodayDateString();

    renderServiceInformation();
    renderFulfillmentOptions();

    showStepImmediately(1);

    attachEventListeners();

    handleDescriptionInput();

    refreshIcons();
  } catch (error) {
    console.error("Unable to load service request page:", error);

    showServiceRequestError();
  }
}

initializeServiceRequestPage();
