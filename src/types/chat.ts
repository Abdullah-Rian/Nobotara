import { AttachedFile } from '../components/Composer';

export type ComposerMode = 'Normal' | 'Brief' | 'Deep Analysis';
export type DeepThinkMode = 'Deep Think' | 'Tax Strategist' | 'Portfolio Rebalance' | 'Analytical Logic';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: AttachedFile[];
  metrics?: { label: string; value: string; delta?: string }[];
  actionRecommendation?: string;
}

export interface NasaMediaVisual {
  type: 'image' | 'video';
  title: string;
  nasaId: string;
  url: string;
  previewUrl?: string;
  description?: string;
  dateCreated?: string;
  center?: string;
}

export interface NasaMediaAudio {
  title: string;
  nasaId: string;
  audioUrl: string;
  description?: string;
  dateCreated?: string;
  center?: string;
}

export interface NasaMediaBundle {
  visual?: NasaMediaVisual;
  audio?: NasaMediaAudio;
}

export interface ConversationHistoryItem {
  id: string;
  question: string;
  time: string;
  fullAnswer: string;
  metrics?: { label: string; value: string; delta?: string }[];
  nasaUrl?: string;
  topic?: string;
  media?: NasaMediaBundle;
}


