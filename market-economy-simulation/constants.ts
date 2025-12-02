import { MarketType } from './types';

export const TOTAL_ROUNDS = 9;

// Ordered as 1-9, then 1-9 again to create two perfect rows in the UI
export const INITIAL_CARDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const getMarketType = (round: number): MarketType => {
  if (round <= 3) return MarketType.EARLY;
  if (round <= 6) return MarketType.PERFECT;
  return MarketType.MONOPOLY;
};

export const getMarketName = (type: MarketType): string => {
  switch (type) {
    case MarketType.EARLY:
      return '초기 형성 시장 (Early Market)';
    case MarketType.PERFECT:
      return '완전 경쟁 시장 (Perfect Competition)';
    case MarketType.MONOPOLY:
      return '독점적 경쟁 시장 (Monopolistic Competition)';
  }
};

export const getMarketDescription = (type: MarketType): string => {
  switch (type) {
    case MarketType.EARLY:
      return '공급 << 수요: 새로운 수요가 창출된 초기 시장입니다.';
    case MarketType.PERFECT:
      return '공급 >> 수요: 품질이 균일하며 가격이 수요-공급에 따라 결정됩니다.';
    case MarketType.MONOPOLY:
      return '공급 >> 수요 (But 차별화 추구): 차별화가 요구되는 시장입니다.';
  }
};

export const GENERAL_RULES = `
1. 기본 규칙
- 각 팀은 1~9까지의 숫자 카드 각 2장씩, 총 18장을 가지고 시작합니다.
- 총 9라운드로 진행되며, 매 라운드 2장의 카드를 제출합니다.
- 제출된 카드는 소멸되며 다시 사용할 수 없습니다.

2. 승리 조건
- 9라운드 종료 후 누적 수익(총 자산)이 가장 높은 팀이 승리합니다.
`;

export const getDetailedRules = (type: MarketType): string[] => {
  switch (type) {
    case MarketType.EARLY:
      return [
        "(1~3 Round) 초기 형성 시장 (공급 << 수요)",
        "→ 합이 가장 높은 팀: +120억 수익 (복수 팀일 경우 각 +60억)",
        "→ 합이 가장 낮은 팀: -60억 손실 (복수 팀일 경우 각 -30억)",
        "→ 그 외 모든 팀: 0 (수익/손실 없음)"
      ];
    case MarketType.PERFECT:
      return [
        "(4~6 Round) 완전 경쟁 시장 (공급 >> 수요)",
        "→ 합이 가장 높은 팀: +120억 수익",
        "   (단, 복수 팀일 경우 공급 과잉으로 어느 팀도 수익 없음: 0)",
        "→ 합이 가장 낮은 팀: -80억 손실",
        "   (단, 복수 팀일 경우 어느 팀도 손실 없음: 0)",
        "→ 그 외 모든 팀: 0"
      ];
    case MarketType.MONOPOLY:
      return [
        "(7~9 Round) 독점적 경쟁 시장 (공급 >> 수요, 차별화)",
        "→ 합이 가장 높은 팀: +180억 수익",
        "   (복수일 경우, 해당 팀들은 수익 0 & 차순위 팀이 +180억 가져감)",
        "   (차순위 팀도 복수일 경우 각 +180억)",
        "→ 합이 가장 낮은 팀: -120억 손실 (복수인 경우 모두 -120억)",
        "→ 이외 모든 팀: -40억 손실 (시장 도태)"
      ];
  }
};