/**
 * petShopModal.jsx
 * 펫 상점 모달
 * - 화면 오른쪽 절반, 가로 30vw 정사각형
 * - 투명도 70%, 상단 nav(z-index:100)를 가리지 않도록 z-index:90
 */

import { useState, useEffect, useLayoutEffect, Component, Suspense, useRef, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF, Center, Html, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import { useAuth } from '../auth/hooks/useAuth';
import api from '../api/axios';

// ──────────────────────────────────────────────────────────────────
// 펫 메타데이터 (3D 표시용 — ID는 DB shop_item_id와 일치)
// ──────────────────────────────────────────────────────────────────
const PET_META = {
  1: { emoji: '🐰', scale: 0.3 },
  2: { emoji: '🐸', scale: 0.4, rotation: [0, -Math.PI / 2, 0] },
  3: { emoji: '🚲' },
  4: { emoji: '🐔' },
};

// S3에 존재하는 GLB만 preload
const PRELOAD_URLS = [
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/bunny_gltf.glb',
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/FROGG.glb',
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/Bike.glb',
  'https://glogs3bucketforimage.s3.ap-northeast-2.amazonaws.com/pet/chicken.glb',
];
PRELOAD_URLS.forEach((u) => useGLTF.preload(u));

// ──────────────────────────────────────────────────────────────────
// 에러 바운더리 (GLB 로드 실패 시 이모지 폴백)
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
// 내 아바타 (idle 애니메이션, 정면)
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

function MyAvatarPreview({ url, pet }) {
  if (!url) {
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
            <group position={[-0.45, 0, 0]}>
              <MyAvatarModel url={url} scale={1.15} />
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
// 3D 모델 컴포넌트
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
// 선택된 펫 3D 미리보기
// ──────────────────────────────────────────────────────────────────
function PetPreview({ pet }) {
  const meta = PET_META[pet.shop_item_id] ?? {};
  return (
    <CanvasErrorBoundary emoji={meta.emoji ?? '🐾'}>
      <div style={previewBoxStyle}>
        <Canvas camera={{ position: [0, 0.5, 3], fov: 45 }}>
          <ambientLight intensity={1.2} />
          <directionalLight position={[3, 5, 3]} intensity={1.2} />
          <Suspense fallback={
            <Html center>
              <span style={{ fontSize: 36 }}>{meta.emoji ?? '🐾'}</span>
            </Html>
          }>
            <PetModel url={pet.image_url} scale={meta.scale ?? 1} rotation={meta.rotation ?? [0, 0, 0]} />
          </Suspense>
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
}

// ──────────────────────────────────────────────────────────────────
// 펫 선택 카드 (그리드 아이템)
// ──────────────────────────────────────────────────────────────────
function PetCard({ pet, selected, canAfford, onClick, onPurchase, onEquip, onUnequip, loading }) {
  const [hovered, setHovered] = useState(false);
  const meta = PET_META[pet.shop_item_id] ?? {};

  let actionBtn = null;
  if (hovered || selected) {
    if (!pet.owned) {
      actionBtn = (
        <button
          onClick={(e) => { e.stopPropagation(); onPurchase(); }}
          disabled={!canAfford || loading}
          style={{
            ...cardActionBtnStyle,
            background: canAfford && !loading ? '#4e9af1' : 'rgba(134,142,150,0.35)',
            color: canAfford && !loading ? '#fff' : '#868e96',
            cursor: canAfford && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {canAfford ? '구매하기' : '코인부족'}
        </button>
      );
    } else if (!pet.equipped) {
      actionBtn = (
        <button
          onClick={(e) => { e.stopPropagation(); onEquip(); }}
          disabled={loading}
          style={{ ...cardActionBtnStyle, background: '#37b24d', color: '#fff', cursor: 'pointer' }}
        >
          장착하기
        </button>
      );
    } else {
      actionBtn = (
        <button
          onClick={(e) => { e.stopPropagation(); onUnequip(); }}
          disabled={loading}
          style={{ ...cardActionBtnStyle, background: 'rgba(255,255,255,0.15)', color: '#dee2e6', cursor: 'pointer' }}
        >
          장착해제
        </button>
      );
    }
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardStyle,
        outline: selected ? '2px solid #4e9af1' : '2px solid transparent',
        background: selected ? 'rgba(78,154,241,0.22)' : 'rgba(255,255,255,0.10)',
        position: 'relative',
      }}
    >
      <span style={{ fontSize: 22 }}>{meta.emoji ?? '🐾'}</span>
      <p style={cardNameStyle}>{pet.name}</p>
      <p style={{ ...cardPriceStyle, color: canAfford ? '#ced4da' : '#868e96' }}>
        {pet.owned ? (pet.equipped ? '✅ 장착중' : '✔ 보유') : `🪙 ${pet.price}`}
      </p>
      {actionBtn && (
        <div style={cardOverlayStyle}>
          {actionBtn}
        </div>
      )}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────
// 메인 모달
// ──────────────────────────────────────────────────────────────────
export default function PetShopModal({ onClose, navHeight = 80 }) {
  const { user, updateUser, refetchMe } = useAuth();
  const coins = user?.coins ?? 0;
  const [pets, setPets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loading, setLoading] = useState(false);

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
    }).catch((err) => {
      console.error('[ShopItems Error]', err.message);
    });
  }, []);

  // selected가 pets 업데이트될 때 동기화
  useEffect(() => {
    if (!selected) return;
    const updated = pets.find((p) => p.shop_item_id === selected.shop_item_id);
    if (updated) setSelected(updated);
  }, [pets]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 320);
  };

  const handlePurchase = async (pet) => {
    setLoading(true);
    try {
      const res = await api.post(`/shop/items/${pet.shop_item_id}/purchase`);
      updateUser({ coins: res.data.coins });
      setPets((prev) => prev.map((p) =>
        p.shop_item_id === pet.shop_item_id ? { ...p, owned: true } : p
      ));
    } catch (err) {
      alert(err.response?.data?.message ?? '구매에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEquip = async (pet) => {
    setLoading(true);
    try {
      await api.patch(`/shop/items/${pet.shop_item_id}/equip`, { equip: true });
      setPets((prev) => prev.map((p) => ({
        ...p,
        equipped: p.shop_item_id === pet.shop_item_id ? true : (p.type === pet.type ? false : p.equipped),
      })));
      refetchMe();
    } catch (err) {
      alert(err.response?.data?.message ?? '장착에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnequip = async (pet) => {
    setLoading(true);
    try {
      await api.patch(`/shop/items/${pet.shop_item_id}/equip`, { equip: false });
      setPets((prev) => prev.map((p) =>
        p.shop_item_id === pet.shop_item_id ? { ...p, equipped: false } : p
      ));
      refetchMe();
    } catch (err) {
      alert(err.response?.data?.message ?? '장착 해제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const canAfford = selected ? coins >= selected.price : false;

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

      {/* 본문: 왼쪽 내 아바타 / 오른쪽 펫 선택 */}
      <div style={bodyStyle}>
        {/* 왼쪽: 내 캐릭터 */}
        <div style={avatarColStyle}>
          <p style={avatarLabelStyle}>내 캐릭터</p>
          <MyAvatarPreview url={user?.model_url} pet={selected} />
        </div>

        {/* 오른쪽: 선택 정보 + 그리드 */}
        <div style={rightColStyle}>
          {/* 선택된 펫 정보 */}
          <div style={selectedInfoStyle}>
            {selected ? (
              <>
                <span style={{ fontSize: 22 }}>{PET_META[selected.shop_item_id]?.emoji ?? '🐾'}</span>
                <div style={{ flex: 1 }}>
                  <p style={selectedNameStyle}>{selected.name}</p>
                  <p style={selectedPriceStyle}>🪙 {selected.price} 코인</p>
                </div>
                {!selected.owned && (
                  <button
                    style={{
                      ...buyBtnStyle,
                      background: canAfford ? '#4e9af1' : 'rgba(134,142,150,0.35)',
                      color: canAfford ? '#fff' : '#868e96',
                      cursor: canAfford && !loading ? 'pointer' : 'not-allowed',
                    }}
                    disabled={!canAfford || loading}
                    onClick={() => handlePurchase(selected)}
                  >
                    {canAfford ? '구매' : '부족'}
                  </button>
                )}
                {selected.owned && !selected.equipped && (
                  <button
                    style={{ ...buyBtnStyle, background: '#37b24d', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}
                    disabled={loading}
                    onClick={() => handleEquip(selected)}
                  >
                    장착
                  </button>
                )}
                {selected.owned && selected.equipped && (
                  <button
                    style={{ ...buyBtnStyle, background: 'rgba(255,255,255,0.15)', color: '#dee2e6', cursor: loading ? 'not-allowed' : 'pointer' }}
                    disabled={loading}
                    onClick={() => handleUnequip(selected)}
                  >
                    해제
                  </button>
                )}
              </>
            ) : (
              <p style={{ margin: 0, fontSize: '0.8vw', color: '#6c7a9c' }}>펫을 선택해주세요</p>
            )}
          </div>

          {/* 펫 선택 그리드 (3열 × 2행) */}
          <div style={gridStyle}>
            {pets.map((pet) => (
              <PetCard
                key={pet.shop_item_id}
                pet={pet}
                selected={selected?.shop_item_id === pet.shop_item_id}
                canAfford={coins >= pet.price}
                onClick={() => setSelected(pet)}
                onPurchase={() => handlePurchase(pet)}
                onEquip={() => handleEquip(pet)}
                onUnequip={() => handleUnequip(pet)}
                loading={loading}
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
  right: '10vw',
  width: '50vw',
  height: '30vw',
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

const selectedInfoStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  background: 'rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: '6px 10px',
  flexShrink: 0,
};

const selectedNameStyle = {
  margin: 0,
  fontSize: '0.9vw',
  fontWeight: 700,
  color: '#f1f3f5',
};

const selectedPriceStyle = {
  margin: 0,
  fontSize: '0.75vw',
  color: '#adb5bd',
};

const buyBtnStyle = {
  padding: '5px 12px',
  borderRadius: 8,
  border: 'none',
  fontWeight: 700,
  fontSize: '0.8vw',
  transition: 'background 0.15s',
  flexShrink: 0,
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

const cardOverlayStyle = {
  position: 'absolute',
  inset: 0,
  borderRadius: 10,
  background: 'rgba(10,20,40,0.65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const cardActionBtnStyle = {
  padding: '4px 10px',
  borderRadius: 7,
  border: 'none',
  fontWeight: 700,
  fontSize: '0.7vw',
  transition: 'background 0.12s',
};

const previewBoxStyle = {
  width: '100%',
  height: '100%',
  borderRadius: 10,
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.06)',
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
