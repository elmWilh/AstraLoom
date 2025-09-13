(function () {
  let currentLocale = null;
  let translations = {};

  function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (translations[key]) el.textContent = translations[key];
    });
  }

  async function loadLocale(locale) {
    try {
      const res = await fetch(`/assets/i18n/${locale}.json`);

      translations = await res.json();
      currentLocale = locale;
      applyTranslations();
    } catch (err) {
      console.error("i18n load error:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const sel = document.getElementById("locale");
    if (sel) {
      sel.addEventListener("change", () => {
        const newLocale = sel.value;
        if (newLocale && newLocale !== currentLocale) {
          loadLocale(newLocale);
          if (window.__P && window.__P.data) {
            window.__P.locale = newLocale;
          }
        }
      });
    }

    let boot = window.BUILDER_BOOT || {};
    loadLocale(boot.locale || "en");
  });

  window.i18n = { loadLocale, applyTranslations };
})();
