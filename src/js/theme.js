(function () {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  const KEY = "site-theme";

  // Preferência salva
  const saved = localStorage.getItem(KEY);

  // Se não houver preferências, usa o light
  const initial = saved || "light";

  applyTheme(initial);

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    btn.textContent = theme === "light" ? "Claro" : "Escuro";
  }

  btn.addEventListener("click", () => {
    const current =
      document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "light" ? "dark" : "light";
    applyTheme(next);
    localStorage.setItem(KEY, next);
  });
})();
