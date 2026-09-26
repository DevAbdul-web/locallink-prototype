// ======================================================
// IMPORTS
// ======================================================

import { saveUserProfile, loadUserProfile } from "./storage.js";

// ======================================================
// ONBOARDING SLIDE DATA
// ======================================================

const onboardingSlides = [
  {
    eyebrow: "Explore nearby",

    title: `
      Discover Local
      <span>Businesses.</span>
    `,

    description:
      "Find nearby stores and trusted service providers, see what they offer, and discover what's available around you.",

    image: "./assets/images/onboarding/discover-local.png",

    imageAlt: "Local businesses connected through LocalLink",
  },

  {
    eyebrow: "Simple local commerce",

    title: `
      Shop & Book
      <span>with Ease.</span>
    `,

    description:
      "Browse products, request local services, choose delivery or pickup, and handle everyday needs from one place.",

    image: "./assets/images/onboarding/shop-and-book.png",

    imageAlt:
      "Products, services and local delivery connected through LocalLink",
  },

  {
    eyebrow: "Built around your community",

    title: `
      Support Your
      <span>Community.</span>
    `,

    description:
      "Choose local businesses and service providers while helping neighbourhood commerce grow and stay connected.",

    image: "./assets/images/onboarding/support-community.png",

    imageAlt: "A connected local community of businesses and services",
  },
];

// ======================================================
// DOM REFERENCES
// ======================================================

const onboarding = document.querySelector(".onboarding");

const screens = document.querySelectorAll("[data-onboarding-screen]");

const profileForm = document.querySelector("#onboarding-profile-form");

const nameInput = document.querySelector("#onboarding-name");

const phoneInput = document.querySelector("#onboarding-phone");

// Slide elements

const slideEyebrow = document.querySelector("#onboarding-slide-eyebrow");

const slideTitle = document.querySelector("#onboarding-slide-title");

const slideDescription = document.querySelector(
  "#onboarding-slide-description",
);

const slideImage = document.querySelector("#onboarding-slide-image");

const currentSlideNumber = document.querySelector("#current-slide-number");

const progressDots = document.querySelectorAll("[data-slide-index]");

const previousSlideButton = document.querySelector(
  '[data-action="previous-slide"]',
);

const nextSlideLabel = document.querySelector("[data-next-label]");

const slideVisual = document.querySelector(".onboarding-visual-frame");

const slideCopy = document.querySelector(".onboarding-slide-copy");

// ======================================================
// APPLICATION STATE
// ======================================================

let currentSlideIndex = 0;

let isChangingSlide = false;

// ======================================================
// ICONS
// ======================================================

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ======================================================
// WAIT
// ======================================================

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

// ======================================================
// SCREEN NAVIGATION
// ======================================================

async function showScreen(screenName, direction = "forward") {
  const currentScreen = [...screens].find((screen) => !screen.hidden);

  const nextScreen = [...screens].find(
    (screen) => screen.dataset.onboardingScreen === screenName,
  );

  if (!nextScreen || currentScreen === nextScreen) {
    return;
  }

  const exitClass =
    direction === "back" ? "screen-exit-back" : "screen-exit-forward";

  const enterClass =
    direction === "back" ? "screen-enter-back" : "screen-enter-forward";

  currentScreen.classList.add(exitClass);

  await wait(320);

  currentScreen.hidden = true;

  currentScreen.classList.remove(exitClass);

  nextScreen.hidden = false;

  nextScreen.classList.add(enterClass);

  refreshIcons();

  await wait(450);

  nextScreen.classList.remove(enterClass);
}

// ======================================================
// RENDER SLIDE
// ======================================================

function renderSlide() {
  const slide = onboardingSlides[currentSlideIndex];

  slideEyebrow.textContent = slide.eyebrow;

  slideTitle.innerHTML = slide.title;

  slideDescription.textContent = slide.description;

  slideImage.src = slide.image;

  slideImage.alt = slide.imageAlt;

  currentSlideNumber.textContent = currentSlideIndex + 1;

  progressDots.forEach((dot) => {
    const dotIndex = Number(dot.dataset.slideIndex);

    const isActive = dotIndex === currentSlideIndex;

    dot.classList.toggle("active", isActive);

    if (isActive) {
      dot.setAttribute("aria-current", "step");
    } else {
      dot.removeAttribute("aria-current");
    }
  });

  previousSlideButton.hidden = currentSlideIndex === 0;

  nextSlideLabel.textContent =
    currentSlideIndex === onboardingSlides.length - 1 ? "Get Started" : "Next";

  refreshIcons();
}

// ======================================================
// CHANGE SLIDE
// ======================================================

async function changeSlide(nextIndex) {
  if (
    isChangingSlide ||
    nextIndex === currentSlideIndex ||
    nextIndex < 0 ||
    nextIndex >= onboardingSlides.length
  ) {
    return;
  }

  isChangingSlide = true;

  const direction = nextIndex > currentSlideIndex ? "forward" : "back";

  const exitClass =
    direction === "forward" ? "slide-exit-forward" : "slide-exit-back";

  const enterClass =
    direction === "forward" ? "slide-enter-forward" : "slide-enter-back";

  slideCopy.classList.add(exitClass);

  slideVisual.classList.add(exitClass);

  await wait(180);

  currentSlideIndex = nextIndex;

  renderSlide();

  slideCopy.classList.remove(exitClass);

  slideVisual.classList.remove(exitClass);

  slideCopy.classList.add(enterClass);

  slideVisual.classList.add(enterClass);

  await wait(320);

  slideCopy.classList.remove(enterClass);

  slideVisual.classList.remove(enterClass);

  isChangingSlide = false;
}

// ======================================================
// NEXT SLIDE
// ======================================================

function goToNextSlide() {
  const isLastSlide = currentSlideIndex === onboardingSlides.length - 1;

  if (isLastSlide) {
    showScreen("profile", "forward");

    return;
  }

  changeSlide(currentSlideIndex + 1);
}

// ======================================================
// PREVIOUS SLIDE
// ======================================================

function goToPreviousSlide() {
  if (currentSlideIndex === 0) {
    return;
  }

  changeSlide(currentSlideIndex - 1);
}

// ======================================================
// ONBOARDING ACTIONS
// ======================================================

function handleOnboardingAction(event) {
  const progressDot = event.target.closest("[data-slide-index]");

  if (progressDot) {
    const requestedIndex = Number(progressDot.dataset.slideIndex);

    changeSlide(requestedIndex);

    return;
  }

  const actionElement = event.target.closest("[data-action]");

  if (!actionElement) {
    return;
  }

  const action = actionElement.dataset.action;

  if (action === "next-slide") {
    goToNextSlide();

    return;
  }

  if (action === "previous-slide") {
    goToPreviousSlide();

    return;
  }

  if (action === "skip-intro") {
    showScreen("profile", "forward");

    return;
  }

  if (action === "back-to-intro") {
    currentSlideIndex = onboardingSlides.length - 1;

    renderSlide();

    showScreen("intro", "back");

    return;
  }

  if (action === "enter-locallink") {
    window.location.href = "./index.html";
  }
}

// ======================================================
// FORM VALIDATION
// ======================================================

function setFieldError(fieldName, message) {
  const errorElement = document.querySelector(
    `[data-error-for="${fieldName}"]`,
  );

  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;
}

function clearErrors() {
  document
    .querySelectorAll(".onboarding-field-error")
    .forEach((errorElement) => {
      errorElement.textContent = "";
    });
}

function validateProfile() {
  clearErrors();

  const name = nameInput.value.trim();

  const phone = phoneInput.value.trim();

  let isValid = true;

  if (name.length < 2) {
    setFieldError("name", "Enter your full name.");

    isValid = false;
  }

  if (phone.length < 10) {
    setFieldError("phone", "Enter a valid phone number.");

    isValid = false;
  }

  return isValid;
}

// ======================================================
// PROFILE CREATION
// ======================================================

function createUserProfile() {
  const now = new Date().toISOString();

  return {
    id: `USER-${Date.now()}`,

    name: nameInput.value.trim(),

    phone: phoneInput.value.trim(),

    addresses: [],

    onboardingCompleted: true,

    createdAt: now,

    updatedAt: now,
  };
}

// ======================================================
// PROFILE SUBMISSION
// ======================================================

async function handleProfileSubmit(event) {
  event.preventDefault();

  if (!validateProfile()) {
    return;
  }

  const userProfile = createUserProfile();

  saveUserProfile(userProfile);

  await showScreen("success", "forward");
}

// ======================================================
// RETURNING USER CHECK
// ======================================================

function redirectReturningUser() {
  const userProfile = loadUserProfile();

  if (userProfile && userProfile.onboardingCompleted) {
    window.location.replace("./index.html");

    return true;
  }

  return false;
}

// ======================================================
// INITIALIZATION
// ======================================================

function initializeOnboarding() {
  const wasRedirected = redirectReturningUser();

  if (wasRedirected) {
    return;
  }

  onboarding.addEventListener("click", handleOnboardingAction);

  profileForm.addEventListener("submit", handleProfileSubmit);

  renderSlide();

  refreshIcons();
}

initializeOnboarding();
