import { MarketType, RoundResult, CardSubmission, Team } from '../types';
import { getMarketType } from '../constants';

export const calculateRoundResults = (
  roundNumber: number,
  submissions: CardSubmission[],
  teams: Team[]
): RoundResult => {
  const marketType = getMarketType(roundNumber);
  
  // Calculate sums
  const teamSums = submissions.map(sub => ({
    teamId: sub.teamId,
    sum: sub.card1 + sub.card2,
    cards: [sub.card1, sub.card2] as [number, number]
  }));

  // Sort by sum descending
  teamSums.sort((a, b) => b.sum - a.sum);

  // Group by sum to handle ties
  const sumsMap = new Map<number, number[]>();
  teamSums.forEach(s => {
    if (!sumsMap.has(s.sum)) sumsMap.set(s.sum, []);
    sumsMap.get(s.sum)?.push(s.teamId);
  });

  const uniqueSums = Array.from(sumsMap.keys()).sort((a, b) => b - a); // Highest first
  const highestSum = uniqueSums[0];
  const lowestSum = uniqueSums[uniqueSums.length - 1];

  const highestTeams = sumsMap.get(highestSum) || [];
  const lowestTeams = sumsMap.get(lowestSum) || [];

  const profits: { teamId: number; amount: number; reason: string }[] = [];

  // Helper to set profit
  const setProfit = (id: number, amount: number, reason: string) => {
    profits.push({ teamId: id, amount, reason });
  };

  if (marketType === MarketType.EARLY) {
    // 1) Early Market (R1-3)
    // Highest: +120 (Tie: all +60)
    // Lowest: -60 (Tie: all -30)
    // Others: 0

    // Handle Highest
    if (highestTeams.length === 1) {
      setProfit(highestTeams[0], 120, '최고 합계 (단독)');
    } else {
      highestTeams.forEach(id => setProfit(id, 60, '최고 합계 (동점)'));
    }

    // Handle Lowest (Note: A team could theoretically be both highest and lowest if all teams have same sum)
    if (highestSum !== lowestSum || teamSums.length === highestTeams.length) {
       if (lowestTeams.length === 1) {
         setProfit(lowestTeams[0], -60, '최저 합계 (단독)');
       } else {
         lowestTeams.forEach(id => setProfit(id, -30, '최저 합계 (동점)'));
       }
    } else {
       // All teams are same score?
       // If all teams have same score, they are both highest and lowest.
       // Rules usually imply these roles are distinct groups. 
       // In Early market: Supply << Demand. 
       // If everyone plays same, let's strictly follow rule: Highest logic applies. Lowest logic applies.
       // If a team is BOTH highest and lowest (all tie), usually higher precedence rule wins or net.
       // Logic: Tie +60. Tie -30. Net +30? 
       // Let's assume standard exclusion: If you are highest, you aren't processed as lowest unless distinct.
       // However, strictly: "Highest teams get X", "Lowest teams get Y".
       // If everyone ties, everyone is Highest (+60). Everyone is Lowest (-30). Net +30.
       // Let's implement mutually exclusive groups for simplicity based on logic "Others".
       // Priority: Winner checks first.
    }

    // Fill "Others"
    teamSums.forEach(t => {
      if (!profits.find(p => p.teamId === t.teamId)) {
        setProfit(t.teamId, 0, '기타');
      }
    });

  } else if (marketType === MarketType.PERFECT) {
    // 2) Perfect Competition (R4-6)
    // Highest: +120 (Tie: NO PROFIT for anyone in tie)
    // Lowest: -80 (Tie: NO LOSS for anyone in tie)
    // Others: 0

    const winnersIds = new Set<number>();
    const losersIds = new Set<number>();

    // Winner Logic
    if (highestTeams.length === 1) {
      setProfit(highestTeams[0], 120, '최고 합계 (단독)');
      winnersIds.add(highestTeams[0]);
    } else {
      // Tie: No profit. We record 0 explicitly to mark them as processed.
      highestTeams.forEach(id => {
        setProfit(id, 0, '최고 합계 (동점 - 수익 없음)');
        winnersIds.add(id);
      });
    }

    // Loser Logic
    // Only process lowest if they haven't been processed as winners (unless everyone tied)
    // If everyone tied (highest == lowest), they got 0 from winner logic.
    if (lowestSum !== highestSum) {
        if (lowestTeams.length === 1) {
            setProfit(lowestTeams[0], -80, '최저 합계 (단독)');
            losersIds.add(lowestTeams[0]);
        } else {
            lowestTeams.forEach(id => {
                setProfit(id, 0, '최저 합계 (동점 - 손실 없음)');
                losersIds.add(id);
            });
        }
    }

    // Others
    teamSums.forEach(t => {
      if (!profits.find(p => p.teamId === t.teamId)) {
        setProfit(t.teamId, 0, '기타');
      }
    });

  } else {
    // 3) Monopolistic Competition (R7-9)
    // Highest: +180 (Tie: Winner gets 0, Next Rank gets +180. If Next Rank Tie, all get +180)
    // Lowest: -120 (Tie: All -120)
    // Others: -40

    const processedIds = new Set<number>();

    // 1. Highest Logic
    if (highestTeams.length === 1) {
      setProfit(highestTeams[0], 180, '최고 합계 (단독)');
      processedIds.add(highestTeams[0]);
    } else {
      // Tie at top
      highestTeams.forEach(id => {
        setProfit(id, 0, '최고 합계 (동점 - 수익 없음)');
        processedIds.add(id);
      });

      // Find Next Rank
      if (uniqueSums.length > 1) {
        const nextSum = uniqueSums[1];
        const nextTeams = sumsMap.get(nextSum) || [];
        
        nextTeams.forEach(id => {
           // We push this profit. NOTE: These teams might also be the "Lowest" if only 2 distinct sums exist.
           // Winning prize overrides penalty.
           setProfit(id, 180, '차순위 합계 (최고점 동점으로 인한 수혜)');
           processedIds.add(id);
        });
      }
    }

    // 2. Lowest Logic
    // Must filter out teams already processed (who got prize)
    const availableLowestTeams = lowestTeams.filter(id => !processedIds.has(id));
    
    // If there were teams remaining that are the lowest
    if (availableLowestTeams.length > 0) {
        // If highest teams tied, next rank got money. 
        // If the 'lowest' were the 'next rank', they are already processed.
        // So we only penalize lowest if they weren't the winners.
        availableLowestTeams.forEach(id => {
            setProfit(id, -120, '최저 합계');
            processedIds.add(id);
        });
    }

    // 3. Others
    teamSums.forEach(t => {
      if (!processedIds.has(t.teamId)) {
        setProfit(t.teamId, -40, '기타 (시장 도태)');
      }
    });
  }

  return {
    roundNumber,
    marketType,
    submissions: teamSums,
    profits
  };
};
