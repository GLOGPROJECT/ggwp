/**
 * scripts/assignAvatars.js
 * model_url이 없는 기존 유저에게 S3 3D 아바타를 랜덤 배정.
 * 실행: node scripts/assignAvatars.js
 */

const prisma = require('../src/config/db');
const { AVATAR_POOL } = require('../src/utils/avatarPool');

function pickRandom() {
  return AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)];
}

async function main() {
  const users = await prisma.user.findMany({
    where: { model_url: null, is_deleted: false },
    select: { user_id: true },
  });

  console.log(`model_url 없는 유저: ${users.length}명`);
  if (users.length === 0) {
    console.log('모두 이미 배정됨.');
    return;
  }

  for (const u of users) {
    await prisma.user.update({
      where: { user_id: u.user_id },
      data: { model_url: pickRandom() },
    });
    console.log(`  ✓ user_id=${u.user_id}`);
  }

  console.log('완료!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
