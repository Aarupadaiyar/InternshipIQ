import asyncio
from sqlalchemy import select, func, text
from app.database.session import AsyncSessionLocal

async def inspect():
    async with AsyncSessionLocal() as session:
        # Check tables
        tables = ["users", "user_resumes", "user_profiles", "user_preferences", "subscriptions", "payments", "premium_users", "digest_logs", "email_preferences"]
        for t in tables:
            try:
                res = await session.execute(text(f"SELECT count(*) FROM {t}"))
                count = res.scalar()
                print(f"Table '{t}': {count} records found.")
            except Exception as e:
                print(f"Table '{t}': ERROR checking count ({e})")
                await session.rollback()
        
        # Let's see some users if any
        try:
            res = await session.execute(text("SELECT id, full_name, email, role, last_login FROM users LIMIT 5"))
            users = res.all()
            print("\nUsers sample:")
            for u in users:
                print(f"  ID: {u[0]} | Name: {u[1]} | Email: {u[2]} | Role: {u[3]} | Last Login: {u[4]}")
        except Exception as e:
            print(f"Error querying users: {e}")
            await session.rollback()

if __name__ == '__main__':
    asyncio.run(inspect())
