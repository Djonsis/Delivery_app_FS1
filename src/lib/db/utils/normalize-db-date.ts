export function normalizeDbDate(input: string): string {
    // БД гарантирует string по схеме.
    // Но она может быть НЕ ISO, особенно в SQLite.
  
    if (input.includes("T") && (input.endsWith("Z") || input.includes("+"))) {
      return input; // Уже ISO или ISO-like от PG
    }
  
    // SQLite формат: "2025-12-01 15:13:58"
    let normalized = input;
  
    if (!normalized.includes("T")) {
      normalized = normalized.replace(" ", "T");
    }
  
    if (!normalized.endsWith("Z")) {
      normalized += "Z";
    }
  
    const d = new Date(normalized);
  
    if (isNaN(d.getTime())) {
      throw new Error(`normalizeDbDate(): Invalid date string: "${input}"`);
    }
  
    return d.toISOString();
  }
  