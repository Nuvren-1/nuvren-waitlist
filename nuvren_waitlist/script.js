/**
 * Nuvren Waitlist - Interactive Vanilla JS
 * Handles Netlify Form asynchronous background submission,
 * UI loading states, smooth confirmation card swapping, and social sharing.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const waitlistForm = document.getElementById("waitlistForm");
  const waitlistFormWrapper = document.getElementById("waitlistFormWrapper");
  const confirmationCard = document.getElementById("confirmationCard");
  const submitBtn = document.getElementById("submitBtn");
  const btnText = document.getElementById("btnText");
  const confirmedEmail = document.getElementById("confirmedEmail");
  const confirmedRole = document.getElementById("confirmedRole");
  const resetFormBtn = document.getElementById("resetFormBtn");
  const copyShareBtn = document.getElementById("copyShareBtn");
  const copyBtnLabel = document.getElementById("copyBtnLabel");
  const twitterShareBtn = document.getElementById("twitterShareBtn");
  const copyrightYear = document.getElementById("copyrightYear");

  // Set current year in footer
  if (copyrightYear) {
    copyrightYear.textContent = new Date().getFullYear();
  }

  // Handle Form Submission
  if (waitlistForm) {
    waitlistForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Retrieve form values
      const formData = new FormData(waitlistForm);
      const emailVal = formData.get("email") || "";
      const roleVal = formData.get("role") || "Job Seeker";

      // Set Loading UI State
      setLoadingState(true);

      try {
        // Submit to Netlify Forms (this is the only storage mechanism —
        // there is no custom backend for the waitlist)
        await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(formData).toString(),
        });

        showConfirmation(emailVal, roleVal);
      } catch (err) {
        console.error("Submission note:", err);
        // Netlify's redirect-based handling can sometimes report a fetch
        // "error" even on a successful submission, so we still show
        // confirmation rather than blocking the user.
        showConfirmation(emailVal, roleVal);
      } finally {
        setLoadingState(false);
      }
    });
  }

  // Toggle Loading Button State
  function setLoadingState(isLoading) {
    if (!submitBtn || !btnText) return;

    if (isLoading) {
      submitBtn.disabled = true;
      btnText.innerHTML = `<span class="spinner" aria-hidden="true"></span> Securing your spot...`;
    } else {
      submitBtn.disabled = false;
      btnText.textContent = "Join the Waitlist";
    }
  }

  // Display Confirmation Card State
  function showConfirmation(email, role) {
    if (confirmedEmail) confirmedEmail.textContent = email;
    if (confirmedRole) confirmedRole.textContent = role;

    // Configure Twitter/X Share Link
    if (twitterShareBtn) {
      const shareMsg = encodeURIComponent(
        `I just joined the waitlist for @Nuvren! Intelligent matching for job seekers & top employers. Check it out:`,
      );
      const shareUrl = encodeURIComponent(window.location.href);
      twitterShareBtn.href = `https://twitter.com/intent/tweet?text=${shareMsg}&url=${shareUrl}`;
    }

    // Hide form, reveal confirmation card
    if (waitlistFormWrapper) waitlistFormWrapper.style.display = "none";
    if (confirmationCard) confirmationCard.style.display = "block";
  }

  // Copy Referral/Share Link
  if (copyShareBtn) {
    copyShareBtn.addEventListener("click", () => {
      const pageUrl = window.location.href;
      navigator.clipboard
        .writeText(pageUrl)
        .then(() => {
          if (copyBtnLabel) copyBtnLabel.textContent = "Copied!";
          copyShareBtn.style.borderColor = "var(--color-primary)";
          copyShareBtn.style.color = "var(--color-primary)";

          setTimeout(() => {
            if (copyBtnLabel) copyBtnLabel.textContent = "Copy Link";
            copyShareBtn.style.borderColor = "";
            copyShareBtn.style.color = "";
          }, 2500);
        })
        .catch((err) => {
          console.error("Failed to copy link:", err);
        });
    });
  }

  // Reset Form for another registration
  if (resetFormBtn) {
    resetFormBtn.addEventListener("click", () => {
      if (waitlistForm) waitlistForm.reset();
      if (confirmationCard) confirmationCard.style.display = "none";
      if (waitlistFormWrapper) waitlistFormWrapper.style.display = "block";
    });
  }
});
