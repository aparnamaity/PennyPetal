# 🌸 PennyPetal: Pastel Expense Tracker

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)

**PennyPetal** is a modern, responsive personal expense tracker and budget management web application designed for **students**, **developers**, and **finance-conscious individuals** who want an elegant, distraction-free tool to manage their daily spending. Built with a high-performance **FastAPI** Python backend, lightweight **SQLite** persistence, and an interactive **Chart.js** frontend, PennyPetal delivers a mature pastel fintech experience that helps users record transactions in Indian Rupees (₹), analyze category spending habits, and safeguard their savings through automated, multi-tiered monthly budget alerts.

---

## 🚀 Key Features

- **Expense CRUD Management**: Log expenses with item description, amount in ₹, category, date, and payment method, browse complete transaction history, and delete records via a confirmation modal.
- **Auto-Generated Sequential IDs**: Automatically assigns formatted sequential identifiers (e.g. `EOO1`, `EOO2`) to every newly created transaction.
- **Live Receipt Preview**: Dynamically updates an interactive physical receipt preview card in real time as transaction details are typed into the form.
- **Monthly Budget Configuration**: Define custom monthly spending targets with quick preset buttons (₹5,000, ₹10,000, ₹20,000, ₹35,000, ₹50,000).
- **Tiered Budget Health Alerts**: Color-coded automated thresholds that evaluate utilization and notify users at Optimal Zone (<75%), Cautionary Peach (75%), Critical Coral (90%), and Limit Exceeded (>100%).
- **Interactive Category Donut Chart**: Visualizes category spending distribution using Chart.js and highlights the top-spending category automatically.
- **Real-Time Search & Category Filtering**: Instantly search ledger entries by item description or filter transactions by specific expense categories.
- **Dual Aesthetic Themes**: Seamlessly toggle between a soft cream/blush light mode and a high-contrast Dark Plum theme (`#190C1F`) with persistent state.
- **Adaptive Cross-Device Navigation**: Features a desktop left sidebar and an adaptive sticky bottom navigation bar for mobile viewports.
- **Progressive Web App (PWA) Ready**: Includes a web app manifest (`manifest.json`) and high-resolution application icons for home screen installation.

---

## 🛠 Technology Stack

- **Backend Framework**: [FastAPI](https://fastapi.tiangolo.com/) (`>=0.110.0`) - High-performance Python async framework with automated OpenAPI documentation.
- **ASGI Web Server**: [Uvicorn](https://www.uvicorn.org/) (`>=0.29.0`) - Fast asynchronous server implementation for Python.
- **Database**: SQLite3 - Embedded, zero-configuration relational database via Python's standard library.
- **Data Validation & Serialization**: Pydantic v2 - Strict schema validation and type-safe request/response models.
- **Frontend Core**: Vanilla HTML5, CSS3 (Custom Properties & Flexbox/Grid), and JavaScript (ES6+).
- **Data Visualization**: [Chart.js](https://www.chartjs.org/) (v4.4.1) - Client-side interactive donut chart rendering via CDN.
- **Typography & Icons**: [Google Fonts (Poppins)](https://fonts.google.com/specimen/Poppins) and custom inline SVG vector icons.
- **App Standards**: Web App Manifest (`manifest.json`) enabling mobile and desktop PWA standalone execution.

---

## 📁 Repository Structure

```text
PennyPetal/
├── .gitignore               # Git ignore rules for virtual environments, caches, and database files
├── database.py              # SQLite schema initialization, CRUD operations, and summary metric queries
├── LICENSE                  # MIT open-source license
├── main.py                  # FastAPI application entry point, REST endpoints, and static file mounting
├── pennypetal.db            # Local SQLite database file (created automatically on startup)
├── README.md                # Project documentation and execution instructions
├── requirements.txt         # Project dependencies (FastAPI, Uvicorn)
├── schemas.py               # Pydantic data validation models and API response schemas
├── screenshots/             # Visual previews of the application interface
│   ├── add-expense.png      # Screenshot of the Add Expense form with live receipt preview
│   └── dashboard.png        # Screenshot of the main financial metrics dashboard
└── static/                  # Client-side static assets and frontend application files
    ├── index.html           # Single-page application markup with multi-view layout
    ├── logo.svg             # Primary vector brand logo with floral coin motif
    ├── logo-192.png         # PWA home screen icon (192x192)
    ├── logo-512.png         # PWA splash screen icon (512x512)
    ├── manifest.json        # Web app manifest for mobile and desktop PWA installation
    ├── css/
    │   └── style.css        # Responsive layout styles, pastel CSS variables, and Dark Plum theme
    └── js/
        └── app.js           # Frontend state, API integration, Chart.js logic, and view switching
```

---

## 💻 Setup & Execution

### Prerequisites

Ensure the following tools are installed on your system:
- Python 3.9 or higher
- Git

### Installation Steps

1. Clone the repository:

```bash
git clone https://github.com/aparnamaity/PennyPetal.git
```

```bash
cd PennyPetal
```

2. Create and activate a virtual environment:

On Windows (PowerShell):

```powershell
python -m venv venv
.\venv\Scripts\activate
```

On macOS / Linux:

```bash
python3 -m venv venv
source venv/bin/activate
```

3. Install project dependencies:

```bash
pip install -r requirements.txt
```

4. Start the FastAPI development server:

```bash
uvicorn main:app --reload
```

5. Open the local application URL:

Open your web browser and navigate to:

```text
http://127.0.0.1:8000
```

Interactive Swagger API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

---

## 👥 Credits

Created by [Aparna Maity](https://github.com/aparnamaity)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
