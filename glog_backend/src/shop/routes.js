const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const authenticate = require('../auth/middleware');

// 펫 상점 아이템 초기 데이터 (DB에 없으면 자동 생성)
const SEED_PETS = [
  { shop_item_id: 1, name: '토끼X2', type: 'pet', price: 600, image_url: 'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/bunny_gltf.glb' },
  { shop_item_id: 2, name: '개구리',  type: 'pet', price: 600, image_url: 'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/FROGG.glb' },
  { shop_item_id: 3, name: '자전거',  type: 'pet', price: 500, image_url: 'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/Bike.glb' },
  { shop_item_id: 4, name: '치킨',    type: 'pet', price: 500, image_url: 'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/chicken.glb' },
];

async function ensureShopItems() {
  for (const item of SEED_PETS) {
    await prisma.shopItem.upsert({
      where: { shop_item_id: item.shop_item_id },
      update: {},
      create: { name: item.name, type: item.type, price: item.price, image_url: item.image_url },
    });
  }
}
ensureShopItems().catch((e) => console.error('[ShopSeed Error]', e.message));

// GET /api/shop/items — 전체 상품 목록 + 내 구매/장착 상태
router.get('/items', authenticate, async (req, res) => {
  try {
    const [items, myItems] = await Promise.all([
      prisma.shopItem.findMany({ where: { is_active: true }, orderBy: { shop_item_id: 'asc' } }),
      prisma.userItem.findMany({ where: { user_id: req.user.userId } }),
    ]);

    const myMap = Object.fromEntries(myItems.map((i) => [i.shop_item_id, i]));

    res.json(items.map((item) => ({
      shop_item_id: item.shop_item_id,
      name: item.name,
      type: item.type,
      price: item.price,
      image_url: item.image_url,
      owned: !!myMap[item.shop_item_id],
      equipped: myMap[item.shop_item_id]?.is_equipped ?? false,
    })));
  } catch (err) {
    console.error('[ShopItems Error]', err.message);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/shop/items/:id/purchase — 구매 (코인 차감 + UserItem 생성)
router.post('/items/:id/purchase', authenticate, async (req, res) => {
  const shopItemId = parseInt(req.params.id, 10);
  if (!Number.isFinite(shopItemId)) return res.status(400).json({ message: '유효하지 않은 아이템 ID입니다.' });

  try {
    const [item, user] = await Promise.all([
      prisma.shopItem.findUnique({ where: { shop_item_id: shopItemId } }),
      prisma.user.findUnique({ where: { user_id: req.user.userId }, select: { coins: true } }),
    ]);

    if (!item || !item.is_active) return res.status(404).json({ message: '존재하지 않는 상품입니다.' });
    if (user.coins < item.price) return res.status(400).json({ message: '코인이 부족합니다.' });

    const existing = await prisma.userItem.findUnique({
      where: { user_id_shop_item_id: { user_id: req.user.userId, shop_item_id: shopItemId } },
    });
    if (existing) return res.status(409).json({ message: '이미 보유한 아이템입니다.' });

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { user_id: req.user.userId },
        data: { coins: { decrement: item.price } },
        select: { coins: true },
      }),
      prisma.userItem.create({
        data: { user_id: req.user.userId, shop_item_id: shopItemId },
      }),
      prisma.coinHistory.create({
        data: { user_id: req.user.userId, amount: -item.price, reason: 'purchase' },
      }),
    ]);

    res.json({ coins: updatedUser.coins });
  } catch (err) {
    console.error('[Purchase Error]', err.message);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// PATCH /api/shop/items/:id/equip — 장착 / 장착해제
router.patch('/items/:id/equip', authenticate, async (req, res) => {
  const shopItemId = parseInt(req.params.id, 10);
  const { equip } = req.body; // true: 장착, false: 해제
  if (!Number.isFinite(shopItemId)) return res.status(400).json({ message: '유효하지 않은 아이템 ID입니다.' });

  try {
    const userItem = await prisma.userItem.findUnique({
      where: { user_id_shop_item_id: { user_id: req.user.userId, shop_item_id: shopItemId } },
    });
    if (!userItem) return res.status(403).json({ message: '보유하지 않은 아이템입니다.' });

    if (equip) {
      // 같은 타입의 기존 장착 해제 후 새 아이템 장착
      const item = await prisma.shopItem.findUnique({ where: { shop_item_id: shopItemId } });
      const sameTypeItems = await prisma.shopItem.findMany({ where: { type: item.type, is_active: true } });
      const sameTypeIds = sameTypeItems.map((i) => i.shop_item_id);

      await prisma.$transaction([
        prisma.userItem.updateMany({
          where: { user_id: req.user.userId, shop_item_id: { in: sameTypeIds }, is_equipped: true },
          data: { is_equipped: false },
        }),
        prisma.userItem.update({
          where: { user_id_shop_item_id: { user_id: req.user.userId, shop_item_id: shopItemId } },
          data: { is_equipped: true },
        }),
      ]);
    } else {
      await prisma.userItem.update({
        where: { user_id_shop_item_id: { user_id: req.user.userId, shop_item_id: shopItemId } },
        data: { is_equipped: false },
      });
    }

    res.json({ equipped: equip });
  } catch (err) {
    console.error('[Equip Error]', err.message);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
