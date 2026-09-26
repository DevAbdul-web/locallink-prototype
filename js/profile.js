import { loadUserProfile, saveUserProfile } from "./storage.js";

import { initializeCartUI } from "./cart-ui.js";

// ======================================================
// DOM REFERENCES
// ======================================================

const profileDisplayName = document.querySelector("#profile-display-name");

const profileDisplayPhone = document.querySelector("#profile-display-phone");

const profileName = document.querySelector("#profile-name");

const profilePhone = document.querySelector("#profile-phone");

const profileInitials = document.querySelector("#profile-initials");

const addressList = document.querySelector("#profile-address-list");

const addressEmpty = document.querySelector("#profile-address-empty");

const addressModal = document.querySelector("#address-modal");

const addressForm = document.querySelector("#address-form");

const addressLabelInput = document.querySelector("#address-label");

const addressValueInput = document.querySelector("#address-value");

const addressLandmarkInput = document.querySelector("#address-landmark");

const addressDefaultInput = document.querySelector("#address-default");

const addressModalTitle = document.querySelector("#address-modal-title");

const personalInfoModal = document.querySelector("#personal-info-modal");

const personalInfoForm = document.querySelector("#personal-info-form");

const personalNameInput = document.querySelector("#personal-name");

const personalPhoneInput = document.querySelector("#personal-phone");

const deleteAddressModal = document.querySelector("#delete-address-modal");

const deleteAddressLabel = document.querySelector("#delete-address-label");

const deleteAddressValue = document.querySelector("#delete-address-value");

// ======================================================
// UI STATE
// ======================================================

let editingAddressId = null;
let deletingAddressId = null;

// ======================================================
// PROFILE HELPERS
// ======================================================

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((namePart) => namePart[0])
    .join("")
    .toUpperCase();
}

// ======================================================
// RENDER PROFILE
// ======================================================

function renderProfile(profile) {
  profileDisplayName.textContent = profile.name;

  profileDisplayPhone.textContent = profile.phone;

  profileName.textContent = profile.name;

  profilePhone.textContent = profile.phone;

  profileInitials.textContent = getInitials(profile.name);
}

// ======================================================
// PERSONAL INFORMATION MODAL
// ======================================================

function openPersonalInfoModal() {
  const profile = loadUserProfile();

  if (!profile) {
    return;
  }

  personalNameInput.value = profile.name;

  personalPhoneInput.value = profile.phone;

  clearPersonalInfoErrors();

  personalInfoModal.hidden = false;

  personalInfoModal.setAttribute("aria-hidden", "false");

  document.body.classList.add("profile-modal-open");

  personalNameInput.focus();
}

function closePersonalInfoModal() {
  personalInfoModal.hidden = true;

  personalInfoModal.setAttribute("aria-hidden", "true");

  document.body.classList.remove("profile-modal-open");
}

function clearPersonalInfoErrors() {
  document.querySelectorAll("[data-personal-error]").forEach((errorElement) => {
    errorElement.textContent = "";
  });
}

function validatePersonalInfo() {
  clearPersonalInfoErrors();

  const name = personalNameInput.value.trim();

  const phone = personalPhoneInput.value.trim();

  let isValid = true;

  if (name.length < 2) {
    setPersonalInfoError("name", "Enter your full name.");

    isValid = false;
  }

  if (phone.length < 10) {
    setPersonalInfoError("phone", "Enter a valid phone number.");

    isValid = false;
  }

  return isValid;
}

// ======================================================
// PERSONAL INFORMATION VALIDATION
// ======================================================

function setPersonalInfoError(fieldName, message) {
  const errorElement = document.querySelector(
    `[data-personal-error="${fieldName}"]`,
  );

  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;
}

// ======================================================
// UPDATE PERSONAL INFORMATION
// ======================================================

function handlePersonalInfoSubmit(event) {
  event.preventDefault();

  if (!validatePersonalInfo()) {
    return;
  }

  const profile = loadUserProfile();

  if (!profile) {
    return;
  }

  const updatedProfile = {
    ...profile,

    name: personalNameInput.value.trim(),

    phone: personalPhoneInput.value.trim(),

    updatedAt: new Date().toISOString(),
  };

  saveUserProfile(updatedProfile);

  renderProfile(updatedProfile);

  closePersonalInfoModal();
}

// ======================================================
// RENDER ADDRESS STATE
// ======================================================

function renderAddresses(profile) {
  const addresses = profile.addresses || [];

  const hasAddresses = addresses.length > 0;

  addressEmpty.hidden = hasAddresses;

  addressList.hidden = !hasAddresses;

  if (!hasAddresses) {
    addressList.innerHTML = "";

    return;
  }

  addressList.innerHTML = addresses
    .map((address) => {
      return `
        <article
          class="profile-address-card"
          data-address-id="${address.id}"
        >
          <div class="profile-address-icon">
            <i data-lucide="map-pin"></i>
          </div>

          <div class="profile-address-content">
            <div class="profile-address-title">
              <strong>
                ${address.label}
              </strong>

              ${
                address.isDefault
                  ? `
                    <span
                      class="profile-address-default"
                    >
                      Default
                    </span>
                  `
                  : ""
              }
            </div>

            <p>
              ${address.address}
            </p>

            ${
              address.landmark
                ? `
                  <span
                    class="profile-address-landmark"
                  >
                    Landmark:
                    ${address.landmark}
                  </span>
                `
                : ""
            }
          </div>

          <div class="profile-address-actions">
            <button
              type="button"
              class="profile-address-action"
              data-action="edit-address"
              aria-label="Edit address"
            >
              <i data-lucide="pencil"></i>
            </button>

            <button
              type="button"
              class="profile-address-action delete"
              data-action="delete-address"
              aria-label="Delete address"
            >
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ======================================================
// ADDRESS MODAL
// ======================================================

function openAddressModal(address = null) {
  if (address) {
    editingAddressId = address.id;

    addressModalTitle.textContent = "Edit address";

    addressLabelInput.value = address.label;

    addressValueInput.value = address.address;

    addressLandmarkInput.value = address.landmark || "";

    addressDefaultInput.checked = address.isDefault;
  } else {
    editingAddressId = null;

    addressModalTitle.textContent = "Add an address";

    addressForm.reset();
  }

  clearAddressErrors();

  addressModal.hidden = false;

  addressModal.setAttribute("aria-hidden", "false");

  document.body.classList.add("profile-modal-open");

  addressLabelInput.focus();
}

function closeAddressModal() {
  addressModal.hidden = true;

  addressModal.setAttribute("aria-hidden", "true");

  document.body.classList.remove("profile-modal-open");
}

function openDeleteAddressModal(addressId) {
  const profile = loadUserProfile();

  if (!profile) {
    return;
  }

  const address = profile.addresses.find((savedAddress) => {
    return savedAddress.id === addressId;
  });

  if (!address) {
    return;
  }

  deletingAddressId = address.id;

  deleteAddressLabel.textContent = address.label;

  deleteAddressValue.textContent = address.address;

  deleteAddressModal.hidden = false;

  deleteAddressModal.setAttribute("aria-hidden", "false");

  document.body.classList.add("profile-modal-open");
}

function closeDeleteAddressModal() {
  deleteAddressModal.hidden = true;

  deleteAddressModal.setAttribute("aria-hidden", "true");

  document.body.classList.remove("profile-modal-open");

  deletingAddressId = null;
}

// ======================================================
// PROFILE ACTIONS
// ======================================================

function handleProfileAction(event) {
  const actionElement = event.target.closest("[data-action]");

  if (!actionElement) {
    return;
  }

  const action = actionElement.dataset.action;

  if (action === "add-address") {
    openAddressModal();

    return;
  }

  if (action === "close-address-modal") {
    closeAddressModal();
  }

  if (action === "edit-address") {
    const addressCard = actionElement.closest("[data-address-id]");

    if (!addressCard) {
      return;
    }

    const addressId = addressCard.dataset.addressId;

    const profile = loadUserProfile();

    if (!profile) {
      return;
    }

    const address = profile.addresses.find((savedAddress) => {
      return savedAddress.id === addressId;
    });

    if (!address) {
      return;
    }

    openAddressModal(address);
  }

  if (action === "delete-address") {
    const addressCard = actionElement.closest("[data-address-id]");

    if (!addressCard) {
      return;
    }

    const addressId = addressCard.dataset.addressId;

    openDeleteAddressModal(addressId);

    return;
  }

  if (action === "cancel-delete-address") {
    closeDeleteAddressModal();

    return;
  }

  if (action === "confirm-delete-address") {
    if (!deletingAddressId) {
      return;
    }

    const addressId = deletingAddressId;

    closeDeleteAddressModal();

    deleteAddress(addressId);

    return;
  }

  if (action === "edit-personal-info") {
    openPersonalInfoModal();

    return;
  }

  if (action === "close-personal-info") {
    closePersonalInfoModal();

    return;
  }
}

// ======================================================
// ADDRESS VALIDATION
// ======================================================

function setAddressError(fieldName, message) {
  const errorElement = document.querySelector(
    `[data-address-error="${fieldName}"]`,
  );

  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;
}

function clearAddressErrors() {
  document.querySelectorAll(".profile-form-error").forEach((errorElement) => {
    errorElement.textContent = "";
  });
}

function validateAddress() {
  clearAddressErrors();

  const label = addressLabelInput.value.trim();

  const address = addressValueInput.value.trim();

  let isValid = true;

  if (label.length < 2) {
    setAddressError("label", "Enter an address label.");

    isValid = false;
  }

  if (address.length < 5) {
    setAddressError("address", "Enter your delivery address.");

    isValid = false;
  }

  return isValid;
}

// ======================================================
// CREATE ADDRESS
// ======================================================

function createAddress() {
  return {
    id: `ADDR-${Date.now()}`,

    label: addressLabelInput.value.trim(),

    address: addressValueInput.value.trim(),

    landmark: addressLandmarkInput.value.trim(),

    isDefault: addressDefaultInput.checked,
  };
}

// ======================================================
// SAVE ADDRESS
// ======================================================

function handleAddressSubmit(event) {
  event.preventDefault();

  if (!validateAddress()) {
    return;
  }

  const profile = loadUserProfile();

  if (!profile) {
    return;
  }

  let addresses = profile.addresses || [];

  // ==================================================
  // EDIT EXISTING ADDRESS
  // ==================================================

  if (editingAddressId) {
    const shouldBeDefault = addressDefaultInput.checked;

    addresses = addresses.map((address) => {
      // Is this the address being edited?

      if (address.id === editingAddressId) {
        return {
          ...address,

          label: addressLabelInput.value.trim(),

          address: addressValueInput.value.trim(),

          landmark: addressLandmarkInput.value.trim(),

          isDefault: shouldBeDefault ? true : address.isDefault,
        };
      }

      // If the edited address is becoming default,
      // every OTHER address must stop being default.

      if (shouldBeDefault) {
        return {
          ...address,
          isDefault: false,
        };
      }

      // Nothing happened to this address.

      return address;
    });
  }

  // ==================================================
  // ADD NEW ADDRESS
  // ==================================================
  else {
    const newAddress = createAddress();

    // First address automatically becomes default.

    if (addresses.length === 0) {
      newAddress.isDefault = true;
    }

    // If this new address should be default,
    // remove default status from existing addresses.

    if (newAddress.isDefault) {
      addresses = addresses.map((address) => {
        return {
          ...address,
          isDefault: false,
        };
      });
    }

    addresses = [...addresses, newAddress];
  }

  // ==================================================
  // SAVE UPDATED PROFILE
  // ==================================================

  profile.addresses = addresses;

  profile.updatedAt = new Date().toISOString();

  saveUserProfile(profile);

  renderAddresses(profile);

  addressForm.reset();

  editingAddressId = null;

  closeAddressModal();
}

// ======================================================
// DELETE ADDRESS
// ======================================================

function deleteAddress(addressId) {
  const profile = loadUserProfile();

  if (!profile) {
    return;
  }

  const addresses = profile.addresses || [];

  const addressToDelete = addresses.find((address) => {
    return address.id === addressId;
  });

  if (!addressToDelete) {
    return;
  }

  let updatedAddresses = addresses.filter((address) => {
    return address.id !== addressId;
  });

  if (addressToDelete.isDefault && updatedAddresses.length > 0) {
    updatedAddresses = updatedAddresses.map((address, index) => {
      return {
        ...address,
        isDefault: index === 0,
      };
    });
  }

  profile.addresses = updatedAddresses;

  profile.updatedAt = new Date().toISOString();

  saveUserProfile(profile);

  renderAddresses(profile);
}

// ======================================================
// INITIALIZATION
// ======================================================

function initializeProfile() {
  const profile = loadUserProfile();

  if (!profile) {
    return;
  }

  renderProfile(profile);

  renderAddresses(profile);

  document.addEventListener("click", handleProfileAction);

  addressForm.addEventListener("submit", handleAddressSubmit);

  personalInfoForm.addEventListener("submit", handlePersonalInfoSubmit);

  initializeCartUI();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

initializeProfile();
