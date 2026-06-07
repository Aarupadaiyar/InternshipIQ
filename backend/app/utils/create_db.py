import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text


async def create_db():
    try:
        # Connect to the default 'postgres' database to check and create 'internshipiq'
        # We use autocommit because CREATE DATABASE cannot run in a transaction block
        engine = create_async_engine(
            "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres",
            isolation_level="AUTOCOMMIT"
        )
        async with engine.connect() as conn:
            query = text("SELECT 1 FROM pg_database WHERE datname = 'internshipiq'")
            result = await conn.execute(query)
            exists = result.scalar()
            
            if not exists:
                print("Database 'internshipiq' does not exist. Creating...")
                await conn.execute(text("CREATE DATABASE internshipiq"))
                print("Database 'internshipiq' created successfully.")
            else:
                print("Database 'internshipiq' already exists.")
        await engine.dispose()
    except Exception as e:
        print(f"Error creating database: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(create_db())
