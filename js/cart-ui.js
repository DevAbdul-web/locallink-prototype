import { loadCart } from "./storage.js";

// ======================================================
// CART UI
// ======================================================

export function getCartQuantity() {
  const cart = loadCart();

  return cart.reduce((totalQuantity, cartItem) => {
    const quantity = Number(cartItem.quantity) || 1;

    return totalQuantity + quantity;
  }, 0);
}

export function updateCartCount() {
  const cartCountElements = document.querySelectorAll(
    "[data-cart-count]",
  );

  if (cartCountElements.length === 0) {
    return;
  }

  const totalQuantity = getCartQuantity();

  cartCountElements.forEach((element) => {
    element.textContent =
      totalQuantity > 99 ? "99+" : totalQuantity;

    element.hidden = totalQuantity === 0;
  });
}

export function initializeCartUI() {
  updateCartCount();
}