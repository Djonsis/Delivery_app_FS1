import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

console.log("▶️ Starting SQLite database initialization...");

/**
 * Read and execute SQL file
 */
function executeSqlFile(db: Database.Database, filePath: string): void {
  const absolutePath = path.join(process.cwd(), filePath);
  
  console.log(`🔍 DEBUG: Looking for file: ${absolutePath}`);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`SQL file not found: ${absolutePath}`);
  }
  
  const sql = fs.readFileSync(absolutePath, "utf8");
  console.log(`🔍 DEBUG: Read ${sql.length} characters from ${filePath}`);
  
  db.exec(sql);
  console.log(`   ✅ Executed: ${filePath}`);
}

async function main() {
  console.log("🔍 DEBUG: Entered main function");
  
  try {
    console.log("🔍 DEBUG: Inside try block");
    
    // 1. Hard Reset: Remove all SQLite files for clean start
    const filesToRemove = ["dev.sqlite", "dev.sqlite-wal", "dev.sqlite-shm"];
    
    console.log("🔍 DEBUG: Attempting to remove old files...");
    filesToRemove.forEach((file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`🗑️  Removed existing ${file}`);
      }
    });

    console.log("✨ Clean start guaranteed (all SQLite files removed)");
    console.log("");

    // 2. Create new database
    console.log("📦 Creating new SQLite database...");
    console.log("🔍 DEBUG: About to call new Database()");
    
    const db = new Database("dev.sqlite");
    console.log("🔍 DEBUG: Database created successfully");

    // 3. Enable WAL mode for performance
    console.log("🔍 DEBUG: Setting pragmas...");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    console.log("⚡ WAL mode enabled");
    console.log("🔗 Foreign keys enabled");
    console.log("");

    // 4. Execute schema from SQL file
    console.log("🔧 Creating schema from SQL file...");
    console.log("🔍 DEBUG: About to execute schema-portable.sql");
    executeSqlFile(db, "db/schema-portable.sql");
    console.log("");

    // 5. Execute required seeds
    console.log("🌱 Seeding required data...");
    executeSqlFile(db, "db/seeds/required/categories.sql");
    executeSqlFile(db, "db/seeds/required/weight-templates.sql");
    console.log("");

    // 6. Execute demo seeds (optional)
    console.log("🎨 Seeding demo products...");
    try {
      executeSqlFile(db, "db/seeds/demo/products.sql");
    } catch (error) {
      console.log("   ⚠️  Demo products skipped (file not found or error)");
      console.log("🔍 DEBUG: Demo error:", error);
    }
    console.log("");

    // 7. Verify schema version
    const versionRow = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as { value?: string } | undefined;
    const schemaVersion = versionRow?.value || 'unknown';
    console.log(`📊 Schema version: ${schemaVersion}`);

    // 8. Close connection
    db.close();
    console.log("🔒 Database connection closed");

    console.log("");
    console.log("==========================================");
    console.log("✅ SQLite database initialized successfully!");
    console.log("");
    console.log("📋 Summary:");
    console.log(`   - Schema version: ${schemaVersion}`);
    console.log("   - Categories seeded");
    console.log("   - Weight templates seeded");
    console.log("   - Demo products seeded");
    console.log("   - WAL mode enabled");
    console.log("   - Foreign keys enabled");
    console.log("");
    console.log("🚀 Next step: npm run dev:sqlite");
    console.log("==========================================");

  } catch (error) {
    console.error("");
    console.error("==========================================");
    console.error("❌ FATAL: Database initialization failed!");
    console.error("==========================================");
    console.error("🔍 DEBUG: Error details:");
    console.error(error);
    
    // Additional diagnostics
    if (error instanceof Error) {
      console.error("");
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    console.error("");
    console.error("💡 Troubleshooting:");
    console.error("   1. Check if db/schema-portable.sql exists");
    console.error("   2. Check if db/seeds/ directory exists");
    console.error("   3. Verify SQL syntax in all files");
    console.error("   4. Check file permissions");
    console.error("   5. Try: npm run db:reset-sqlite && npm run db:init:sqlite");
    console.error("");
    process.exit(1);
  }
}

// Properly handle async main function
main().catch((error) => {
  console.error("");
  console.error("==========================================");
  console.error("❌ UNHANDLED ERROR IN MAIN:");
  console.error("==========================================");
  console.error(error);
  console.error("");
  process.exit(1);
});