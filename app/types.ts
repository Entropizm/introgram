export interface Note {
  id?: number;
  title: string;
  category: string;
  summary: string;
  transcription: string;
  metadata: Record<string, string>;
  date: Date;
  telegramHandle?: string; // Added telegramHandle field
}
