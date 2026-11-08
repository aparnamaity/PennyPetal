import sqlite3
import os
import re
from typing import Optional, List, Dict, Any

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pennypetal.db")

def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Create expenses table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            item TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            pay TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create budget table with default 0.0
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS budget (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            amount REAL NOT NULL DEFAULT 0.0
        )
    """)
    
    # Seed default budget 0.0 if not existing
    cursor.execute("INSERT OR IGNORE INTO budget (id, amount) VALUES (1, 0.0)")
    
    conn.commit()
    conn.close()

def clear_all_data():
    """Reset all expenses and reset budget to 0.0."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses")
    cursor.execute("UPDATE budget SET amount = 0.0 WHERE id = 1")
    conn.commit()
    conn.close()

def get_next_expense_id() -> str:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM expenses")
    rows = cursor.fetchall()
    conn.close()
    
    max_id = 0
    for row in rows:
        match = re.search(r'\d+', row["id"])
        if match:
            num = int(match.group())
            if num > max_id:
                max_id = num
    
    next_num = max_id + 1
    return f"EOO{next_num}"

def add_expense(item: str, amount: float, category: str, date: str, pay: str) -> Dict[str, Any]:
    expense_id = get_next_expense_id()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO expenses (id, item, amount, category, date, pay) VALUES (?, ?, ?, ?, ?, ?)",
        (expense_id, item.strip(), float(amount), category.strip(), date.strip(), pay.strip())
    )
    conn.commit()
    cursor.execute("SELECT * FROM expenses WHERE id = ?", (expense_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

def get_expenses(search: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    if search:
        search_term = f"%{search.strip().lower()}%"
        cursor.execute("SELECT * FROM expenses WHERE LOWER(item) LIKE ? ORDER BY ROWID DESC", (search_term,))
    else:
        cursor.execute("SELECT * FROM expenses ORDER BY ROWID DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_expense_by_id(expense_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM expenses WHERE UPPER(id) = UPPER(?)", (expense_id.strip(),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_expense(expense_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses WHERE UPPER(id) = UPPER(?)", (expense_id.strip(),))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def get_budget() -> float:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT amount FROM budget WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    return float(row["amount"]) if row else 0.0

def set_budget(amount: float) -> float:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO budget (id, amount) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET amount = excluded.amount",
        (float(amount),)
    )
    conn.commit()
    conn.close()
    return float(amount)

def get_summary() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    # All expenses
    cursor.execute("SELECT * FROM expenses ORDER BY ROWID DESC")
    all_rows = cursor.fetchall()
    expenses = [dict(r) for r in all_rows]
    
    # Budget
    cursor.execute("SELECT amount FROM budget WHERE id = 1")
    budget_row = cursor.fetchone()
    budget = float(budget_row["amount"]) if budget_row else 0.0
    conn.close()
    
    total_spent = sum(e["amount"] for e in expenses)
    total_count = len(expenses)
    
    # Category totals
    category_totals: Dict[str, float] = {}
    for e in expenses:
        cat = e["category"]
        category_totals[cat] = category_totals.get(cat, 0.0) + e["amount"]
    
    # Highest spending category
    highest_category = None
    if category_totals:
        sorted_cats = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
        highest_category = {
            "category": sorted_cats[0][0],
            "amount": sorted_cats[0][1]
        }
        
    remaining = budget - total_spent if budget > 0 else 0.0
    percentage = (total_spent / budget * 100) if budget > 0 else 0.0
    
    # Determine alert state
    alert_status = "none"
    alert_message = ""
    if budget == 0:
        alert_status = "no_budget"
        alert_message = "You have not set a budget yet. Set a monthly budget to monitor and control your spending."
    else:
        if total_spent > budget:
            alert_status = "exceeded"
            alert_message = f"Budget exceeded by ₹{total_spent - budget:.2f}."
        elif percentage >= 90:
            alert_status = "coral"
            alert_message = f"Budget alert: only ₹{remaining:.2f} remaining ({percentage:.1f}% used)."
        elif percentage >= 75:
            alert_status = "peach"
            alert_message = f"Spending alert: ₹{remaining:.2f} remaining ({percentage:.1f}% used)."
        else:
            alert_status = "normal"
            alert_message = f"Remaining budget: ₹{remaining:.2f} ({percentage:.1f}% used)."

    return {
        "total_spent": round(total_spent, 2),
        "total_count": total_count,
        "budget": round(budget, 2),
        "remaining": round(remaining, 2),
        "percentage": round(percentage, 1),
        "alert_status": alert_status,
        "alert_message": alert_message,
        "category_totals": {k: round(v, 2) for k, v in category_totals.items()},
        "highest_category": highest_category,
        "recent_expenses": expenses[:5]
    }
