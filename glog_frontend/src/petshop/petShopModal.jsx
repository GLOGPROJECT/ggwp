/**
 * petShopModal.jsx
 * 펫 상점 모달
 * - 화면 오른쪽 절반, 가로 30vw 정사각형
 * - 투명도 70%, 상단 nav(z-index:100)를 가리지 않도록 z-index:90
 */

import { useState, useEffect, Component, Suspense, useRef, useMemo, useLayoutEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF, Center, Html, useAnimations } from '@react-three/drei';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils';
import { useAuth } from '../auth/hooks/useAuth';
import api from '../api/axios';

// ──────────────────────────────────────────────────────────────────
// shop_item_id → 표시 설정
// ──────────────────────────────────────────────────────────────────
const PET_META = {
  1: { emoji: '🐰', scale: 0.3 },
  2: { emoji: '🐸', scale: 0.4, rotation: [0, -Math.PI / 2, 0] },
  3: { emoji: '🚲', scale: 1 },
  4: { emoji: '🐔', scale: 1 },
};

// S3에 존재하는 GLB preload
const PRELOAD_URLS = [
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/bunny_gltf.glb',
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/FROGG.glb',
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/Bike.glb',
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/chicken.glb',
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/Fox_GLB.glb',
];
PRELOAD_URLS.forEach((u) => useGLTF.preload(u));

// ──────────────────────────────────────────────────────────────────
// 에러 바운더리
// ──────────────────────────────────────────────────────────────────
class CanvasErrorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      return (
        <div style={previewFallbackStyle}>
          <span style={{ fontSize: 52 }}>{this.props.emoji}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

class R3FErrorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

// ──────────────────────────────────────────────────────────────────
// 카메라 lookAt 고정
// ──────────────────────────────────────────────────────────────────
function CameraSetup({ y = 0.85 }) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.lookAt(0, y, 0);
    camera.updateProjectionMatrix();
  }, [camera, y]);
  return null;
}

// ──────────────────────────────────────────────────────────────────
// 내 아바타 (idle 애니메이션)
// ──────────────────────────────────────────────────────────────────
function MyAvatarModel({ url, scale = 1 }) {
  const { scene, animations } = useGLTF(url);
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const rootRef = useRef();
  const { actions, names } = useAnimations(animations, rootRef);

  useEffect(() => {
    if (!names.length) return;
    const idle = actions[names[1]] ?? actions[names[0]];
    if (idle) idle.reset().fadeIn(0.3).play();
    return () => { idle?.stop(); };
  }, [actions, names]);

  return <primitive ref={rootRef} object={cloned} rotation={[0, 0, 0]} scale={scale} />;
}

// ──────────────────────────────────────────────────────────────────
// 펫 3D 모델 (회전 없음)
// ──────────────────────────────────────────────────────────────────
function PetModel({ url, scale = 1, rotation = [0, 0, 0] }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return (
    <Center>
      <primitive object={cloned} scale={scale} rotation={rotation} />
    </Center>
  );
}

// ──────────────────────────────────────────────────────────────────
// 아바타 + 선택된 펫 미리보기 (왼쪽 컬럼)
// ──────────────────────────────────────────────────────────────────
function MyAvatarPreview({ avatarUrl, pet }) {
  if (!avatarUrl) {
    return (
      <div style={avatarFallbackStyle}>
        <span style={{ fontSize: 40 }}>🧍</span>
      </div>
    );
  }
  return (
    <div style={avatarCanvasWrapStyle}>
      <Canvas camera={{ position: [0, 0.75, 2.8], fov: 56 }} style={{ width: '100%', height: '100%' }}>
        <CameraSetup y={0.75} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 5, 3]} intensity={1.2} />
        <directionalLight position={[-2, 2, -2]} intensity={0.3} />
        <Suspense fallback={null}>
          <group position={pet?.image_url ? [-0.35, 0, 0] : [0, 0, 0]}>
            <MyAvatarModel url={avatarUrl} scale={1.15} />
          </group>
        </Suspense>
        {pet?.image_url && (
          <R3FErrorBoundary key={pet.shop_item_id}>
            <Suspense fallback={null}>
              <group position={[0.5, 0, 0]} scale={0.45}>
                <PetModel
                  url={pet.image_url}
                  scale={PET_META[pet.shop_item_id]?.scale ?? 1}
                  rotation={PET_META[pet.shop_item_id]?.rotation ?? [0, 0, 0]}
                />
              </group>
            </Suspense>
          </R3FErrorBoundary>
        )}
      </Canvas>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// 펫 카드 (호버 시 구매/장착/해제 버튼 표시)
// ──────────────────────────────────────────────────────────────────
function PetCard({ pet, isSelected, isEquipped, isOwned, coins, onSelect, onPurchase, onEquip, onUnequip }) {
  const meta = PET_META[pet.shop_item_id] ?? {};
  const canAfford = coins >= pet.price;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        ...cardStyle,
        outline: isSelected ? '2px solid #4e9af1' : '2px solid transparent',
        background: isSelected ? 'rgba(78,154,241,0.22)' : 'rgba(255,255,255,0.10)',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(pet)}
    >
      <span style={{ fontSize: 22 }}>{meta.emoji ?? '🐾'}</span>
      <p style={cardNameStyle}>{pet.name}</p>
      <p style={{ ...cardPriceStyle, color: canAfford || isOwned ? '#ced4da' : '#868e96' }}>
        {isOwned ? (isEquipped ? '✅ 장착중' : '보유중') : `🪙 ${pet.price}`}
      </p>

      {/* 호버 오버레이 */}
      {hovered && (
        <div style={hoverOverlayStyle} onClick={() => onSelect(pet)}>
          {!isOwned && (
            <button
              style={{
                ...actionBtnStyle,
                background: canAfford ? '#4e9af1' : 'rgba(134,142,150,0.35)',
                color: canAfford ? '#fff' : '#868e96',
                cursor: canAfford ? 'pointer' : 'not-allowed',
              }}
              disabled={!canAfford}
              onClick={(e) => { e.stopPropagation(); onPurchase(pet); }}
            >
              구매하기
            </button>
          )}
          {isOwned && !isEquipped && (
            <button
              style={{ ...actionBtnStyle, background: '#4e9af1', color: '#fff', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); onEquip(pet); }}
            >
              장착하기
            </button>
          )}
          {isOwned && isEquipped && (
            <button
              style={{ ...actionBtnStyle, background: 'rgba(220,53,69,0.85)', color: '#fff', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); onUnequip(pet); }}
            >
              장착 해제
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// 메인 모달
// ──────────────────────────────────────────────────────────────────
export default function PetShopModal({ onClose, navHeight = 80 }) {
  const { user, updateUser, refetchMe } = useAuth();
  const coins = user?.coins ?? 0;
  const avatarUrl = user?.model_url ?? null;

  const [pets, setPets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // 상점 아이템 + 보유/장착 상태 로드
  useEffect(() => {
    api.get('/shop/items').then((res) => {
      setPets(res.data);
      const equipped = res.data.find((p) => p.equipped);
      if (equipped) setSelected(equipped);
      else if (res.data.length > 0) setSelected(res.data[0]);
    }).catch((err) => {
      console.error('[ShopItems Error]', err.message);
    });
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 320);
  };

  const handlePurchase = async (pet) => {
    try {
      await api.post(`/shop/items/${pet.shop_item_id}/purchase`);
      const res = await api.get('/shop/items');
      setPets(res.data);
      const updated = res.data.find((p) => p.shop_item_id === pet.shop_item_id);
      if (updated) setSelected(updated);
      if (updateUser) updateUser({ coins: (user?.coins ?? 0) - pet.price });
    } catch (err) {
      alert(err.response?.data?.message ?? '구매 실패');
    }
  };

  const handleEquip = async (pet) => {
    try {
      await api.patch(`/shop/items/${pet.shop_item_id}/equip`, { equip: true });
      const res = await api.get('/shop/items');
      setPets(res.data);
      const updated = res.data.find((p) => p.shop_item_id === pet.shop_item_id);
      if (updated) setSelected(updated);
      refetchMe();
    } catch (err) {
      alert(err.response?.data?.message ?? '장착 실패');
    }
  };

  const handleUnequip = async (pet) => {
    try {
      await api.patch(`/shop/items/${pet.shop_item_id}/equip`, { equip: false });
      const res = await api.get('/shop/items');
      setPets(res.data);
      const updated = res.data.find((p) => p.shop_item_id === pet.shop_item_id);
      if (updated) setSelected(updated);
      refetchMe();
    } catch (err) {
      alert(err.response?.data?.message ?? '해제 실패');
    }
  };

  return (
    <div
      style={{
        ...modalStyle,
        top: navHeight + 16,
        opacity: (!visible || closing) ? 0 : 1,
        transform: `translateY(${(!visible || closing) ? '16px' : '0px'})`,
      }}
    >
      {/* 헤더 */}
      <div style={headerStyle}>
        <span style={titleStyle}>🐾 펫 상점</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={coinsStyle}>🪙 {coins}</span>
          <button onClick={handleClose} style={closeBtnStyle}>×</button>
        </div>
      </div>

      {/* 바디: 왼쪽 아바타 미리보기 + 오른쪽 펫 그리드 */}
      <div style={bodyStyle}>
        {/* 왼쪽: 아바타 + 선택 펫 미리보기 */}
        <div style={avatarColStyle}>
          <p style={avatarLabelStyle}>미리보기</p>
          <MyAvatarPreview avatarUrl={avatarUrl} pet={selected} />
        </div>

        {/* 오른쪽: 펫 그리드 */}
        <div style={rightColStyle}>
          <div style={gridStyle}>
            {pets.map((pet) => (
              <PetCard
                key={pet.shop_item_id}
                pet={pet}
                isSelected={selected?.shop_item_id === pet.shop_item_id}
                isEquipped={pet.equipped}
                isOwned={pet.owned}
                coins={coins}
                onSelect={setSelected}
                onPurchase={handlePurchase}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// 스타일
// ──────────────────────────────────────────────────────────────────

const modalStyle = {
  position: 'fixed',
  right: '22vw',
  width: '32vw',
  height: '32vw',
  zIndex: 90,
  borderRadius: 20,
  background: 'rgba(15, 28, 54, 0.70)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.50)',
  padding: '14px 16px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  transition: 'opacity 0.32s ease, transform 0.32s ease',
  overflow: 'hidden',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0,
};

const titleStyle = {
  fontSize: '1.1vw',
  fontWeight: 700,
  color: '#f1f3f5',
};

const coinsStyle = {
  fontSize: '0.85vw',
  fontWeight: 700,
  color: '#ffd43b',
  background: 'rgba(255,255,255,0.12)',
  padding: '2px 10px',
  borderRadius: 999,
};

const closeBtnStyle = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.16)',
  color: '#dee2e6',
  fontSize: 16,
  lineHeight: '1',
  cursor: 'pointer',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

const bodyStyle = {
  flex: 1,
  display: 'flex',
  gap: 10,
  overflow: 'hidden',
};

const avatarColStyle = {
  width: '55%',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  flexShrink: 0,
};

const avatarLabelStyle = {
  margin: 0,
  fontSize: '0.72vw',
  fontWeight: 600,
  color: '#9ab5e0',
  textAlign: 'center',
  letterSpacing: '0.3px',
};

const avatarCanvasWrapStyle = {
  flex: 1,
  borderRadius: 12,
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(100,160,255,0.12)',
};

const avatarFallbackStyle = {
  flex: 1,
  borderRadius: 12,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(100,160,255,0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const rightColStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  overflow: 'hidden',
};

const gridStyle = {
  flex: 1,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 6,
  overflow: 'hidden',
};

const cardStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  padding: '4px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  transition: 'outline 0.12s, background 0.12s',
};

const cardNameStyle = {
  margin: 0,
  fontSize: '0.75vw',
  fontWeight: 600,
  color: '#dee2e6',
};

const cardPriceStyle = {
  margin: 0,
  fontSize: '0.65vw',
  fontWeight: 500,
};

const hoverOverlayStyle = {
  position: 'absolute',
  inset: 0,
  borderRadius: 10,
  background: 'rgba(10,20,40,0.82)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
};

const actionBtnStyle = {
  padding: '4px 10px',
  borderRadius: 7,
  border: 'none',
  fontWeight: 700,
  fontSize: '0.7vw',
  transition: 'background 0.15s',
};

const previewFallbackStyle = {
  width: '100%',
  height: '100%',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.06)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
