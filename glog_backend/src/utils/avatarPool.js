/**
 * avatarPool.js
 * S3에 업로드된 3D 아바타 GLB URL 목록 (f_1~f_10, m_1~m_10 총 20개)
 * 회원가입 시 랜덤으로 하나를 선택해 users.model_url에 저장한다.
 */

const BASE = 'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/avatar';

const AVATAR_POOL = [
  `${BASE}/f_1.glb`,
  `${BASE}/f_2.glb`,
  `${BASE}/f_3.glb`,
  `${BASE}/f_4.glb`,
  `${BASE}/f_5.glb`,
  `${BASE}/f_6.glb`,
  `${BASE}/f_7.glb`,
  `${BASE}/f_8.glb`,
  `${BASE}/f_9.glb`,
  `${BASE}/f_10.glb`,
  `${BASE}/m_1.glb`,
  `${BASE}/m_2.glb`,
  `${BASE}/m_3.glb`,
  `${BASE}/m_4.glb`,
  `${BASE}/m_5.glb`,
  `${BASE}/m_6.glb`,
  `${BASE}/m_7.glb`,
  `${BASE}/m_8.glb`,
  `${BASE}/m_9.glb`,
  `${BASE}/m_10.glb`,
];

function pickRandomAvatar() {
  return AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)];
}

module.exports = { AVATAR_POOL, pickRandomAvatar };
