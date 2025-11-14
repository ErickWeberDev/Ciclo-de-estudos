const MAX_HOURS = 300; // limite prático para evitar problemas de performance
const form = document.getElementById("add-subject-form");
const container = document.getElementById("subjects-container");
const template = document.getElementById("subject-template");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importInput = document.getElementById("import-input");

// Gerar UUID com fallback
function uuid() {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}

// --- save debounce ---
let saveTimer = null;
function saveData() {
  const data = [];
  container.querySelectorAll(".subject-card").forEach((card) => {
    const id = card.dataset.subjectId;
    const title = card.querySelector(".subject-title").textContent;
    const hours = parseInt(
      card.querySelectorAll(".subject-checkboxes input").length
    );
    const checks = Array.from(
      card.querySelectorAll(".subject-checkboxes input")
    ).map((chk) => chk.checked);
    data.push({ id, title, hours, checks });
  });
  try {
    localStorage.setItem("studySubjects", JSON.stringify(data));
  } catch (err) {
    console.error("Não foi possível salvar no localStorage:", err);
  }
}
function saveDataDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveData, 300);
}

function loadData() {
  const saved = localStorage.getItem("studySubjects");
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    if (!Array.isArray(data)) return;
    data.forEach((item) => {
      const title = typeof item.title === "string" ? item.title : "Matéria";
      let hours =
        Number.isInteger(item.hours) && item.hours > 0
          ? item.hours
          : Array.isArray(item.checks)
          ? item.checks.length
          : 1;
      if (hours > MAX_HOURS) hours = MAX_HOURS; // normaliza
      const checks = Array.isArray(item.checks)
        ? item.checks.map((v) => !!v).slice(0, hours)
        : Array(hours).fill(false);
      createSubject(title, hours, item.id || uuid(), checks);
    });
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
  }
}

function createSubject(title, hours, id, checks = []) {
  // normaliza hours
  hours = Math.max(1, Math.min(MAX_HOURS, Number(hours) || 1));
  if (!id) id = uuid();

  const clone = template.content.cloneNode(true);
  const card = clone.querySelector(".subject-card");
  card.dataset.subjectId = id;
  card.querySelector(".subject-title").textContent = title;
  card.querySelector(".subject-hours").textContent = `${hours} ciclos`;

  const progress = card.querySelector(".subject-progress");
  progress.max = hours;
  progress.setAttribute("aria-valuemin", 0);
  progress.setAttribute("aria-valuemax", hours);
  progress.setAttribute("role", "progressbar");

  const boxContainer = card.querySelector(".subject-checkboxes");
  const clearBtn = card.querySelector(".clear-progress");

  function updateProgress() {
    const checked = card.querySelectorAll(
      ".subject-checkboxes input:checked"
    ).length;
    progress.value = checked;
    progress.setAttribute("aria-valuenow", checked);
    clearBtn.style.display = checked === hours ? "inline-block" : "none";
    saveDataDebounced();
  }

  for (let i = 0; i < hours; i++) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!checks[i];
    input.setAttribute("aria-label", `Ciclo ${i + 1} - ${title}`);
    input.addEventListener("change", updateProgress);
    label.appendChild(input);
    label.append(` ${i + 1}`);
    boxContainer.appendChild(label);
  }

  clearBtn.addEventListener("click", () => {
    card
      .querySelectorAll(".subject-checkboxes input")
      .forEach((chk) => (chk.checked = false));
    updateProgress();
    saveData(); // garantir gravação imediata após limpar
  });

  card.querySelector(".delete-subject").addEventListener("click", () => {
    if (confirm("Tem certeza que deseja excluir esta matéria?")) {
      card.remove();
      saveData();
    }
  });

  container.appendChild(card);
  updateProgress();
}

// Exportar matérias para JSON com timestamp no nome
exportBtn.addEventListener("click", () => {
  const data = [];
  container.querySelectorAll(".subject-card").forEach((card) => {
    const id = card.dataset.subjectId;
    const title = card.querySelector(".subject-title").textContent;
    const hours = card.querySelectorAll(".subject-checkboxes input").length;
    const checks = Array.from(
      card.querySelectorAll(".subject-checkboxes input")
    ).map((chk) => chk.checked);
    data.push({ id, title, hours, checks });
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  a.download = `materias-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// Importar matérias a partir de JSON
importBtn.addEventListener("click", () => importInput.click());

importInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (!Array.isArray(data))
        throw new Error("Formato inválido: esperado um array de matérias");

      if (container.children.length > 0) {
        const confirmed = confirm(
          "Ao importar, as matérias atuais serão substituídas. Deseja continuar?"
        );
        if (!confirmed) return;
      }

      // Limpa e cria
      container.innerHTML = "";
      data.forEach((item) => {
        const title = typeof item.title === "string" ? item.title : "Matéria";
        let hours =
          Number.isInteger(item.hours) && item.hours > 0
            ? item.hours
            : Array.isArray(item.checks)
            ? item.checks.length
            : 1;
        if (hours > MAX_HOURS) {
          alert(
            `A matéria "${title}" tem mais que ${MAX_HOURS} ciclos. Será limitada a ${MAX_HOURS}.`
          );
          hours = MAX_HOURS;
        }
        const checks = Array.isArray(item.checks)
          ? item.checks.map((v) => !!v).slice(0, hours)
          : Array(hours).fill(false);
        const id = item.id || uuid();
        createSubject(title, hours, id, checks);
      });

      saveData();
      alert("Importação concluída com sucesso.");
    } catch (err) {
      alert("Erro ao importar arquivo: " + err.message);
      console.error(err);
    } finally {
      importInput.value = "";
    }
  };
  reader.readAsText(file);
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("subject-name").value.trim();
  let hours = parseInt(document.getElementById("subject-hours").value);
  if (!name || isNaN(hours) || hours < 1) return;
  if (hours > MAX_HOURS) {
    alert(`Máximo de ciclos por matéria: ${MAX_HOURS}. O valor será ajustado.`);
    hours = MAX_HOURS;
  }
  createSubject(name, hours);
  saveData();
  form.reset();
});

loadData();
