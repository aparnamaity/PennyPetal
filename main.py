from fastapi import FastAPI, HTTPException, Query, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List, Optional
import os

from database import (
    init_db,
    add_expense,
    get_expenses,
    get_expense_by_id,
    delete_expense,
    get_budget,
    set_budget,
    get_summary
)
from schemas import (
    ExpenseCreate,
    ExpenseResponse,
    BudgetUpdate,
    BudgetResponse,
    SummaryResponse
)

# Initialize database schema
init_db()

app = FastAPI(
    title="PennyPetal API",
    description="Soft girly pastel expense tracker API",
    version="1.0.0"
)

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

# REST Endpoints

@app.get("/expenses", response_model=List[ExpenseResponse])
def read_expenses(search: Optional[str] = Query(None, description="Search term for item name")):
    """Get all expenses, optionally filtered by item search string."""
    return get_expenses(search)

@app.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(expense_in: ExpenseCreate):
    """Add a new expense with auto-generated ID."""
    created = add_expense(
        item=expense_in.item,
        amount=expense_in.amount,
        category=expense_in.category,
        date=expense_in.date,
        pay=expense_in.pay
    )
    return created

@app.delete("/expenses/{expense_id}")
def remove_expense(expense_id: str):
    """Delete an expense by ID."""
    success = delete_expense(expense_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with ID '{expense_id}' not found."
        )
    return {"message": f"Expense {expense_id} deleted successfully", "id": expense_id}

@app.get("/budget", response_model=BudgetResponse)
def read_budget():
    """Get current monthly budget."""
    current_budget = get_budget()
    return BudgetResponse(budget=current_budget, message="Budget fetched successfully")

@app.post("/budget", response_model=BudgetResponse)
def update_budget(budget_in: BudgetUpdate):
    """Set or update monthly budget."""
    new_budget = set_budget(budget_in.amount)
    return BudgetResponse(budget=new_budget, message="Budget updated successfully!")

@app.get("/summary", response_model=SummaryResponse)
def read_summary():
    """Get full spending summary including budget alerts, category totals, and highest spender."""
    return get_summary()

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/manifest.json")
def serve_manifest():
    """Serve the Web App Manifest."""
    return FileResponse(os.path.join(STATIC_DIR, "manifest.json"), media_type="application/manifest+json")

@app.get("/favicon.ico")
def serve_favicon():
    """Serve the logo as favicon fallback."""
    return FileResponse(os.path.join(STATIC_DIR, "logo.svg"), media_type="image/svg+xml")

@app.get("/")
def serve_index():
    """Serve the single page application HTML."""
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))
