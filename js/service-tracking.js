// ======================================================
// IMPORTS
// ======================================================

import { initializeCartUI } from "./cart-ui.js";
import "./search.js";
import { loadServiceRequests, saveServiceRequests } from "./storage.js";
// ======================================================
// CONSTANTS
// ======================================================

const params = new URLSearchParams(window.location.search);

const requestId = params.get("id");

// Compressed prototype timing.
// Later these transitions will come from the real provider.
const SIMULATION_DELAYS = {
  pending: {
    min: 3500,
    max: 5500,
  },

  accepted: {
    min: 3000,
    max: 5000,
  },

  scheduled: {
    min: 4000,
    max: 6500,
  },

  "on-the-way": {
    min: 4500,
    max: 7000,
  },

  "in-progress": {
    min: 5500,
    max: 8000,
  },

  "awaiting-provider-verification": {
    min: 3000,
    max: 5000,
  },
};

// ======================================================
// DOM REFERENCES
// ======================================================

const trackingLayout = document.querySelector("#tracking-layout");

const notFoundState = document.querySelector("#tracking-not-found");

const requestIdElement = document.querySelector("#tracking-request-id");

const statusBadge = document.querySelector("#tracking-status-badge");

const serviceImage = document.querySelector("#tracking-service-image");

const serviceName = document.querySelector("#tracking-service-name");

const providerName = document.querySelector("#tracking-provider-name");

const trackingPrice = document.querySelector("#tracking-price");

const trackingSchedule = document.querySelector("#tracking-schedule");

const viewServiceLink = document.querySelector("#tracking-view-service");

const currentIcon = document.querySelector("#tracking-current-icon");

const currentTitle = document.querySelector("#tracking-current-title");

const currentDescription = document.querySelector(
  "#tracking-current-description",
);

const liveIndicator = document.querySelector("#tracking-live-indicator");

const progressContainer = document.querySelector("#tracking-progress");

const progressText = document.querySelector("#tracking-progress-text");

const paymentCard = document.querySelector("#tracking-payment-card");

const completionCard = document.querySelector("#tracking-completion-card");

const fulfillmentElement = document.querySelector("#tracking-fulfillment");

const preferredSchedule = document.querySelector(
  "#tracking-preferred-schedule",
);

const addressDetail = document.querySelector("#tracking-address-detail");

const addressElement = document.querySelector("#tracking-address");

const contactElement = document.querySelector("#tracking-contact");

const descriptionElement = document.querySelector("#tracking-description");

const locationPrivacy = document.querySelector("#tracking-location-privacy");

const providerCardName = document.querySelector("#tracking-provider-card-name");

const providerLocation = document.querySelector("#tracking-provider-location");

const providerLink = document.querySelector("#tracking-provider-link");

// ======================================================
// STATE
// ======================================================

let simulationTimer = null;

// ======================================================
// STATUS CONFIGURATION
// ======================================================

const statusConfiguration = {
  pending: {
    label: "Pending",
    title: "Waiting for provider",
    description:
      "Your request has been sent. We're waiting for the provider to respond.",
    icon: "clock-3",
  },

  accepted: {
    label: "Accepted",
    title: "Request accepted",
    description: "The provider has accepted your service request.",
    icon: "circle-check",
  },

  "awaiting-payment": {
    label: "Payment required",
    title: "Your service quote is ready",
    description:
      "The provider has confirmed the service price. Review the quote and secure your payment to continue.",
    icon: "credit-card",
  },

  scheduled: {
    label: "Scheduled",
    title: "Service scheduled",
    description:
      "Your service has been scheduled and the provider is preparing for it.",
    icon: "calendar-check",
  },

  "on-the-way": {
    label: "On the way",
    title: "Provider is on the way",
    description: "Your provider is heading to the service location.",
    icon: "navigation",
  },

  "in-progress": {
    label: "In progress",
    title: "Service in progress",
    description: "The provider is currently working on your service.",
    icon: "wrench",
  },

  "awaiting-customer-confirmation": {
    label: "Confirmation needed",
    title: "Provider marked the service finished",
    description:
      "Please check the completed work before confirming the service.",
    icon: "clipboard-check",
  },

  "awaiting-provider-verification": {
    label: "Confirming",
    title: "Confirmation sent",
    description:
      "Your completion confirmation has been sent securely to the provider.",
    icon: "send",
  },

  completed: {
    label: "Completed",
    title: "Service completed",
    description: "The service has been successfully completed and confirmed.",
    icon: "badge-check",
  },
};

// ======================================================
// STORAGE
// ======================================================

let serviceRequests = loadServiceRequests();

let request = serviceRequests.find(
  (currentRequest) => currentRequest.id === requestId,
);

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

function formatPrice(currentRequest) {
  const price = formatCurrency(currentRequest.service.price);

  if (currentRequest.service.pricingType === "starting-from") {
    return `From ${price}`;
  }

  return price;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Not set";
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

function formatDateTime(timestamp) {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatFulfillment(type) {
  const labels = {
    "customer-location": "At my location",

    "provider-location": "At provider's location",

    remote: "Remote",
  };

  return labels[type] ?? type;
}

function getStatusConfig(status) {
  return statusConfiguration[status] ?? statusConfiguration.pending;
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function animateCurrentStatus() {
  const hero = document.querySelector(".tracking-live-hero");

  if (!hero) {
    return;
  }

  hero.classList.remove("status-transitioning");

  /*
    Force the browser to recognise that the
    animation class was removed before we
    add it again.

    We will explain this properly later.
  */

  void hero.offsetWidth;

  hero.classList.add("status-transitioning");

  window.setTimeout(() => {
    hero.classList.remove("status-transitioning");
  }, 650);
}

function scrollLiveJourneyIntoView() {
  const hero = document.querySelector(".tracking-live-hero");

  if (!hero) {
    return;
  }

  window.setTimeout(() => {
    hero.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 350);
}

// ======================================================
// REQUEST PERSISTENCE
// ======================================================

function persistRequest() {
  request.updatedAt = new Date().toISOString();

  const requestIndex = serviceRequests.findIndex(
    (currentRequest) => currentRequest.id === request.id,
  );

  if (requestIndex === -1) {
    return;
  }

  serviceRequests[requestIndex] = request;

  saveServiceRequests(serviceRequests);
}

function addTimelineEvent(status, label, extra = {}) {
  if (!Array.isArray(request.timeline)) {
    request.timeline = [];
  }

  request.timeline.push({
    status,
    label,
    timestamp: new Date().toISOString(),
    ...extra,
  });
}

function setRequestStatus(status, timelineLabel) {
  request.status = status;

  addTimelineEvent(status, timelineLabel);

  /*
    A new status needs a new simulated
    transition schedule.
  */

  if (!request.simulation) {
    request.simulation = {};
  }

  request.simulation.nextTransitionAt = null;

  persistRequest();

  renderPage();
}

// ======================================================
// JOURNEY
// ======================================================

function getJourney() {
  const journey = [
    {
      status: "pending",
      label: "Request submitted",
      icon: "send",
    },

    {
      status: "accepted",
      label: "Request accepted",
      icon: "circle-check",
    },

    {
      status: "awaiting-payment",
      label: "Quote & payment",
      icon: "credit-card",
    },

    {
      status: "scheduled",
      label: "Scheduled",
      icon: "calendar-check",
    },
  ];

  if (request.fulfillment.type === "customer-location") {
    journey.push({
      status: "on-the-way",
      label: "Provider on the way",
      icon: "navigation",
    });
  }

  journey.push(
    {
      status: "in-progress",
      label: "Service in progress",
      icon: "wrench",
    },

    {
      status: "awaiting-customer-confirmation",

      label: "Confirm completion",
      icon: "clipboard-check",
    },

    {
      status: "awaiting-provider-verification",

      label: "Confirmation sent",
      icon: "send",
    },

    {
      status: "completed",
      label: "Completed",
      icon: "badge-check",
    },
  );

  return journey;
}

function getCurrentJourneyIndex() {
  const journey = getJourney();

  return journey.findIndex((step) => step.status === request.status);
}

function scrollActiveJourneyStepIntoView() {
  if (!window.matchMedia("(max-width: 640px)").matches) {
    return;
  }

  const progress = document.querySelector("#tracking-progress");

  const activeStep = progress?.querySelector(".tracking-progress-step.active");

  if (!progress || !activeStep) {
    return;
  }

  const targetLeft =
    activeStep.offsetLeft -
    progress.clientWidth / 2 +
    activeStep.offsetWidth / 2;

  progress.scrollTo({
    left: Math.max(0, targetLeft),

    behavior: "smooth",
  });
}

// ======================================================
// STATIC REQUEST INFORMATION
// ======================================================

function renderRequestInformation() {
  requestIdElement.textContent = `Request ${request.id}`;

  serviceImage.src = request.service.image;

  serviceImage.alt = request.service.name;

  serviceName.textContent = request.service.name;

  providerName.textContent = request.provider.name;

  trackingPrice.textContent = formatPrice(request);

  const scheduleText = `${formatDate(
    request.schedule.preferredDate,
  )} · ${formatTime(request.schedule.preferredTime)}`;

  trackingSchedule.textContent = scheduleText;

  viewServiceLink.href = `./service.html?id=${request.serviceId}`;

  fulfillmentElement.textContent = formatFulfillment(request.fulfillment.type);

  preferredSchedule.textContent = scheduleText;

  contactElement.textContent = `${request.customer.name} · ${request.customer.phone}`;

  descriptionElement.textContent = request.description;

  providerCardName.textContent = request.provider.name;

  providerLocation.textContent =
    request.provider.location || "Local service provider";

  providerLink.href = `./business.html?type=provider&id=${request.providerId}`;

  if (request.fulfillment.type === "customer-location") {
    addressDetail.hidden = false;

    locationPrivacy.hidden = false;

    addressElement.textContent = request.fulfillment.landmark
      ? `${request.fulfillment.address} — ${request.fulfillment.landmark}`
      : request.fulfillment.address;
  } else {
    addressDetail.hidden = true;

    locationPrivacy.hidden = true;
  }
}

// ======================================================
// CURRENT STATUS
// ======================================================

function renderCurrentStatus() {
  const config = getStatusConfig(request.status);

  statusBadge.textContent = config.label;

  statusBadge.dataset.status = request.status;

  currentTitle.textContent = config.title;

  currentDescription.textContent = config.description;

  currentIcon.innerHTML = `<i data-lucide="${config.icon}"></i>`;

  currentIcon.dataset.status = request.status;

  liveIndicator.hidden = request.status === "completed";
}

function scrollCurrentActionIntoView() {
  let target = null;

  if (request.status === "awaiting-payment") {
    target = paymentCard;
  }

  if (
    request.status === "awaiting-customer-confirmation" ||
    request.status === "awaiting-provider-verification"
  ) {
    target = completionCard;
  }

  if (!target || target.hidden) {
    return;
  }

  window.setTimeout(() => {
    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 300);
}

function handleStatusVisualTransition() {
  animateCurrentStatus();

  const hasImportantAction =
    request.status === "awaiting-payment" ||
    request.status === "awaiting-customer-confirmation" ||
    request.status === "awaiting-provider-verification";

  if (hasImportantAction) {
    scrollCurrentActionIntoView();

    return;
  }

  scrollActiveJourneyStepIntoView();
}

// ======================================================
// PROGRESS
// ======================================================

function getTimelineEvent(status) {
  if (!Array.isArray(request.timeline)) {
    return null;
  }

  return [...request.timeline]
    .reverse()
    .find((event) => event.status === status);
}

function renderProgress() {
  const journey = getJourney();

  const currentIndex = getCurrentJourneyIndex();

  progressContainer.innerHTML = journey
    .map((step, index) => {
      const completed = index < currentIndex;

      const active = index === currentIndex;

      const reached = completed || active;

      const timelineEvent = getTimelineEvent(step.status);

      let stateClass = "";

      if (completed) {
        stateClass = "complete";
      }

      if (active) {
        stateClass = "active";
      }

      return `
          <div
            class="tracking-progress-step ${stateClass}"
            data-status="${step.status}"
          >
            <div class="tracking-progress-marker">
              ${
                completed
                  ? `<i data-lucide="check"></i>`
                  : `<i data-lucide="${step.icon}"></i>`
              }
            </div>

            <div class="tracking-progress-content">
              <strong>
                ${step.label}
              </strong>

              ${
                reached && timelineEvent
                  ? `
                    <span>
                      ${formatDateTime(timelineEvent.timestamp)}
                    </span>
                  `
                  : `
                    <span>
                      Waiting
                    </span>
                  `
              }
            </div>
          </div>
        `;
    })
    .join("");

  const currentStep = journey[currentIndex];

  progressText.textContent = currentStep?.label ?? "Service progress";
}

// ======================================================
// QUOTE & PAYMENT
// ======================================================

function ensureQuoteObject() {
  if (!request.quote) {
    request.quote = {
      status: "pending",
      amount: null,
      quotedAt: null,
    };
  }
}

function ensurePaymentObject() {
  if (!request.payment) {
    request.payment = {
      status: "not-required",

      serviceAmount: null,

      serviceFee: 0,

      total: null,

      method: null,

      transactionId: null,

      paidAt: null,

      settlementStatus: "not-ready",

      settledAt: null,
    };
  }
}

function generateProviderQuote() {
  ensureQuoteObject();

  ensurePaymentObject();

  const listedPrice = Number(request.service.price) || 0;

  let quoteAmount = listedPrice;

  if (request.service.pricingType === "starting-from") {
    const increase = randomDelay(500, 3000);

    quoteAmount = Math.ceil((listedPrice + increase) / 500) * 500;
  }

  request.quote.status = "quoted";

  request.quote.amount = quoteAmount;

  request.quote.quotedAt = new Date().toISOString();

  request.payment.status = "awaiting-payment";

  request.payment.serviceAmount = quoteAmount;

  request.payment.serviceFee = 0;

  request.payment.total = quoteAmount + request.payment.serviceFee;

  request.payment.method = null;

  request.payment.transactionId = null;

  request.payment.paidAt = null;

  request.payment.settlementStatus = "not-ready";

  request.payment.settledAt = null;
}

function getPaymentMethodLabel(method) {
  const labels = {
    card: "Card",

    transfer: "Bank transfer",

    wallet: "LocalLink wallet",
  };

  return labels[method] ?? method;
}

// ======================================================
// PAYMENT CARD
// ======================================================

function renderPaymentCard() {
  if (request.status !== "awaiting-payment") {
    paymentCard.hidden = true;

    paymentCard.innerHTML = "";

    return;
  }

  ensureQuoteObject();

  ensurePaymentObject();

  const serviceAmount =
    request.payment.serviceAmount ?? request.quote.amount ?? 0;

  const serviceFee = request.payment.serviceFee ?? 0;

  const total = request.payment.total ?? serviceAmount + serviceFee;

  paymentCard.hidden = false;

  paymentCard.innerHTML = `
    <div class="tracking-payment-heading">

      <div class="tracking-payment-heading-icon">
        <i data-lucide="shield-check"></i>
      </div>

      <div>
        <span>
          Provider quote
        </span>

        <h2>
          Review and secure your payment
        </h2>

        <p>
          Your provider has confirmed the
          price for this service. Payment
          must be secured before the service
          can continue.
        </p>
      </div>

    </div>


    <div class="tracking-quote-summary">

      <div class="tracking-quote-row">
        <span>
          Service
        </span>

        <strong>
          ${request.service.name}
        </strong>
      </div>


      <div class="tracking-quote-row">
        <span>
          Service quote
        </span>

        <strong>
          ${formatCurrency(serviceAmount)}
        </strong>
      </div>


      <div class="tracking-quote-row">
        <span>
          LocalLink service fee
        </span>

        <strong>
          ${serviceFee > 0 ? formatCurrency(serviceFee) : "₦0"}
        </strong>
      </div>


      <div
        class="
          tracking-quote-row
          tracking-quote-total
        "
      >
        <span>
          Total
        </span>

        <strong>
          ${formatCurrency(total)}
        </strong>
      </div>

    </div>


    <div class="tracking-payment-methods">

      <div class="tracking-payment-method-heading">
        <strong>
          Payment method
        </strong>

        <span>
          Choose how you want to pay
        </span>
      </div>


      <button
        type="button"
        class="
          tracking-payment-method
          ${request.payment.method === "card" ? "selected" : ""}
        "
        data-action="select-payment-method"
        data-payment-method="card"
      >
        <span
          class="tracking-payment-method-icon"
        >
          <i data-lucide="credit-card"></i>
        </span>

        <span
          class="tracking-payment-method-content"
        >
          <strong>
            Card
          </strong>

          <small>
            Pay securely with your card
          </small>
        </span>

        <span
          class="tracking-payment-method-check"
        >
          ${
            request.payment.method === "card"
              ? `<i data-lucide="check"></i>`
              : ""
          }
        </span>
      </button>


      <button
        type="button"
        class="
          tracking-payment-method
          ${request.payment.method === "transfer" ? "selected" : ""}
        "
        data-action="select-payment-method"
        data-payment-method="transfer"
      >
        <span
          class="tracking-payment-method-icon"
        >
          <i data-lucide="landmark"></i>
        </span>

        <span
          class="tracking-payment-method-content"
        >
          <strong>
            Bank transfer
          </strong>

          <small>
            Pay using a bank transfer
          </small>
        </span>

        <span
          class="tracking-payment-method-check"
        >
          ${
            request.payment.method === "transfer"
              ? `<i data-lucide="check"></i>`
              : ""
          }
        </span>
      </button>


      <button
        type="button"
        class="
          tracking-payment-method
          ${request.payment.method === "wallet" ? "selected" : ""}
        "
        data-action="select-payment-method"
        data-payment-method="wallet"
      >
        <span
          class="tracking-payment-method-icon"
        >
          <i data-lucide="wallet"></i>
        </span>

        <span
          class="tracking-payment-method-content"
        >
          <strong>
            LocalLink wallet
          </strong>

          <small>
            Pay from your LocalLink balance
          </small>
        </span>

        <span
          class="tracking-payment-method-check"
        >
          ${
            request.payment.method === "wallet"
              ? `<i data-lucide="check"></i>`
              : ""
          }
        </span>
      </button>

    </div>


    <div class="tracking-payment-security">

      <i data-lucide="lock-keyhole"></i>

      <p>
        Your payment will be secured by
        LocalLink while the service is being
        completed.
      </p>

    </div>


    <button
      type="button"
      id="pay-service-button"
      class="tracking-pay-button"
      ${request.payment.method ? "" : "disabled"}
    >
      <i data-lucide="shield-check"></i>

      <span>
        Pay ${formatCurrency(total)} securely
      </span>
    </button>
  `;
}

// ======================================================
// PAYMENT METHOD
// ======================================================

function selectPaymentMethod(method) {
  if (request.status !== "awaiting-payment") {
    return;
  }

  ensurePaymentObject();

  request.payment.method = method;

  persistRequest();

  renderPaymentCard();

  refreshIcons();
}

// ======================================================
// PAYMENT PROCESSING
// ======================================================

function generateTransactionId() {
  return `LL-PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function handleServicePayment() {
  if (request.status !== "awaiting-payment") {
    return;
  }

  ensurePaymentObject();

  if (!request.payment.method) {
    return;
  }

  const payButton = document.querySelector("#pay-service-button");

  if (!payButton) {
    return;
  }

  payButton.disabled = true;

  request.payment.status = "processing";

  persistRequest();

  payButton.innerHTML = `
    <span
      class="tracking-payment-spinner"
    ></span>

    <span>
      Securing payment...
    </span>
  `;

  window.setTimeout(() => {
    payButton.innerHTML = `
      <span
        class="tracking-payment-spinner"
      ></span>

      <span>
        Processing payment...
      </span>
    `;

    window.setTimeout(() => {
      request.payment.status = "secured";

      request.payment.transactionId = generateTransactionId();

      request.payment.paidAt = new Date().toISOString();

      request.payment.settlementStatus = "held";

      addTimelineEvent(
        "payment-secured",
        `Payment secured via ${getPaymentMethodLabel(request.payment.method)}`,
        {
          amount: request.payment.total,

          transactionId: request.payment.transactionId,
        },
      );

      /*
        Payment is now secured.

        Only now can the service become
        scheduled.
      */

      request.status = "scheduled";

      addTimelineEvent("scheduled", "Service scheduled after payment");

      ensureSimulationObject();

      request.simulation.nextTransitionAt = null;

      persistRequest();

      renderPage();

      handleStatusVisualTransition();

      scrollLiveJourneyIntoView();

      scheduleAutomaticTransition();

      window.setTimeout(() => {
        currentTitle.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    }, 1200);
  }, 1000);
}

// ======================================================
// COMPLETION
// ======================================================

function ensureCompletionObject() {
  if (!request.completion) {
    request.completion = {
      otp: null,
      generatedAt: null,
      sentAt: null,
      verifiedAt: null,
    };
  }
}

function generateCompletionOTP() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ======================================================
// COMPLETION CARD
// ======================================================

function renderCompletionCard() {
  const status = request.status;

  const completionStatuses = [
    "awaiting-customer-confirmation",
    "awaiting-provider-verification",
    "completed",
  ];

  if (!completionStatuses.includes(status)) {
    completionCard.hidden = true;

    completionCard.innerHTML = "";

    return;
  }

  completionCard.hidden = false;

  // --------------------------------------------------
  // CUSTOMER MUST CONFIRM THE WORK
  // --------------------------------------------------

  if (status === "awaiting-customer-confirmation") {
    completionCard.innerHTML = `
      <div class="completion-card-heading">
        <div class="completion-card-icon">
          <i data-lucide="clipboard-check"></i>
        </div>

        <div>
          <span>
            Your confirmation is needed
          </span>

          <h2>
            Has the service been completed?
          </h2>

          <p>
            The provider has marked the service
            as finished. Please check that the
            agreed work has actually been completed
            before confirming.
          </p>
        </div>
      </div>

      <div class="completion-confirm-area">
        <div class="completion-confirm-warning">
          <i data-lucide="shield-check"></i>

          <p>
            Only confirm when you're satisfied
            that the agreed service has been
            completed.
          </p>
        </div>

        <button
          type="button"
          id="confirm-service-completion"
          class="completion-confirm-button"
        >
          <i data-lucide="check-check"></i>

          <span>
            Confirm & Send Completion Code
          </span>
        </button>
      </div>
    `;

    return;
  }

  // --------------------------------------------------
  // OTP HAS BEEN SENT TO PROVIDER
  // --------------------------------------------------

  if (status === "awaiting-provider-verification") {
    completionCard.innerHTML = `
      <div class="completion-card-heading">
        <div
          class="completion-card-icon completion-code-sent"
        >
          <i data-lucide="send"></i>
        </div>

        <div>
          <span>
            Confirmation sent
          </span>

          <h2>
            Completion code sent securely
          </h2>

          <p>
            Your confirmation has been sent
            to the provider. We're waiting for
            the provider to verify the completion
            code.
          </p>
        </div>
      </div>

      <div class="completion-waiting-state">
        <span class="completion-waiting-spinner"></span>

        <div>
          <strong>
            Waiting for provider verification
          </strong>

          <p>
            You don't need to do anything else.
            This page will update automatically.
          </p>
        </div>
      </div>
    `;

    return;
  }

  // --------------------------------------------------
  // COMPLETED
  // --------------------------------------------------

  completionCard.innerHTML = `
    <div class="completion-success">
      <div class="completion-success-icon">
        <i data-lucide="badge-check"></i>
      </div>

      <div>
        <span>
          Completed
        </span>

        <h2>
          Service completed successfully
        </h2>

        <p>
          Your completion confirmation was
          verified and this service request
          is now complete.
        </p>

        ${
          request.completion?.verifiedAt
            ? `
              <small>
                Confirmed
                ${formatDateTime(request.completion.verifiedAt)}
              </small>
            `
            : ""
        }
      </div>
    </div>
  `;
}

// ======================================================
// CUSTOMER COMPLETION CONFIRMATION
// ======================================================

function handleCompletionConfirmation() {
  if (request.status !== "awaiting-customer-confirmation") {
    return;
  }

  const button = document.querySelector("#confirm-service-completion");

  if (!button) {
    return;
  }

  button.disabled = true;

  button.innerHTML = `
    <span class="completion-button-spinner"></span>

    <span>
      Sending securely...
    </span>
  `;

  /*
    Small network-like delay so the action feels
    like a real request rather than an instant
    DOM change.
  */

  window.setTimeout(() => {
    ensureCompletionObject();

    /*
      In the real backend this OTP must be generated
      server-side and never trusted to frontend code.
    */

    request.completion.otp = generateCompletionOTP();

    request.completion.generatedAt = new Date().toISOString();

    request.completion.sentAt = new Date().toISOString();

    setRequestStatus(
      "awaiting-provider-verification",
      "Customer confirmed service completion",
    );

    scheduleAutomaticTransition();

    window.setTimeout(() => {
      completionCard.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  }, 700);
}

// ======================================================
// AUTOMATIC PROVIDER SIMULATION
// ======================================================

function getNextAutomaticStatus() {
  switch (request.status) {
    case "pending":
      return "accepted";

    case "accepted":
      return "awaiting-payment";

    case "scheduled":
      if (request.fulfillment.type === "customer-location") {
        return "on-the-way";
      }

      return "in-progress";

    case "on-the-way":
      return "in-progress";

    case "in-progress":
      return "awaiting-customer-confirmation";

    case "awaiting-provider-verification":
      return "completed";

    default:
      return null;
  }
}

function getTimelineLabel(status) {
  const labels = {
    accepted: "Provider accepted the request",

    "awaiting-payment": "Provider sent service quote",

    scheduled: "Service scheduled",

    "on-the-way": "Provider started travelling",

    "in-progress": "Service started",

    "awaiting-customer-confirmation": "Provider marked service finished",

    "awaiting-provider-verification": "Completion code sent to provider",

    completed: "Completion code verified",
  };

  return labels[status] ?? status;
}

function getSimulationDelay(status) {
  const delay = SIMULATION_DELAYS[status];

  if (!delay) {
    return null;
  }

  return randomDelay(delay.min, delay.max);
}

function ensureSimulationObject() {
  if (!request.simulation) {
    request.simulation = {
      nextTransitionAt: null,
    };
  }
}

function clearSimulationTimer() {
  if (!simulationTimer) {
    return;
  }

  window.clearTimeout(simulationTimer);

  simulationTimer = null;
}

function performAutomaticTransition() {
  const nextStatus = getNextAutomaticStatus();

  if (!nextStatus) {
    return;
  }

  if (nextStatus === "completed") {
    ensureCompletionObject();
    ensurePaymentObject();

    const completedAt = new Date().toISOString();

    request.completion.verifiedAt = completedAt;

    // ----------------------------------------------
    // RELEASE SECURED PAYMENT
    // ----------------------------------------------

    if (
      request.payment.status === "secured" &&
      request.payment.settlementStatus === "held"
    ) {
      request.payment.settlementStatus = "released";

      request.payment.settledAt = completedAt;

      addTimelineEvent(
        "payment-released",
        "Payment released after service completion",
        {
          amount: request.payment.total,
        },
      );
    }
  }
  if (nextStatus === "awaiting-payment") {
    generateProviderQuote();
  }

  request.status = nextStatus;

  addTimelineEvent(nextStatus, getTimelineLabel(nextStatus));

  ensureSimulationObject();

  request.simulation.nextTransitionAt = null;

  persistRequest();

  renderPage();

  handleStatusVisualTransition();

  if (nextStatus === "completed") {
    scrollLiveJourneyIntoView();
  }

  scheduleAutomaticTransition();

  /*
    Bring customer confirmation into view once
    the provider marks the service finished.
  */

  if (nextStatus === "awaiting-customer-confirmation") {
    window.setTimeout(() => {
      completionCard.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 200);
  }
}

function scheduleAutomaticTransition() {
  clearSimulationTimer();

  const nextStatus = getNextAutomaticStatus();

  /*
    No automatic transition while waiting
    for the CUSTOMER to confirm completion.
  */

  if (!nextStatus) {
    return;
  }

  const currentStatus = request.status;

  const delay = getSimulationDelay(currentStatus);

  if (delay === null) {
    return;
  }

  ensureSimulationObject();

  const now = Date.now();

  /*
    If no transition was previously scheduled,
    create one and persist it.

    This means refreshing the page does not
    restart the delay.
  */

  if (!request.simulation.nextTransitionAt) {
    request.simulation.nextTransitionAt = now + delay;

    persistRequest();
  }

  const remainingTime = Math.max(
    request.simulation.nextTransitionAt - now,
    250,
  );

  simulationTimer = window.setTimeout(() => {
    performAutomaticTransition();
  }, remainingTime);
}

// ======================================================
// MIGRATE OLD PROTOTYPE REQUESTS
// ======================================================

function migrateOldRequestState() {
  let changed = false;

  /*
    Earlier versions used awaiting-completion.
    Convert existing prototype requests so they
    still work with the new lifecycle.
  */

  if (request.status === "awaiting-completion") {
    request.status = "awaiting-customer-confirmation";

    changed = true;
  }

  if (Array.isArray(request.timeline)) {
    request.timeline = request.timeline.map((event) => {
      if (event.status !== "awaiting-completion") {
        return event;
      }

      changed = true;

      return {
        ...event,

        status: "awaiting-customer-confirmation",

        label: "Provider marked service finished",
      };
    });
  }

  if (changed) {
    if (request.simulation) {
      request.simulation.nextTransitionAt = null;
    }

    persistRequest();
  }
}

// ======================================================
// PAGE RENDER
// ======================================================

function renderPage() {
  renderRequestInformation();

  renderCurrentStatus();

  renderProgress();

  renderPaymentCard();

  renderCompletionCard();

  refreshIcons();
}

// ======================================================
// NOT FOUND
// ======================================================

function renderNotFound() {
  trackingLayout.hidden = true;

  notFoundState.hidden = false;

  refreshIcons();
}

// ======================================================
// EVENTS
// ======================================================

function handleTrackingClick(event) {
  const paymentMethodButton = event.target.closest(
    '[data-action="select-payment-method"]',
  );

  if (paymentMethodButton) {
    const method = paymentMethodButton.dataset.paymentMethod;

    selectPaymentMethod(method);

    return;
  }

  const payButton = event.target.closest("#pay-service-button");

  if (payButton) {
    handleServicePayment();

    return;
  }

  const confirmationButton = event.target.closest(
    "#confirm-service-completion",
  );

  if (confirmationButton) {
    handleCompletionConfirmation();
  }
}

function attachEventListeners() {
  document.addEventListener("click", handleTrackingClick);
}

// ======================================================
// INITIALIZATION
// ======================================================

function initializeTrackingPage() {
  initializeCartUI();

  if (!request) {
    renderNotFound();

    return;
  }

  migrateOldRequestState();

  attachEventListeners();

  renderPage();

  scheduleAutomaticTransition();

  refreshIcons();
}

initializeTrackingPage();
