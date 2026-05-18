import { TitleChallenge } from '@/types';

export const TITLE_CHALLENGES: TitleChallenge[] = [
  // CATEGORY: Casino
  {
    id: 'casino_wager_100b',
    title: 'Baleine de Finance',
    description: 'Miser 100 milliards au total',
    rarity: 'Légendaire',
    category: 'Casino',
    target: 100000000000,
    rewardTitle: 'Baleine',
    statKey: 'totalWagered'
  },
  {
    id: 'casino_single_bet_1t',
    title: 'All-In Galactique',
    description: 'Miser 1 trillion en une seule partie',
    rarity: 'Mythique',
    category: 'Casino',
    target: 1000000000000,
    rewardTitle: 'Destructeur de Banque',
    statKey: 'maxSingleBet'
  },
  {
    id: 'casino_roulette_10',
    title: 'Chanceux Tournant',
    description: 'Gagner 10 fois à la Roulette',
    rarity: 'Commun',
    category: 'Casino',
    target: 10,
    rewardTitle: 'Joueur de Roulette',
    statKey: 'rouletteWins'
  },
  {
    id: 'casino_coinflip_50',
    title: 'Maître du Pile ou Face',
    description: 'Gagner 50 fois au Coinflip',
    rarity: 'Rare',
    category: 'Casino',
    target: 50,
    rewardTitle: 'Flippeur Fou',
    statKey: 'coinflipWins'
  },
  {
    id: 'casino_dice_streak_10',
    title: 'Série de Dés',
    description: 'Gagner 10 fois de suite au Dice',
    rarity: 'Épique',
    category: 'Casino',
    target: 10,
    rewardTitle: 'Lanceur d\'Élite',
    statKey: 'diceStreak'
  },
  {
    id: 'casino_dice_low_chance',
    title: 'Contre toute attente',
    description: 'Gagner avec moins de 5% de chance au Dice',
    rarity: 'Épique',
    category: 'Casino',
    target: 1,
    rewardTitle: 'Miraculé',
    statKey: 'diceLowChanceWin'
  },
  {
    id: 'casino_plinko_x16_10',
    title: 'Chute Parfaite',
    description: 'Faire x16 au Plinko 10 fois',
    rarity: 'Rare',
    category: 'Casino',
    target: 10,
    rewardTitle: 'Plinkeur Pro',
    statKey: 'plinkoX16Count'
  },
  {
    id: 'casino_crash_100x',
    title: 'Vers la Stratosphère',
    description: 'Faire x100 au Crash',
    rarity: 'Mythique',
    category: 'Casino',
    target: 1,
    rewardTitle: 'Cosmonaute',
    statKey: 'maxCrashMultiplier'
  },
  {
    id: 'casino_crash_10x_multi',
    title: 'Pilote de Ligne',
    description: 'Gagner Crash au-dessus de x10 plusieurs fois',
    rarity: 'Épique',
    category: 'Casino',
    target: 5,
    rewardTitle: 'Pilote',
    statKey: 'crash10xCount'
  },
  {
    id: 'casino_mines_24',
    title: 'Démineur de l\'Enfer',
    description: 'Réussir Mines avec 24 mines',
    rarity: 'Légendaire',
    category: 'Casino',
    target: 1,
    rewardTitle: 'Démineur Suprême',
    statKey: 'mines24SuccessCount'
  },
  {
    id: 'casino_slots_3stars_20',
    title: 'Jackpot Star',
    description: 'Gagner 20 fois avec 3 étoiles au Slots',
    rarity: 'Rare',
    category: 'Casino',
    target: 20,
    rewardTitle: 'Étoile Filante',
    statKey: 'slots3StarsCount'
  },
  {
    id: 'casino_roulette_exact_10',
    title: 'Précision Chirurgicale',
    description: 'Gagner roulette sur une valeur précise 10 fois',
    rarity: 'Épique',
    category: 'Casino',
    target: 10,
    rewardTitle: 'Sniper de Roulette',
    statKey: 'rouletteExactWinCount'
  },
  {
    id: 'casino_streak_15',
    title: 'Dieu de la Chance',
    description: 'Faire 15 victoires d\'affilée',
    rarity: 'Légendaire',
    category: 'Casino',
    target: 1,
    rewardTitle: 'Invincible',
    statKey: 'maxWinStreak'
  },

  // CATEGORY: Économie
  {
    id: 'econ_leaderboard_1',
    title: 'Numéro Un',
    description: 'Être premier du leaderboard',
    rarity: 'Mythique',
    category: 'Économie',
    target: 1,
    rewardTitle: 'Le Premier',
    statKey: 'leaderboardRank1'
  },
  {
    id: 'econ_vip_15',
    title: 'Privilégié',
    description: 'Atteindre VIP 15',
    rarity: 'Légendaire',
    category: 'Économie',
    target: 15,
    rewardTitle: 'Aristocrate',
    statKey: 'vipLevel'
  },
  {
    id: 'econ_vip_max',
    title: 'Sommet du Monde',
    description: 'Atteindre VIP max',
    rarity: 'Divin',
    category: 'Économie',
    target: 10,
    rewardTitle: 'Légende Éternelle',
    statKey: 'vipLevel'
  },
  {
    id: 'econ_transfer_huge',
    title: 'Généreux Donateur',
    description: 'Envoyer énormément via transferts',
    rarity: 'Rare',
    category: 'Économie',
    target: 1000000000000,
    rewardTitle: 'Philanthrope',
    statKey: 'totalTransferSent'
  },
  {
    id: 'econ_crypto_huge',
    title: 'Crypto Magnat',
    description: 'Déposer énormément en crypto',
    rarity: 'Rare',
    category: 'Économie',
    target: 1000000000000,
    rewardTitle: 'Bitcoin Lord',
    statKey: 'totalCryptoDeposited'
  },
  {
    id: 'econ_balance_huge',
    title: 'Trésor Vivant',
    description: 'Avoir une balance gigantesque',
    rarity: 'Mythique',
    category: 'Économie',
    target: 10000000000000,
    rewardTitle: 'Crésus',
    statKey: 'balance'
  },
  {
    id: 'econ_finish_all_normal',
    title: 'Complétiste',
    description: 'Finir toutes les quêtes normales',
    rarity: 'Légendaire',
    category: 'Économie',
    target: 19,
    rewardTitle: 'Le Maître',
    statKey: 'completedNormalChallenges'
  },

  // CATEGORY: ULTIME
  {
    id: 'ultimate_apex',
    title: 'L\'Éveil d\'Apex',
    description: 'Compléter tous les défis divins',
    rarity: 'Ultime',
    category: 'ULTIME',
    target: 1,
    rewardTitle: 'Apex',
    isHidden: true,
    statKey: 'allChallengesCompleted'
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
