import * as fs from "fs";
import * as path from "path";

export interface PaymentLogEntry {
  timestamp: string;
  from: string;
  to: string;
  token: string;
  amount: string;
  txHash: string;
  memo: string;
}

const LOG_DIR = path.resolve(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "payments.jsonl");

/** Append a single payment entry to the JSONL log file. */
export async function appendPaymentLog(entry: PaymentLogEntry): Promise<void> {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const line = JSON.stringify(entry) + "\n";
  fs.appendFileSync(LOG_FILE, line, "utf-8");
}

/** Read all payment log entries from disk. */
export function readPaymentLog(): PaymentLogEntry[] {
  if (!fs.existsSync(LOG_FILE)) return [];
  const content = fs.readFileSync(LOG_FILE, "utf-8").trim();
  if (!content) return [];
  return content.split("\n").map((line) => JSON.parse(line) as PaymentLogEntry);
}
