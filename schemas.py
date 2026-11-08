from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any

class ExpenseCreate(BaseModel):
    item: str = Field(..., min_length=1, description="Item or reason for expense")
    amount: float = Field(..., gt=0, description="Amount in ₹, must be greater than 0")
    category: str = Field(..., min_length=1, description="Expense category")
    date: str = Field(..., min_length=1, description="Date in DD-MM-YYYY format")
    pay: str = Field(..., min_length=1, description="Payment method")

    @field_validator('item', 'category', 'date', 'pay')
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()

class ExpenseResponse(BaseModel):
    id: str
    item: str
    amount: float
    category: str
    date: str
    pay: str
    created_at: Optional[str] = None

class BudgetUpdate(BaseModel):
    amount: float = Field(..., ge=0, description="Monthly budget in ₹ (0 or greater)")

class BudgetResponse(BaseModel):
    budget: float
    message: str

class SummaryResponse(BaseModel):
    total_spent: float
    total_count: int
    budget: float
    remaining: float
    percentage: float
    alert_status: str
    alert_message: str
    category_totals: Dict[str, float]
    highest_category: Optional[Dict[str, Any]]
    recent_expenses: List[ExpenseResponse]
