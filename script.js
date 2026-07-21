const body = document.body;
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = [...document.querySelectorAll(".primary-nav a")];
const bookingForm = document.querySelector(".booking-form");
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

menuToggle?.addEventListener("click", () => {
  const isOpen = body.classList.toggle("nav-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    body.classList.remove("nav-open");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "Open menu");
  });
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  },
  { rootMargin: "-38% 0px -55% 0px", threshold: 0 }
);

sections.forEach((section) => observer.observe(section));

bookingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const feedback = bookingForm.querySelector(".booking-feedback");
  const weekGroup = bookingForm.querySelector("[data-week-group]");
  const weekInputs = [...bookingForm.querySelectorAll('input[name="weeks"]')];
  const selectedWeeks = weekInputs.filter((input) => input.checked).map((input) => input.value);
  const isFormValid = bookingForm.checkValidity();
  const hasWeek = selectedWeeks.length > 0;

  weekGroup?.classList.toggle("is-invalid", !hasWeek);

  if (!isFormValid || !hasWeek) {
    bookingForm.reportValidity();
    if (!hasWeek && feedback) {
      feedback.textContent = "Please choose at least one week before continuing.";
      feedback.classList.add("error");
    }
    return;
  }

  const formData = new FormData(bookingForm);
  const bookingReference = `WW-${Date.now().toString(36).toUpperCase()}`;
  const bookingDetails = Object.fromEntries(formData.entries());
  bookingDetails.weeks = selectedWeeks;
  bookingDetails.bookingReference = bookingReference;
  localStorage.setItem("wonderworksBooking", JSON.stringify(bookingDetails));

  const submitButton = bookingForm.querySelector('button[type="submit"]');
  const paymentLink = bookingForm.dataset.stripePaymentLink?.trim();
  const originalButtonText = submitButton?.textContent;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Preparing payment...";
  }
  if (feedback) {
    feedback.textContent = "";
    feedback.classList.remove("error");
  }

  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingDetails),
    });
    const result = await response.json();

    if (!response.ok || !result.url) {
      throw new Error(result.error || "Unable to start Stripe Checkout.");
    }

    window.location.href = result.url;
    return;
  } catch (error) {
    if (paymentLink) {
      try {
        const stripeUrl = new URL(paymentLink);
        stripeUrl.searchParams.set("prefilled_email", formData.get("guardianEmail"));
        stripeUrl.searchParams.set("client_reference_id", bookingReference);
        window.location.href = stripeUrl.toString();
        return;
      } catch {
        // Fall through to the form message below.
      }
    }

    if (feedback) {
      feedback.textContent =
        error.message === "Stripe is not configured yet."
          ? "Booking details are ready. Add the Stripe secret key on the server to enable payment."
          : error.message;
      feedback.classList.add("error");
    }
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  }
});

bookingForm?.querySelectorAll('input[name="weeks"]').forEach((input) => {
  input.addEventListener("change", () => {
    const weekGroup = bookingForm.querySelector("[data-week-group]");
    const feedback = bookingForm.querySelector(".booking-feedback");
    const hasWeek = [...bookingForm.querySelectorAll('input[name="weeks"]')].some((week) => week.checked);
    weekGroup?.classList.toggle("is-invalid", !hasWeek);
    if (hasWeek && feedback?.classList.contains("error")) {
      feedback.textContent = "";
      feedback.classList.remove("error");
    }
  });
});
