const STORAGE_KEY = "taskflow.tasks";

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const emptyTitle = document.querySelector("#empty-title");
const emptyDescription = document.querySelector("#empty-description");
const totalCount = document.querySelector("#total-count");
const completedCount = document.querySelector("#completed-count");
const activeCount = document.querySelector("#active-count");
const listCount = document.querySelector("#list-count");
const storageNotice = document.querySelector("#storage-notice");
const filterButtons = document.querySelectorAll("[data-filter]");

let tasks = loadTasks();
let activeFilter = "all";
let filterTransitionId = 0;

// Загружаем только данные ожидаемого формата, чтобы повреждённое хранилище не ломало страницу.
function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    if (savedTasks === null) {
      return [];
    }

    const parsedTasks = JSON.parse(savedTasks);
    if (
      !Array.isArray(parsedTasks) ||
      !parsedTasks.every(
        (task) =>
          task &&
          typeof task.id === "string" &&
          typeof task.text === "string" &&
          typeof task.completed === "boolean",
      )
    ) {
      throw new TypeError("Некорректный формат сохранённых задач.");
    }

    return parsedTasks;
  } catch (error) {
    console.error("Не удалось загрузить задачи TaskFlow:", error);
    storageNotice.hidden = false;
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    storageNotice.hidden = true;
  } catch (error) {
    console.error("Не удалось сохранить задачи TaskFlow:", error);
    storageNotice.hidden = false;
  }
}

function createIcon(pathMarkup) {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("fill", "none");
  icon.setAttribute("aria-hidden", "true");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathMarkup);
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.7");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  icon.append(path);

  return icon;
}

function getVisibleTasks() {
  if (activeFilter === "active") {
    return tasks.filter((task) => !task.completed);
  }

  if (activeFilter === "completed") {
    return tasks.filter((task) => task.completed);
  }

  return tasks;
}

function getTaskCountLabel(count) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${count} задач`;
  }
  if (lastDigit === 1) {
    return `${count} задача`;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} задачи`;
  }
  return `${count} задач`;
}

function updateFilterIndicator() {
  const selectedButton = [...filterButtons].find(
    (button) => button.dataset.filter === activeFilter,
  );
  if (!selectedButton) {
    return;
  }

  const filters = selectedButton.parentElement;
  filters.style.setProperty("--filter-indicator-x", `${selectedButton.offsetLeft}px`);
  filters.style.setProperty("--filter-indicator-width", `${selectedButton.offsetWidth}px`);
}

// Текст задачи добавляется как textContent, а не как HTML-разметка.
function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = "task-item";
  if (task.completed) {
    item.classList.add("is-completed");
  }

  const checkbox = document.createElement("input");
  checkbox.className = "task-checkbox";
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.id = `task-${task.id}`;
  checkbox.setAttribute(
    "aria-label",
    task.completed ? `Отметить задачу «${task.text}» активной` : `Отметить задачу «${task.text}» выполненной`,
  );
  checkbox.addEventListener("change", () => {
    task.completed = checkbox.checked;
    saveTasks();
    render();
  });

  const label = document.createElement("label");
  label.className = "task-text";
  label.htmlFor = checkbox.id;
  label.textContent = task.text;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Удалить задачу «${task.text}»`);
  deleteButton.append(createIcon("M4 7h16M10 11v6m4-6v6M6.5 7l.8 13h9.4l.8-13M9 7V4h6v3"));
  deleteButton.addEventListener("click", () => {
    tasks = tasks.filter((currentTask) => currentTask.id !== task.id);
    saveTasks();
    render();
  });

  item.append(checkbox, label, deleteButton);
  return item;
}

function updateEmptyState(visibleTasks) {
  const isEmpty = visibleTasks.length === 0;
  emptyState.hidden = !isEmpty;
  taskList.hidden = isEmpty;

  if (!isEmpty) {
    return;
  }

  if (tasks.length === 0) {
    emptyTitle.textContent = "Пока здесь тихо";
    emptyDescription.textContent = "Добавьте первую задачу — и начните с малого.";
  } else if (activeFilter === "active") {
    emptyTitle.textContent = "Все задачи выполнены";
    emptyDescription.textContent = "Отличная работа! Можно немного передохнуть.";
  } else if (activeFilter === "completed") {
    emptyTitle.textContent = "Пока ничего не выполнено";
    emptyDescription.textContent = "Отмечайте задачи галочкой, когда закончите.";
  }
}

function render() {
  const visibleTasks = getVisibleTasks();
  const completedTasks = tasks.filter((task) => task.completed).length;

  totalCount.textContent = String(tasks.length);
  completedCount.textContent = String(completedTasks);
  activeCount.textContent = String(tasks.length - completedTasks);
  listCount.textContent = getTaskCountLabel(tasks.length);

  taskList.replaceChildren(...visibleTasks.map(createTaskElement));
  updateEmptyState(visibleTasks);
}

function renderWithTransition() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    render();
    return;
  }

  const transitionId = ++filterTransitionId;
  const visibleContent = [taskList, emptyState].filter((element) => !element.hidden);
  const fadeOutAnimations = visibleContent.map((element) =>
    element.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-7px)" },
      ],
      { duration: 190, easing: "ease-in", fill: "forwards" },
    ),
  );

  Promise.all(fadeOutAnimations.map((animation) => animation.finished.catch(() => {}))).then(() => {
    if (transitionId !== filterTransitionId) {
      return;
    }

    render();

    const visibleContentAfterRender = [taskList, emptyState].filter(
      (element) => !element.hidden,
    );
    visibleContentAfterRender.forEach((element) => {
      element.animate(
        [
          { opacity: 0, transform: "translateY(7px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    });
  });
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) {
    taskInput.focus();
    return;
  }

  const id =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  tasks.push({ id, text, completed: false });
  activeFilter = "all";
  filterButtons.forEach((button) => {
    const isSelected = button.dataset.filter === activeFilter;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
  updateFilterIndicator();
  saveTasks();
  render();
  taskForm.reset();
  taskInput.focus();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((filterButton) => {
      const isSelected = filterButton === button;
      filterButton.classList.toggle("is-selected", isSelected);
      filterButton.setAttribute("aria-pressed", String(isSelected));
    });
    updateFilterIndicator();
    renderWithTransition();
  });
});

render();
updateFilterIndicator();
window.addEventListener("resize", updateFilterIndicator);