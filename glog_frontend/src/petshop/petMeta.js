/**
 * petMeta.js
 * S3 URL → 3D 렌더링 설정 매핑
 * AvatarViewerModal 등 외부 컴포넌트에서 공유
 */

export const PET_META_BY_URL = {
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/bunny_gltf.glb': {
    emoji: '🐰',
    scale: 0.3,
  },
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/FROGG.glb': {
    emoji: '🐸',
    scale: 0.4,
    rotation: [0, -Math.PI / 2, 0],
  },
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/penguin.glb': {
    emoji: '🐧',
    scale: 1,
  },
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/Bike.glb': {
    emoji: '🚲',
    scale: 1,
  },
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/chicken.glb': {
    emoji: '🐔',
    scale: 1,
  },
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/Fox_GLB.glb': {
    emoji: '🦊',
    scale: 1,
  },
};
