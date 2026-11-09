import os
import re
import sqlite3
from typing import Optional, List, Dict, Any

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pennypetal.db")

def get_database_url() -> Optional[str]:
    """Retrieve DATABASE_URL if configured, normalizing postgres:// to postgresql://."""
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        return None
    # Fix for hosting platforms (Render, Heroku) providing postgres:// prefix
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url

def is_postgres() -> bool:
    """Check if PostgreSQL is configured via DATABASE_URL and driver is available."""
    return bool(get_database_url()) and PSYCOPG2_AVAILABLE

def get_connection():
    """Return a database connection (PostgreSQL if DATABASE_URL is set, otherwise SQLite)."""
    db_url = get_database_url()
    if db_url:
        if not PSYCOPG2_AVAILABLE:
            raise RuntimeError(
                "DATABASE_URL is set for PostgreSQL, but psycopg2 is not installed. "
                "Install psycopg2-binary to connect to PostgreSQL."
            )
        return psycopg2.connect(db_url, cursor_factory=RealDictCursor)
    
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def execute_query(conn, query: str, params: tuple = ()):
    """Execute a parameterized query adapting placeholders for PostgreSQL (%s) vs SQLite (?)."""
    cursor = conn.cursor()
    if is_postgres():
        pg_query = query.replace("?", "%s")
        cursor.execute(pg_query, params)
    else:
        cursor.execute(query, params)
    return cursor

def format_row(row) -> Dict[str, Any]:
    """Convert a row to a dictionary with string-formatted timestamps for JSON compatibility."""
    if not row:
        return {}
    d = dict(row)
    if "created_at" in d and d["created_at"] is not None:
        if hasattr(d["created_at"], "strftime"):
            d["created_at"] = d["created_at"].strftime("%Y-%m-%d %H:%M:%S")
        else:
            d["created_at"] = str(d["created_at"])
    return d

def init_db():
    """Initialize database tables for expenses and budget targets."""
    conn = get_connection()
    try:
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
        cursor.execute("INSERT INTO budget (id, amount) VALUES (1, 0.0) ON CONFLICT (id) DO NOTHING")
        
        conn.commit()
    finally:
        conn.close()

def clear_all_data():
    """Reset all expenses and reset budget to 0.0."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM expenses")
        cursor.execute("UPDATE budget SET amount = 0.0 WHERE id = 1")
        conn.commit()
    finally:
        conn.close()

def get_next_expense_id() -> str:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM expenses")
        rows = cursor.fetchall()
    finally:
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
    try:
        execute_query(
            conn,
            "INSERT INTO expenses (id, item, amount, category, date, pay) VALUES (?, ?, ?, ?, ?, ?)",
            (expense_id, item.strip(), float(amount), category.strip(), date.strip(), pay.strip())
        )
        conn.commit()
        cursor = execute_query(conn, "SELECT * FROM expenses WHERE id = ?", (expense_id,))
        row = cursor.fetchone()
        return format_row(row)
    finally:
        conn.close()

def get_expenses(search: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        order_clause = "ORDER BY created_at DESC, id DESC" if is_postgres() else "ORDER BY ROWID DESC"
        if search:
            search_term = f"%{search.strip().lower()}%"
            cursor = execute_query(
                conn,
                f"SELECT * FROM expenses WHERE LOWER(item) LIKE ? {order_clause}",
                (search_term,)
            )
        else:
            cursor = execute_query(conn, f"SELECT * FROM expenses {order_clause}")
        rows = cursor.fetchall()
        return [format_row(row) for row in rows]
    finally:
        conn.close()

def get_expense_by_id(expense_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = execute_query(conn, "SELECT * FROM expenses WHERE UPPER(id) = UPPER(?)", (expense_id.strip(),))
        row = cursor.fetchone()
        return format_row(row) if row else None
    finally:
        conn.close()

def delete_expense(expense_id: str) -> bool:
    conn = get_connection()
    try:
        cursor = execute_query(conn, "DELETE FROM expenses WHERE UPPER(id) = UPPER(?)", (expense_id.strip(),))
        deleted = cursor.rowcount > 0
        conn.commit()
        return deleted
    finally:
        conn.close()

def get_budget() -> float:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT amount FROM budget WHERE id = 1")
        row = cursor.fetchone()
        return float(row["amount"]) if row else 0.0
    finally:
        conn.close()

def set_budget(amount: float) -> float:
    conn = get_connection()
    try:
        execute_query(
            conn,
            "INSERT INTO budget (id, amount) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET amount = excluded.amount",
            (float(amount),)
        )
        conn.commit()
        return float(amount)
    finally:
        conn.close()

def get_summary() -> Dict[str, Any]:
    conn = get_connection()
    try:
        order_clause = "ORDER BY created_at DESC, id DESC" if is_postgres() else "ORDER BY ROWID DESC"
        cursor = execute_query(conn, f"SELECT * FROM expenses {order_clause}")
        all_rows = cursor.fetchall()
        expenses = [format_row(r) for r in all_rows]
        
        cursor = conn.cursor()
        cursor.execute("SELECT amount FROM budget WHERE id = 1")
        budget_row = cursor.fetchone()
        budget = float(budget_row["amount"]) if budget_row else 0.0
    finally:
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
