require("dotenv").config();

const express = require("express");
const path = require("path");
const Stripe = require("stripe");

const app = express();
const port = process.env.PORT || 4173;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const weekPricePence = Number(process.env.WW_WEEK_PRICE_PENCE || 20000);
const depositPercent = Number(process.env.WW_DEPOSIT_PERCENT || 25);

app.use(express.json({ limit: "32kb" }));
app.use(express.static(__dirname));

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function normaliseBooking(rawBooking) {
  const weeks = Array.isArray(rawBooking.weeks) ? rawBooking.weeks.filter(Boolean) : [];
  if (weeks.length === 0) {
    throw new Error("At least one week is required");
  }

  return {
    guardianName: requireText(rawBooking.guardianName, "Parent or guardian name"),
    guardianPhone: requireText(rawBooking.guardianPhone, "Mobile number"),
    guardianEmail: requireText(rawBooking.guardianEmail, "Email address"),
    childName: requireText(rawBooking.childName, "Child name"),
    childAge: requireText(rawBooking.childAge, "Age"),
    medicalInfo: requireText(rawBooking.medicalInfo, "Medical information"),
    emergencyName: requireText(rawBooking.emergencyName, "Emergency contact name"),
    emergencyPhone: requireText(rawBooking.emergencyPhone, "Emergency contact number"),
    recordingConsent: requireText(rawBooking.recordingConsent, "Keepsake recording consent"),
    photoConsent: requireText(rawBooking.photoConsent, "Marketing photos consent"),
    termsAgreement: rawBooking.termsAgreement === "on" || rawBooking.termsAgreement === true,
    weeks,
  };
}

function truncateMetadata(value, maxLength = 480) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

app.post("/api/create-checkout-session", async (request, response) => {
  if (!stripe) {
    response.status(500).json({ error: "Stripe is not configured yet." });
    return;
  }

  try {
    const booking = normaliseBooking(request.body);
    if (!booking.termsAgreement) {
      throw new Error("Booking terms agreement is required");
    }

    const origin = request.get("origin") || `http://localhost:${port}`;
    const bookingReference = `WW-${Date.now().toString(36).toUpperCase()}`;
    const depositPence = Math.round((weekPricePence * depositPercent) / 100);
    const unitAmount = depositPence * booking.weeks.length;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: booking.guardianEmail,
      client_reference_id: bookingReference,
      success_url: `${origin}/?booking=success&reference=${bookingReference}#book`,
      cancel_url: `${origin}/?booking=cancelled#book`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: unitAmount,
            product_data: {
              name: `WonderWorks Holiday Club deposit (${booking.weeks.length} week${booking.weeks.length > 1 ? "s" : ""})`,
              description: booking.weeks.join(", "),
            },
          },
        },
      ],
      metadata: {
        bookingReference,
        guardianName: truncateMetadata(booking.guardianName),
        guardianPhone: truncateMetadata(booking.guardianPhone),
        childName: truncateMetadata(booking.childName),
        childAge: truncateMetadata(booking.childAge),
        weeks: truncateMetadata(booking.weeks),
        medicalInfo: truncateMetadata(booking.medicalInfo),
        emergencyName: truncateMetadata(booking.emergencyName),
        emergencyPhone: truncateMetadata(booking.emergencyPhone),
        recordingConsent: truncateMetadata(booking.recordingConsent),
        photoConsent: truncateMetadata(booking.photoConsent),
      },
    });

    response.json({ url: session.url, bookingReference });
  } catch (error) {
    response.status(400).json({ error: error.message || "Unable to create checkout session." });
  }
});

app.use((_request, response) => {
  response.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`WonderWorks site running at http://localhost:${port}`);
});
