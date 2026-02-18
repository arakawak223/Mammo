/**
 * 統計シードデータ（開発用）
 *
 * 警察庁「特殊詐欺認知件数・被害額」を参考にしたサンプルデータ。
 * 実際の統計値ではなく、デモ用の概算値です。
 *
 * 使い方:
 *   npx ts-node prisma/seed-statistics.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 詐欺タイプ
const SCAM_TYPES = [
  'オレオレ詐欺',
  '架空料金請求詐欺',
  '還付金詐欺',
  '融資保証金詐欺',
  'キャッシュカード詐欺盗',
  'SNS型投資詐欺',
  'ロマンス詐欺',
  '預貯金詐欺',
];

// 47都道府県
const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

// 都道府県ごとの相対的な被害規模（人口・都市度に応じた重み）
const PREF_WEIGHT: Record<string, number> = {
  '東京都': 1.0, '大阪府': 0.55, '神奈川県': 0.50, '埼玉県': 0.40,
  '千葉県': 0.35, '愛知県': 0.35, '兵庫県': 0.28, '北海道': 0.25,
  '福岡県': 0.25, '静岡県': 0.18, '広島県': 0.14, '京都府': 0.14,
  '茨城県': 0.12, '宮城県': 0.12, '新潟県': 0.10, '長野県': 0.08,
  '岐阜県': 0.08, '群馬県': 0.08, '栃木県': 0.08, '三重県': 0.07,
  '熊本県': 0.07, '岡山県': 0.07, '鹿児島県': 0.06, '滋賀県': 0.06,
  '奈良県': 0.06, '愛媛県': 0.05, '長崎県': 0.05, '青森県': 0.05,
  '岩手県': 0.04, '大分県': 0.04, '沖縄県': 0.06, '山口県': 0.05,
  '石川県': 0.04, '富山県': 0.04, '福井県': 0.03, '山梨県': 0.03,
  '秋田県': 0.03, '山形県': 0.03, '香川県': 0.04, '和歌山県': 0.04,
  '佐賀県': 0.03, '徳島県': 0.03, '高知県': 0.03, '宮崎県': 0.04,
  '島根県': 0.02, '鳥取県': 0.02, '福島県': 0.07,
};

// 詐欺タイプごとの基準件数と平均被害額（万円）
const TYPE_BASE: Record<string, { count: number; avgAmount: number }> = {
  'オレオレ詐欺':       { count: 120, avgAmount: 280 },
  '架空料金請求詐欺':   { count: 80,  avgAmount: 150 },
  '還付金詐欺':         { count: 90,  avgAmount: 100 },
  '融資保証金詐欺':     { count: 15,  avgAmount: 200 },
  'キャッシュカード詐欺盗': { count: 70, avgAmount: 180 },
  'SNS型投資詐欺':      { count: 100, avgAmount: 500 },
  'ロマンス詐欺':       { count: 40,  avgAmount: 350 },
  '預貯金詐欺':         { count: 50,  avgAmount: 120 },
};

// 月ごとの季節変動係数
const MONTH_FACTOR: Record<string, number> = {
  '01': 0.85, '02': 0.90, '03': 1.05, '04': 1.00,
  '05': 0.95, '06': 1.00, '07': 1.05, '08': 0.95,
  '09': 1.00, '10': 1.10, '11': 1.05, '12': 1.10,
};

function randomVariance(base: number, variance = 0.3): number {
  const factor = 1 + (Math.random() * 2 - 1) * variance;
  return Math.max(0, Math.round(base * factor));
}

async function seed() {
  console.log('統計シードデータ投入開始...');

  const months = [
    '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
    '2026-01', '2026-02',
  ];

  let totalRecords = 0;
  const batchSize = 100;
  let batch: Array<{
    prefecture: string;
    yearMonth: string;
    scamType: string;
    amount: bigint;
    count: number;
  }> = [];

  for (const yearMonth of months) {
    const mm = yearMonth.split('-')[1];
    const monthFactor = MONTH_FACTOR[mm] || 1.0;

    for (const prefecture of PREFECTURES) {
      const prefWeight = PREF_WEIGHT[prefecture] || 0.05;

      for (const scamType of SCAM_TYPES) {
        const typeBase = TYPE_BASE[scamType];
        const baseCount = typeBase.count * prefWeight * monthFactor;
        const count = randomVariance(baseCount, 0.35);

        if (count === 0) continue;

        const avgAmount = typeBase.avgAmount;
        const totalAmount = randomVariance(count * avgAmount, 0.25);

        batch.push({
          prefecture,
          yearMonth,
          scamType,
          amount: BigInt(totalAmount * 10000), // 万円→円
          count,
        });

        if (batch.length >= batchSize) {
          await prisma.scamStatistic.createMany({
            data: batch,
            skipDuplicates: true,
          });
          totalRecords += batch.length;
          batch = [];
        }
      }
    }
  }

  // 残りのバッチを投入
  if (batch.length > 0) {
    await prisma.scamStatistic.createMany({
      data: batch,
      skipDuplicates: true,
    });
    totalRecords += batch.length;
  }

  console.log(`完了: ${totalRecords} 件のシードデータを投入しました。`);
  console.log(`期間: ${months[0]} 〜 ${months[months.length - 1]}`);
  console.log(`都道府県: ${PREFECTURES.length}、詐欺タイプ: ${SCAM_TYPES.length}`);
}

seed()
  .catch((e) => {
    console.error('シードデータ投入失敗:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
