import fs from "fs";
import path from "path";

const STORE_PATH = path.join(__dirname, "..", "processed-events.json");

export interface ProcessedEvent {
  signature: string;
  type: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  processedAt: string;
}

const load = (): Record<string, ProcessedEvent> => {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch {
    return {};
  }
};

const save = (data: Record<string, ProcessedEvent>) => {
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
};

export const isProcessed = (signature: string): boolean => {
  return signature in load();
};

export const markProcessed = (event: ProcessedEvent): void => {
  const data = load();
  data[event.signature] = event;
  save(data);
};

export const getProcessedCount = (): number => {
  return Object.keys(load()).length;
};
