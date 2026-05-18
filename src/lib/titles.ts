import { TitleChallenge } from '@/types';

export const TITLE_CHALLENGES: TitleChallenge[] = [
  // CATEGORY: Casino
  {
    id: 'casino_wager_1m',
    title: 'Millionnaire',
    description: 'Miser 1 000 000 au total',
    rarity: 'Commun',
    category: 'Casino',
    target: 1000000,
    rewardTitle: 'Millionnaire',
    nextChallengeId: 'casino_wager_10m'
  },
  {
    id: 'casino_wager_10m',
    title: 'Gros Joueur',
    description: 'Miser 10 000 000 au total',
    rarity: 'Rare',
    category: 'Casino',
    target: 10000000,
    rewardTitle: 'High Roller',
    nextChallengeId: 'casino_win_roulette_10'
  },
  {
    id: 'casino_win_roulette_10',
    title: 'Maître de la Roue',
    description: 'Gagner 10 fois à la Roulette',
    rarity: 'Épique',
    category: 'Casino',
    target: 10,
    rewardTitle: 'Croupier Expert'
  },
  
  // CATEGORY: Économie
  {
    id: 'econ_balance_1b',
    title: 'Milliardaire',
    description: 'Avoir 1B de balance',
    rarity: 'Mythique',
    category: 'Économie',
    target: 1000000000,
    rewardTitle: 'Milliardaire'
  },
  {
    id: 'econ_transfer_100b',
    title: 'Philanthrope',
    description: 'Envoyer 100B via transferts',
    rarity: 'Légendaire',
    category: 'Économie',
    target: 100000000000,
    rewardTitle: 'Banquier du Néant'
  },

  // CATEGORY: Défis Rares
  {
    id: 'rare_crash_100x',
    title: 'Vers la Lune',
    description: 'Faire x100 au Crash',
    rarity: 'Mythique',
    category: 'Défis Rares',
    target: 1,
    rewardTitle: 'Astronaute'
  },
  {
    id: 'rare_streak_15',
    title: 'Invincible',
    description: 'Gagner 15 fois d\'affilée',
    rarity: 'Légendaire',
    category: 'Défis Rares',
    target: 15,
    rewardTitle: 'Dieu du Jeu'
  },

  // CATEGORY: ULTIME (Hidden until others done)
  {
    id: 'ultimate_god',
    title: 'Transcendance',
    description: 'Devenir une divinité du casino',
    rarity: 'Ultime',
    category: 'ULTIME',
    target: 1,
    rewardTitle: 'L\'Ultime',
    isHidden: true
  }
];

export const RARITY_COLORS: Record<string, string> = {
  'Commun': '#9ca3af',
  'Rare': '#3b82f6',
  'Épique': '#a855f7',
  'Légendaire': '#eab308',
  'Mythique': '#ef4444',
  'Divin': '#06b6d4',
  'Ultime': '#ffffff'
};

export const RARITY_GLOW: Record<string, string> = {
  'Commun': '0 0 5px rgba(156, 163, 175, 0.3)',
  'Rare': '0 0 10px rgba(59, 130, 246, 0.5)',
  'Épique': '0 0 15px rgba(168, 85, 247, 0.6)',
  'Légendaire': '0 0 20px rgba(234, 179, 8, 0.7)',
  'Mythique': '0 0 25px rgba(239, 68, 68, 0.8)',
  'Divin': '0 0 30px rgba(6, 182, 212, 0.9)',
  'Ultime': '0 0 40px rgba(255, 255, 255, 1)'
};
