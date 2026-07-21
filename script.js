const body = document.body;
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = [...document.querySelectorAll(".primary-nav a")];
const bookingForm = document.querySelector(".booking-form");
const bookingEmail = "info@tentasolutions.co.uk";
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

bookingForm?.addEventListener("submit", (event) => {
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

  const subject = `WonderWorks booking request - ${bookingDetails.childName}`;
  const bodyLines = [
    "WonderWorks Holiday Club booking request",
    "",
    `Booking reference: ${bookingReference}`,
    "",
    "Parent or guardian details",
    `Full name: ${bookingDetails.guardianName}`,
    `Mobile number: ${bookingDetails.guardianPhone}`,
    `Email address: ${bookingDetails.guardianEmail}`,
    "",
    "Child's details",
    `Child's full name: ${bookingDetails.childName}`,
    `Age: ${bookingDetails.childAge}`,
    `Allergies, medical conditions or medication: ${bookingDetails.medicalInfo}`,
    `Emergency contact name: ${bookingDetails.emergencyName}`,
    `Emergency contact number: ${bookingDetails.emergencyPhone}`,
    "",
    "Selected week or weeks",
    ...selectedWeeks.map((week) => `- ${week}`),
    "",
    "Keepsake recording consent",
    bookingDetails.recordingConsent,
    "",
    "Marketing photos consent",
    bookingDetails.photoConsent,
    "",
    "Final agreement",
    "Parent or guardian confirmed they have read the booking terms and cancellation information.",
  ];
  const mailto = new URL(`mailto:${bookingEmail}`);
  mailto.searchParams.set("subject", subject);
  mailto.searchParams.set("body", bodyLines.join("\n"));

  if (feedback) {
    feedback.textContent = `Your booking email is addressed to ${bookingEmail}. Please send it from your email app. Reference: ${bookingReference}.`;
    feedback.classList.remove("error");
  }
  window.location.href = mailto.toString();
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
