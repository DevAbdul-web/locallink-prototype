// auth-guard.js

import { loadUserProfile } from "./storage.js";

// ======================================================
// CUSTOMER ACCESS GUARD
// ======================================================

export function requireUserProfile() {
  const userProfile = loadUserProfile();

  const hasCompletedOnboarding = userProfile && userProfile.onboardingCompleted;

  if (!hasCompletedOnboarding) {
    window.location.replace("./onboarding.html");

    return null;
  }

  return userProfile;
}

// Protect the page as soon as this module is loaded.

export const currentUser = requireUserProfile();
