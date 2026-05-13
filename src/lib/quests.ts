import { Quest } from '@/types';

export const INITIAL_QUESTS: Omit<Quest, 'id' | 'progress' | 'completed' | 'claimed'>[] = [
  {
    title: 'First Bet',
    description: 'Place your first bet',
    type: 'play',
    target: 1,
    reward: 50,
  },
  {
    title: 'Active Player',
    description: 'Play 10 games',
    type: 'play',
    target: 10,
    reward: 100,
  },
  {
    title: 'Bettor',
    description: 'Wager a total of 500',
    type: 'wager',
    target: 500,
    reward: 200,
  },
  {
    title: 'Winner',
    description: 'Win 5 games',
    type: 'win',
    target: 5,
    reward: 150,
  },
  {
    title: 'VIP Bronze',
    description: 'Reach VIP level 2',
    type: 'vip',
    target: 2,
    reward: 300,
  },
  {
    title: 'High Roller',
    description: 'Wager a total of 5000',
    type: 'wager',
    target: 5000,
    reward: 1000,
  },
  {
    title: 'Winning Streak',
    description: 'Win 3 games in a row',
    type: 'streak',
    target: 3,
    reward: 500,
  },
  {
    title: 'VIP Silver',
    description: 'Reach VIP level 4',
    type: 'vip',
    target: 4,
    reward: 2000,
  },
];

export function updateQuestProgress(
  quests: Quest[],
  type: Quest['type'],
  value: number
): Quest[] {
  return quests.map(quest => {
    if (quest.completed || quest.type !== type) return quest;
    
    const newProgress = quest.progress + value;
    const completed = newProgress >= quest.target;
    
    return {
      ...quest,
      progress: Math.min(newProgress, quest.target),
      completed,
    };
  });
}

export function claimQuestReward(quests: Quest[], questId: string): { quests: Quest[]; reward: number } {
  const quest = quests.find(q => q.id === questId);
  if (!quest || !quest.completed || quest.claimed) {
    return { quests, reward: 0 };
  }
  
  const updatedQuests = quests.map(q =>
    q.id === questId ? { ...q, claimed: true } : q
  );
  
  return { quests: updatedQuests, reward: quest.reward };
}