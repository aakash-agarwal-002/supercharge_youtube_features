document.addEventListener("DOMContentLoaded", () => {
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute("href")).scrollIntoView({
        behavior: "smooth",
      });
    });
  });

  // Simple scroll reveal animation for feature cards
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  const cards = document.querySelectorAll(".feature-card");
  cards.forEach((card, index) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(30px)";
    card.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s, box-shadow 0.3s`;
    observer.observe(card);
  });

  // Subtle parallax effect on hero thumbnail
  const hero = document.querySelector(".hero");
  const thumbnail = document.querySelector(".thumbnail-card");

  if (window.matchMedia("(min-width: 992px)").matches) {
    hero.addEventListener("mousemove", (e) => {
      const xAxis = (window.innerWidth / 2 - e.pageX) / 50;
      const yAxis = (window.innerHeight / 2 - e.pageY) / 50;
      thumbnail.style.transform = `perspective(1000px) rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
    });

    hero.addEventListener("mouseleave", () => {
      thumbnail.style.transform = `perspective(1000px) rotateY(-5deg) rotateX(5deg)`;
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  Feedback forms → Google Apps Script → Google Sheet
  // ─────────────────────────────────────────────────────────────
  //
  // SETUP (one-time, ~3 minutes):
  //   1. Create a Google Sheet to receive feedback.
  //   2. In that sheet: Extensions → Apps Script. Replace the default code
  //      with the script below, then File → Save.
  //   3. Deploy → New deployment → type "Web app".
  //        - Execute as: Me
  //        - Who has access: Anyone
  //      Copy the resulting Web App URL.
  //   4. Paste that URL into APPS_SCRIPT_URL below.
  //
  // ─── Apps Script (paste into the sheet's Apps Script editor) ───
  //
  //   const HEADER = ['Timestamp', 'Type', 'Platform', 'Kind',
  //                   'Source', 'Sites', 'Reasons', 'Improvements',
  //                   'Message', 'Email', 'UserAgent'];
  //
  //   function doPost(e) {
  //     const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  //     if (sheet.getLastRow() === 0) sheet.appendRow(HEADER);
  //     const data = JSON.parse(e.postData.contents || '{}');
  //     sheet.appendRow([
  //       new Date(),
  //       data.type || '',
  //       data.platform || '',
  //       data.kind || '',
  //       data.source || '',
  //       (data.sites || []).join(', '),
  //       (data.reasons || []).join(', '),
  //       (data.improvements || []).join(', '),
  //       data.message || '',
  //       data.email || '',
  //       data.userAgent || ''
  //     ]);
  //     return ContentService.createTextOutput(JSON.stringify({ ok: true }))
  //       .setMimeType(ContentService.MimeType.JSON);
  //   }
  //
  // ───────────────────────────────────────────────────────────────

  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbypuFOguMznr3TIU3ItUVszm9XN90JYKM15ANNDhzdc7WmkmfYttJCBKR1DEkv8VyIIfQ/exec";

  async function submitFeedback(payload) {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.startsWith("REPLACE_")) {
      throw new Error("Form endpoint not configured");
    }
    // Apps Script web apps don't reliably handle CORS preflight, so we send as
    // text/plain (a "simple" CORS request that doesn't trigger preflight) and
    // use no-cors mode. We can't read the response body, but the Sheet still
    // gets the row — assume success unless the network call itself throws.
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
  }

  function setStatus(el, kind, text) {
    if (!el) return;
    el.dataset.kind = kind; // "info" | "success" | "error"
    el.textContent = text;
  }

  // ── General feedback form (popup → companion site) ──
  const generalForm = document.getElementById("generalFeedbackForm");
  const generalStatus = document.getElementById("generalFeedbackStatus");
  if (generalForm) {
    // Pre-fill platform from URL (?platform=youtube|hotstar|sonyliv|none)
    const params = new URLSearchParams(window.location.search);
    const incomingPlatform = (params.get("platform") || "").toLowerCase();
    const platformMap = {
      youtube: "YouTube",
      hotstar: "JioHotstar",
      sonyliv: "SonyLIV",
    };
    const presetPlatform = platformMap[incomingPlatform];
    if (presetPlatform) {
      const radio = generalForm.querySelector(
        `input[name="platform"][value="${presetPlatform}"]`,
      );
      if (radio) radio.checked = true;
    }

    generalForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(generalForm);
      const submitBtn = generalForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      setStatus(generalStatus, "info", "Sending…");

      try {
        await submitFeedback({
          type: "general",
          source: params.get("source") || "direct",
          platform: (fd.get("platform") || "").toString(),
          kind: (fd.get("kind") || "").toString(),
          message: (fd.get("message") || "").toString().trim(),
          email: (fd.get("email") || "").toString().trim(),
          userAgent: navigator.userAgent,
        });
        generalForm.reset();
        setStatus(
          generalStatus,
          "success",
          "Thanks — your feedback has been recorded.",
        );
      } catch (err) {
        setStatus(
          generalStatus,
          "error",
          "Couldn't send right now. Please try again in a moment.",
        );
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // ── Uninstall feedback form ──
  const feedbackForm = document.getElementById("feedbackForm");
  const uninstallStatus = document.getElementById("uninstallFeedbackStatus");
  if (feedbackForm) {
    feedbackForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(feedbackForm);
      const submitBtn = feedbackForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      setStatus(uninstallStatus, "info", "Sending…");

      try {
        await submitFeedback({
          type: "uninstall",
          sites: fd.getAll("site"),
          reasons: fd.getAll("reason"),
          improvements: fd.getAll("improve"),
          message: (fd.get("other") || "").toString().trim(),
          userAgent: navigator.userAgent,
        });
        feedbackForm.reset();
        setStatus(
          uninstallStatus,
          "success",
          "Thank you — your feedback has been recorded.",
        );
      } catch (err) {
        setStatus(
          uninstallStatus,
          "error",
          "Couldn't send right now. Please try again in a moment.",
        );
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // Auto-scroll to the targeted section when arriving via #feedback or
  // #uninstall-feedback (the IntersectionObserver above only animates cards).
  const hashTarget = window.location.hash.replace("#", "");
  if (hashTarget === "feedback" || hashTarget === "uninstall-feedback") {
    document.getElementById(hashTarget)?.scrollIntoView({ behavior: "smooth" });
  }
});
