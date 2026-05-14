const prisma = require('../config/db');

let started = false;

// 매일 새벽 3시에 탈퇴 후 1년 지난 유저 영구 삭제
function startUserCleanupScheduler() {
  if (started) return;
  started = true;

  const tick = async () => {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const result = await prisma.user.deleteMany({
        where: {
          is_deleted: true,
          deleted_at: { lte: oneYearAgo },
        },
      });

      if (result.count > 0) {
        console.log(`[UserCleanup] 탈퇴 유저 ${result.count}명 영구 삭제 완료`);
      }
    } catch (err) {
      console.error('[UserCleanup Error]', err.message);
    }
  };

  // 다음 새벽 3시까지 대기 후 실행, 이후 24시간마다 반복
  const msUntil3am = () => {
    const now = new Date();
    const next = new Date();
    next.setHours(3, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next - now;
  };

  setTimeout(() => {
    tick();
    setInterval(tick, 24 * 60 * 60 * 1000);
  }, msUntil3am());
}

module.exports = { startUserCleanupScheduler };
