export enum GamePhase {
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  ENDED = 'ENDED',
}

export enum MarketType {
  EARLY = 'EARLY', // Rounds 1-3
  PERFECT = 'PERFECT', // Rounds 4-6
  MONOPOLY = 'MONOPOLY', // Rounds 7-9
}

export type UserRole = 'ADMIN' | 'USER';

export interface Player {
  name: string;
  teamId: number;
}

export interface CardSubmission {
  teamId: number;
  card1: number;
  card2: number;
}

export interface RoundResult {
  roundNumber: number;
  marketType: MarketType;
  submissions: {
    teamId: number;
    sum: number;
    cards: [number, number];
  }[];
  profits: {
    teamId: number;
    amount: number; // Positive for profit, negative for loss
    reason: string;
  }[];
}

export interface Team {
  id: number;
  name: string;
  totalScore: number;
  remainingCards: number[]; // Array of card values available (starts with two of each 1-9)
  members: string[]; // Names of players in this team
  history: {
    round: number;
    cardsPlayed: [number, number];
    roundProfit: number;
    totalAfterRound: number;
  }[];
}

export interface PendingSubmission {
  card1: number;
  card2: number;
}

export interface TimerState {
  isRunning: boolean;
  endTime: number | null; // timestamp when timer ends
  duration: number; // total duration in seconds
}

export interface RevealedCards {
  [teamId: number]: boolean; // track which team's cards have been revealed
}

export interface GameState {
  roomName: string;
  phase: GamePhase;
  currentRound: number;
  teams: Team[];
  roundHistory: RoundResult[];
  pendingSubmissions?: Record<number, PendingSubmission>; // teamId -> submission
  timer?: TimerState; // shared timer state
  revealedCards?: RevealedCards; // track revealed cards for current round
}

export interface AIAnalysisReport {
  summary: string;
  marketAnalysis: {
    phase: string;
    description: string;
  }[];
  teamStrategies: {
    teamName: string;
    analysis: string;
  }[];
  mvpTeam: string;
  conclusion: string;
}