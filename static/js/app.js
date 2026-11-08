/**
 * PennyPetal - Financial Tracker Client Application
 * Clean, mature fintech interface with Chart.js visualization.
 */

// Global State
let expensesList = [];
let filteredExpenses = [];
let summaryData = null;
let currentBudget = 0;
let expenseToDelete = null;
let donutChart = null;
let activeSearchQuery = "";
let activeCategoryFilter = "ALL";

// Professional Pastel Palette for Category Visualizations
const categoryChartColors = [
  "#E8B4C8", // Blush Rose
  "#BDB2FF", // Lavender Slate
  "#A0E7E5", // Cool Mint
  "#FFC6A5", // Warm Sand
  "#FDFFB6", // Soft Butter
  "#9BF6FF", // Powder Blue
  "#CAFFBF", // Light Sage
  "#FFADAD", // Muted Coral
  "#D0D1FF", // Periwinkle
  "#E2CFEA"  // Dusty Lilac
];

// SVG Icons Helpers
const ICONS = {
  info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  alertTriangle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  alertOctagon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
};

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setDefaultDate();
  fetchAllData();
  updatePreview();

  // Dismiss splash screen after gentle petal rotation completes (1.1s)
  setTimeout(() => {
    const splash = document.getElementById("splash-screen");
    if (splash) {
      splash.classList.add("fade-out");
      setTimeout(() => splash.remove(), 550);
    }
  }, 1100);
});

// Format Indian Rupee currency
function formatINR(amount) {
  const num = Number(amount) || 0;
  return "₹" + num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Get today's date formatted as DD-MM-YYYY
function getTodayFormatted() {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function setDefaultDate() {
  const dateInput = document.getElementById("expense-date");
  if (dateInput && !dateInput.value) {
    dateInput.value = getTodayFormatted();
  }
}

// ==================== VIEW SWITCHING ====================
function switchView(viewName) {
  // Update desktop sidebar links
  document.querySelectorAll(".nav-link").forEach(btn => {
    btn.classList.remove("active");
  });
  // Update mobile bottom nav links
  document.querySelectorAll(".mobile-nav-link").forEach(btn => {
    btn.classList.remove("active");
  });

  // Activate selected nav buttons
  const activeSidebarBtn = document.querySelector(`.nav-link[onclick="switchView('${viewName}')"]`);
  if (activeSidebarBtn) activeSidebarBtn.classList.add("active");

  const activeMobileBtn = document.querySelector(`.mobile-nav-link[onclick="switchView('${viewName}')"]`);
  if (activeMobileBtn) activeMobileBtn.classList.add("active");

  // Switch view section
  document.querySelectorAll(".view-section").forEach(sec => {
    sec.classList.remove("active");
  });

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.add("active");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Refresh data if entering dashboard, expenses, or budget
  if (viewName === "dashboard" || viewName === "expenses" || viewName === "budget") {
    fetchAllData();
  }
}

// ==================== API DATA FETCHING ====================
async function fetchAllData() {
  try {
    const [expensesRes, summaryRes, budgetRes] = await Promise.all([
      fetch("/expenses"),
      fetch("/summary"),
      fetch("/budget")
    ]);

    if (expensesRes.ok) {
      expensesList = await expensesRes.json();
      applyFilters();
    }

    if (summaryRes.ok) {
      summaryData = await summaryRes.json();
      renderDashboardSummary();
      renderBudgetPage();
    }

    if (budgetRes.ok) {
      const budgetData = await budgetRes.json();
      currentBudget = budgetData.budget;
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    showToast("Error connecting to PennyPetal server", "danger");
  }
}

// ==================== DASHBOARD RENDERING ====================
function renderDashboardSummary() {
  if (!summaryData) return;

  // Metric Cards
  document.getElementById("dash-total-spent").textContent = formatINR(summaryData.total_spent);
  document.getElementById("dash-budget").textContent = formatINR(summaryData.budget);
  
  const remainingEl = document.getElementById("dash-remaining");
  const remainingSubEl = document.getElementById("dash-remaining-sub");
  
  if (summaryData.budget > 0) {
    if (summaryData.remaining < 0) {
      remainingEl.textContent = formatINR(Math.abs(summaryData.remaining));
      remainingEl.classList.add("text-danger");
      remainingSubEl.textContent = "Exceeded by this amount";
    } else {
      remainingEl.textContent = formatINR(summaryData.remaining);
      remainingEl.classList.remove("text-danger");
      remainingSubEl.textContent = "Remaining limit for this month";
    }
  } else {
    remainingEl.textContent = "₹0.00";
    remainingEl.classList.remove("text-danger");
    remainingSubEl.textContent = "No budget configured yet";
  }

  document.getElementById("dash-count").textContent = summaryData.total_count;

  // Budget Progress Bar & Alert Banner
  renderBudgetProgressBar(summaryData);

  // Highest Category Banner
  const highestCatName = document.getElementById("highest-cat-name");
  const highestCatAmount = document.getElementById("highest-cat-amount");

  if (summaryData.highest_category && summaryData.highest_category.amount > 0) {
    const catName = summaryData.highest_category.category;
    highestCatName.textContent = catName;
    highestCatAmount.textContent = formatINR(summaryData.highest_category.amount);
  } else {
    highestCatName.textContent = "None recorded";
    highestCatAmount.textContent = "₹0.00";
  }

  // Category Breakdown List
  renderCategoryList(summaryData.category_totals, summaryData.total_spent);

  // Donut Chart
  renderDonutChart(summaryData.category_totals);

  // Recent Expenses
  renderRecentExpenses(summaryData.recent_expenses);
}

// Render Budget Progress Bar & Dynamic Alerts
function renderBudgetProgressBar(summary) {
  const alertContainer = document.getElementById("dash-alert-container");
  const budgetAlertContainer = document.getElementById("budget-page-alert-container");
  const progressBar = document.getElementById("dash-progress-bar");
  const progressLabel = document.getElementById("dash-progress-label");

  const percentage = summary.percentage || 0;
  const clampedPercent = Math.min(Math.max(percentage, 0), 100);

  // Progress bar styling
  progressBar.style.width = `${clampedPercent}%`;
  progressLabel.textContent = summary.budget > 0 ? `${percentage.toFixed(1)}% used` : "0.0% used";

  // Class reset
  progressBar.className = "progress-bar-fill";

  let alertHTML = "";

  if (summary.alert_status === "no_budget") {
    alertHTML = `
      <div class="budget-alert-card no_budget">
        <span class="alert-icon">${ICONS.info}</span>
        <div class="alert-text-group">
          <div class="alert-title">No Budget Configured</div>
          <div class="alert-desc">Establish a monthly budget target to track your spending limits and activate threshold alerts.</div>
        </div>
      </div>
    `;
  } else if (summary.alert_status === "exceeded") {
    progressBar.classList.add("exceeded");
    alertHTML = `
      <div class="budget-alert-card exceeded">
        <span class="alert-icon">${ICONS.alertOctagon}</span>
        <div class="alert-text-group">
          <div class="alert-title">Budget Limit Exceeded</div>
          <div class="alert-desc">${summary.alert_message}</div>
        </div>
      </div>
    `;
  } else if (summary.alert_status === "coral") {
    progressBar.classList.add("coral");
    alertHTML = `
      <div class="budget-alert-card coral">
        <span class="alert-icon">${ICONS.alertTriangle}</span>
        <div class="alert-text-group">
          <div class="alert-title">Critical Budget Alert (90%+ Utilized)</div>
          <div class="alert-desc">${summary.alert_message}</div>
        </div>
      </div>
    `;
  } else if (summary.alert_status === "peach") {
    progressBar.classList.add("peach");
    alertHTML = `
      <div class="budget-alert-card peach">
        <span class="alert-icon">${ICONS.alertTriangle}</span>
        <div class="alert-text-group">
          <div class="alert-title">Spending Caution (75%+ Utilized)</div>
          <div class="alert-desc">${summary.alert_message}</div>
        </div>
      </div>
    `;
  } else {
    alertHTML = `
      <div class="budget-alert-card normal">
        <span class="alert-icon">${ICONS.check}</span>
        <div class="alert-text-group">
          <div class="alert-title">Expenditures On Track</div>
          <div class="alert-desc">${summary.alert_message}</div>
        </div>
      </div>
    `;
  }

  if (alertContainer) alertContainer.innerHTML = alertHTML;
  if (budgetAlertContainer) budgetAlertContainer.innerHTML = alertHTML;
}

// Render Donut Chart with Chart.js
function renderDonutChart(categoryTotals) {
  const ctx = document.getElementById("categoryDonutChart");
  const emptyMsg = document.getElementById("chart-empty-msg");
  if (!ctx) return;

  const labels = Object.keys(categoryTotals || {});
  const data = Object.values(categoryTotals || {});

  if (labels.length === 0 || data.every(v => v === 0)) {
    ctx.style.display = "none";
    emptyMsg.style.display = "flex";
    if (donutChart) {
      donutChart.destroy();
      donutChart = null;
    }
    return;
  }

  ctx.style.display = "block";
  emptyMsg.style.display = "none";

  const chartColors = categoryChartColors.slice(0, labels.length);

  if (donutChart) {
    donutChart.data.labels = labels;
    donutChart.data.datasets[0].data = data;
    donutChart.data.datasets[0].backgroundColor = chartColors;
    donutChart.update();
  } else {
    donutChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: chartColors,
          borderWidth: 2,
          borderColor: document.documentElement.getAttribute("data-theme") === "dark-plum" ? "#271631" : "#FFFFFF",
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              font: {
                family: "'Poppins', sans-serif",
                size: 11
              },
              color: document.documentElement.getAttribute("data-theme") === "dark-plum" ? "#FFFFFF" : "#4A2C5A",
              padding: 12
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || "";
                const val = context.raw || 0;
                return ` ${label}: ${formatINR(val)}`;
              }
            }
          }
        }
      }
    });
  }
}

// Category List in Dashboard
function renderCategoryList(categoryTotals, totalSpent) {
  const container = document.getElementById("dash-category-list");
  const subEl = document.getElementById("cat-count-sub");
  if (!container) return;

  const entries = Object.entries(categoryTotals || {}).sort((a, b) => b[1] - a[1]);
  subEl.textContent = `${entries.length} ${entries.length === 1 ? 'category' : 'categories'}`;

  if (entries.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 32px 0; font-size: 13px;">
        No category transactions recorded yet.
      </div>
    `;
    return;
  }

  container.innerHTML = entries.map(([cat, amount]) => {
    const percent = totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : 0;
    return `
      <div class="cat-breakdown-item">
        <div class="cat-name-icon">
          <span style="font-weight: 500;">${escapeHTML(cat)}</span>
          <span style="font-size: 11px; color: var(--text-muted);">(${percent}%)</span>
        </div>
        <div class="cat-amount-val">${formatINR(amount)}</div>
      </div>
    `;
  }).join("");
}

// Render Recent Expenses Table
function renderRecentExpenses(recent) {
  const tbody = document.getElementById("recent-expenses-tbody");
  if (!tbody) return;

  if (!recent || recent.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 28px; color: var(--text-muted);">
          No transactions logged yet. Add your first expense to begin tracking.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = recent.map(exp => {
    return `
      <tr>
        <td>${escapeHTML(exp.id)}</td>
        <td class="expense-item-name">${escapeHTML(exp.item)}</td>
        <td class="expense-amount-tag">${formatINR(exp.amount)}</td>
        <td><span class="category-tag">${escapeHTML(exp.category)}</span></td>
        <td>${escapeHTML(exp.date)}</td>
        <td><span class="pay-badge">${escapeHTML(exp.pay)}</span></td>
      </tr>
    `;
  }).join("");
}

// ==================== ALL EXPENSES VIEW ====================
function handleSearch(query) {
  activeSearchQuery = query.toLowerCase().trim();
  applyFilters();
}

function handleCategoryFilter(cat) {
  activeCategoryFilter = cat;
  applyFilters();
}

function applyFilters() {
  filteredExpenses = expensesList.filter(exp => {
    const matchSearch = !activeSearchQuery || exp.item.toLowerCase().includes(activeSearchQuery);
    const matchCat = activeCategoryFilter === "ALL" || exp.category === activeCategoryFilter;
    return matchSearch && matchCat;
  });

  renderAllExpensesTable();
}

function renderAllExpensesTable() {
  const tbody = document.getElementById("all-expenses-tbody");
  const emptyState = document.getElementById("expenses-empty-state");
  const countStat = document.getElementById("all-count-stat");
  const spentStat = document.getElementById("all-spent-stat");
  if (!tbody) return;

  // Stats calculation
  const totalSpent = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  countStat.textContent = filteredExpenses.length;
  spentStat.textContent = formatINR(totalSpent);

  if (filteredExpenses.length === 0) {
    tbody.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  tbody.innerHTML = filteredExpenses.map(exp => {
    return `
      <tr>
        <td>${escapeHTML(exp.id)}</td>
        <td class="expense-item-name">${escapeHTML(exp.item)}</td>
        <td class="expense-amount-tag">${formatINR(exp.amount)}</td>
        <td><span class="category-tag">${escapeHTML(exp.category)}</span></td>
        <td>${escapeHTML(exp.date)}</td>
        <td><span class="pay-badge">${escapeHTML(exp.pay)}</span></td>
        <td style="text-align: right;">
          <button class="btn btn-danger btn-sm" onclick="openDeleteModal('${escapeHTML(exp.id)}', '${escapeHTML(exp.item)}', ${exp.amount})">
            ${ICONS.trash} Delete
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

// ==================== DELETE MODAL LOGIC ====================
function openDeleteModal(id, item, amount) {
  expenseToDelete = id;
  const descEl = document.getElementById("delete-modal-desc");
  descEl.innerHTML = `
    Are you sure you want to delete transaction <strong>${escapeHTML(item)}</strong> (<code>${escapeHTML(id)}</code>) for <strong>${formatINR(amount)}</strong>?<br>
    This action cannot be undone.
  `;
  document.getElementById("delete-modal-overlay").classList.add("active");
}

function closeDeleteModal() {
  expenseToDelete = null;
  document.getElementById("delete-modal-overlay").classList.remove("active");
}

async function confirmDeleteExpense() {
  if (!expenseToDelete) return;

  try {
    const response = await fetch(`/expenses/${expenseToDelete}`, {
      method: "DELETE"
    });

    if (response.ok) {
      showToast(`Expense ${expenseToDelete} deleted successfully`, "success");
      closeDeleteModal();
      fetchAllData();
    } else {
      const err = await response.json();
      showToast(`Delete failed: ${err.detail || 'Item not found'}`, "danger");
      closeDeleteModal();
    }
  } catch (error) {
    console.error("Delete error:", error);
    showToast("Error deleting expense", "danger");
    closeDeleteModal();
  }
}

// ==================== ADD EXPENSE VIEW ====================
function selectCategory(cat) {
  document.getElementById("selected-category").value = cat;
  document.querySelectorAll(".cat-picker-pill").forEach(pill => {
    pill.classList.remove("active");
    if (pill.textContent.trim() === cat.trim()) {
      pill.classList.add("active");
    }
  });
  updatePreview();
}

function updatePreview() {
  const itemInput = document.getElementById("expense-item");
  const amountInput = document.getElementById("expense-amount");
  const dateInput = document.getElementById("expense-date");
  const catInput = document.getElementById("selected-category");
  const payInput = document.getElementById("expense-pay");

  const item = itemInput ? itemInput.value.trim() : "";
  const amount = amountInput ? parseFloat(amountInput.value) : 0;
  const date = dateInput ? dateInput.value.trim() : "";
  const cat = catInput ? catInput.value : "Food & Dining";
  const pay = payInput ? payInput.value : "UPI";

  document.getElementById("preview-item").textContent = item || "Item Name";
  document.getElementById("preview-amount").textContent = formatINR(amount || 0);
  document.getElementById("preview-date").textContent = date || getTodayFormatted();
  document.getElementById("preview-category").textContent = cat;
  document.getElementById("preview-pay").textContent = pay;
}

function resetExpenseForm() {
  document.getElementById("add-expense-form").reset();
  selectCategory("Food & Dining");
  setDefaultDate();
  updatePreview();
}

async function submitExpense(event) {
  event.preventDefault();

  const item = document.getElementById("expense-item").value.trim();
  const amountVal = document.getElementById("expense-amount").value.trim();
  const date = document.getElementById("expense-date").value.trim();
  const category = document.getElementById("selected-category").value;
  const pay = document.getElementById("expense-pay").value;

  // Validation
  const amount = parseFloat(amountVal);
  if (isNaN(amount) || amount <= 0) {
    showToast("Please enter a valid amount greater than ₹0", "danger");
    return;
  }

  if (!item) {
    showToast("Please enter an item description", "danger");
    return;
  }

  if (!date) {
    showToast("Please enter a date (DD-MM-YYYY)", "danger");
    return;
  }

  try {
    const response = await fetch("/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item, amount, category, date, pay })
    });

    if (response.ok) {
      const created = await response.json();
      showToast(`Expense added successfully (${created.id})`, "success");
      resetExpenseForm();
      fetchAllData();
      // Jump to dashboard
      setTimeout(() => switchView("dashboard"), 300);
    } else {
      const err = await response.json();
      showToast(`Error: ${JSON.stringify(err.detail)}`, "danger");
    }
  } catch (error) {
    console.error("Submit expense error:", error);
    showToast("Error adding expense", "danger");
  }
}

// ==================== BUDGET VIEW ====================
function renderBudgetPage() {
  if (!summaryData) return;

  const totalBudgetEl = document.getElementById("budget-page-total");
  const spentEl = document.getElementById("budget-page-spent");
  const remainingEl = document.getElementById("budget-page-remaining");
  const percentEl = document.getElementById("budget-page-percent");
  const progressBar = document.getElementById("budget-page-progress-bar");
  const statusPill = document.getElementById("budget-status-pill");

  totalBudgetEl.textContent = formatINR(summaryData.budget);
  spentEl.textContent = formatINR(summaryData.total_spent);
  remainingEl.textContent = formatINR(summaryData.remaining);

  const percent = summaryData.percentage || 0;
  percentEl.textContent = `${percent.toFixed(1)}%`;

  progressBar.className = "progress-bar-fill";
  progressBar.style.width = `${Math.min(Math.max(percent, 0), 100)}%`;

  statusPill.removeAttribute("style");
  if (summaryData.budget === 0) {
    statusPill.textContent = "No Budget Configured";
    statusPill.className = "category-tag status-no-budget";
  } else if (summaryData.remaining < 0) {
    progressBar.classList.add("exceeded");
    statusPill.textContent = "Budget Exceeded";
    statusPill.className = "category-tag status-exceeded";
  } else if (percent >= 90) {
    progressBar.classList.add("coral");
    statusPill.textContent = "Critical (90%+ Spent)";
    statusPill.className = "category-tag status-coral";
  } else if (percent >= 75) {
    progressBar.classList.add("peach");
    statusPill.textContent = "Caution (75%+ Spent)";
    statusPill.className = "category-tag status-peach";
  } else {
    statusPill.textContent = "On Track";
    statusPill.className = "category-tag status-normal";
  }
}

function setPresetBudget(amount) {
  const input = document.getElementById("budget-input-amount");
  if (input) input.value = amount;
}

async function submitBudget(event) {
  event.preventDefault();

  const amountInput = document.getElementById("budget-input-amount");
  const amount = parseFloat(amountInput.value);

  if (isNaN(amount) || amount < 0) {
    showToast("Please enter a valid budget amount", "danger");
    return;
  }

  try {
    const response = await fetch("/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount })
    });

    if (response.ok) {
      showToast(`Monthly budget set to ${formatINR(amount)}`, "success");
      amountInput.value = "";
      fetchAllData();
    } else {
      showToast("Failed to update budget", "danger");
    }
  } catch (error) {
    console.error("Budget update error:", error);
    showToast("Error updating budget", "danger");
  }
}

// ==================== THEME MANAGEMENT ====================
function initTheme() {
  const savedTheme = localStorage.getItem("pennypetal_theme") || "light";
  applyTheme(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "dark-plum" ? "light" : "dark-plum";
  applyTheme(current);
}

function applyTheme(theme) {
  const toggleBtnText = document.getElementById("theme-toggle-text");
  const mobileBtn = document.getElementById("mobile-theme-btn");
  const mobileHeaderBtn = document.getElementById("mobile-header-theme-btn");

  if (theme === "dark-plum") {
    document.documentElement.setAttribute("data-theme", "dark-plum");
    localStorage.setItem("pennypetal_theme", "dark-plum");
    if (toggleBtnText) toggleBtnText.textContent = "Light Cream Mode";
    if (mobileBtn) mobileBtn.textContent = "Light Mode";
    if (mobileHeaderBtn) mobileHeaderBtn.textContent = "Light";
  } else {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("pennypetal_theme", "light");
    if (toggleBtnText) toggleBtnText.textContent = "Dark Plum Mode";
    if (mobileBtn) mobileBtn.textContent = "Dark Mode";
    if (mobileHeaderBtn) mobileHeaderBtn.textContent = "Theme";
  }

  // Update chart if exists
  if (donutChart) {
    donutChart.options.plugins.legend.labels.color = theme === "dark-plum" ? "#FFFFFF" : "#4A2C5A";
    donutChart.data.datasets[0].borderColor = theme === "dark-plum" ? "#271631" : "#FFFFFF";
    donutChart.update();
  }
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = "normal") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let iconHtml = ICONS.info;
  if (type === "success") iconHtml = ICONS.check;
  if (type === "danger") iconHtml = ICONS.alertTriangle;

  toast.innerHTML = `<span style="display: flex; align-items: center;">${iconHtml}</span><span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Utility: Prevent XSS
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
