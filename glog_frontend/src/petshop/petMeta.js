// 펫 GLB URL → 렌더링 메타데이터 매핑
// petShopModal과 AvatarViewerModal에서 공유 사용
export const PET_META_BY_URL = {
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/bunny_gltf.glb': {
    emoji: '🐰', scale: 0.3,
  },
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/FROGG.glb': {
    emoji: '🐸', scale: 0.4, rotation: [0, -Math.PI / 2, 0],
  },
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/Bike.glb': {
    emoji: '🚲',
  },
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/chicken.glb': {
    emoji: '🐔',
  },
};
