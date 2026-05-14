import React, { useRef, useEffect, useLayoutEffect, useMemo, useState, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, Center } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import { PET_META_BY_URL } from '../petshop/petMeta';

const AVATAR_POOL = [
  '/models/avatar/f_1.glb',
  '/models/avatar/m_2.glb',
  '/models/avatar/f_4.glb',
  '/models/avatar/m_4.glb',
  '/models/avatar/f_7.glb',
  '/models/avatar/m_6.glb',
];

function pickAvatarByUserId(userId) {
  const n = Number(userId);
  const idx = Number.isFinite(n) ? Math.abs(n) % AVATAR_POOL.length : 0;
  return AVATAR_POOL[idx];
}

/** 뷰어 전용 아바타 — idle 애니메이션만 담당, scale/rotation은 부모 group에서 제어 */
function AvatarViewer({ url }) {
  const { scene, animations } = useGLTF(url);
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const rootRef = useRef();
  const { actions, names } = useAnimations(animations, rootRef);

  useEffect(() => {
    if (!names.length) return;
    const idleAction = actions[names[1]] ?? actions[names[0]];
    if (idleAction) idleAction.reset().fadeIn(0.3).play();
    return () => { idleAction?.stop(); };
  }, [actions, names]);

  return <primitive ref={rootRef} object={cloned} />;
}

/** 장착된 펫 3D 렌더링 */
function PetViewer({ url }) {
  const meta = PET_META_BY_URL[url] ?? {};
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return (
    <group position={[0.9, 0, 0]} scale={0.45}>
      <Center>
        <primitive
          object={cloned}
          scale={meta.scale ?? 1}
          rotation={meta.rotation ?? [0, 0, 0]}
        />
      </Center>
    </group>
  );
}

/** 캐릭터 수직 중앙(y≈0.85)을 바라보도록 카메라 고정 */
function CameraSetup({ hasPet }) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    // 아바타는 항상 중앙(0,0,0), 펫이 있으면 lookAt을 살짝 오른쪽으로 이동
    const lookX = hasPet ? 0.35 : 0;
    camera.position.set(0, 0.85, 3.2);
    camera.lookAt(lookX, 0.85, 0);
    camera.updateProjectionMatrix();
  }, [camera, hasPet]);
  return null;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 5, 3]} intensity={1.2} />
      <directionalLight position={[-2, 2, -2]} intensity={0.3} />
      <pointLight position={[0, 3, 2]} intensity={0.5} color="#8ecae6" />
    </>
  );
}

/** 슬라이더 한 줄 */
function SliderRow({ label, value, min, max, step, fmt, onChange }) {
  return (
    <div style={sliderRowStyle}>
      <div style={sliderLabelStyle}>
        <span>{label}</span>
        <span style={{ color: '#7eb3ff', fontVariantNumeric: 'tabular-nums' }}>{fmt(value)}</span>
      </div>
      <input
        className="av-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={rangeBaseStyle}
      />
    </div>
  );
}

/* ── 스타일 ─────────────────────────────────────────── */
const panelStyle = {
  position: 'fixed',
  left: '24px',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '240px',
  height: '440px',
  background: 'rgba(10, 18, 42, 0.82)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: '20px',
  border: '1px solid rgba(100, 160, 255, 0.22)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.55)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  zIndex: 89,
  animation: 'avSlideIn 0.38s cubic-bezier(0.34,1.56,0.64,1)',
};

const canvasWrapStyle = {
  flex: 1,
  position: 'relative',
};

const nameBadgeStyle = {
  position: 'absolute',
  top: '14px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(14, 26, 64, 0.78)',
  border: '1px solid rgba(100,160,255,0.28)',
  borderRadius: '20px',
  padding: '4px 14px',
  color: '#c8dcff',
  fontSize: '13px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  zIndex: 2,
};

const controlsStyle = {
  padding: '10px 16px 14px',
  borderTop: '1px solid rgba(100,160,255,0.12)',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const sliderRowStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const sliderLabelStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  color: '#9ab5e0',
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.3px',
};

const rangeBaseStyle = {
  width: '100%',
  cursor: 'pointer',
  accentColor: '#4e9af1',
};

const css = `
@keyframes avSlideIn {
  from { opacity: 0; transform: translateY(-50%) translateX(-20px) scale(0.94); }
  to   { opacity: 1; transform: translateY(-50%) translateX(0)     scale(1);    }
}
.av-range {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 4px;
  background: rgba(78,154,241,0.25);
  outline: none;
  width: 100%;
}
.av-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4e9af1;
  cursor: pointer;
  box-shadow: 0 0 6px rgba(78,154,241,0.6);
  transition: transform 0.15s ease;
}
.av-range::-webkit-slider-thumb:hover {
  transform: scale(1.25);
}
.av-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4e9af1;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 6px rgba(78,154,241,0.6);
}
`;

/* ── 컴포넌트 ─────────────────────────────────────────── */
export default function AvatarViewerModal({ user }) {
  const [modelScale, setModelScale] = useState(1.0);
  const [rotY, setRotY] = useState(0);
  const modelUrl = user?.avatar || user?.model_url || pickAvatarByUserId(user?.id);
  const petUrl = user?.pet_url ?? null;

  // 유저가 바뀔 때 슬라이더 초기화
  useEffect(() => {
    setModelScale(1.0);
    setRotY(0);
  }, [user?.id]);

  if (!user) return null;

  return (
    <>
      <style>{css}</style>
      <div style={panelStyle}>
        {/* 이름 뱃지 */}
        <div style={{ position: 'relative' }}>
          <div style={nameBadgeStyle}>{user.name}</div>
        </div>

        {/* 3D Canvas */}
        <div style={canvasWrapStyle}>
          <Canvas
            camera={{ position: [0, 0.85, 3.2], fov: 48 }}
            style={{ width: '100%', height: '100%' }}
          >
            <CameraSetup hasPet={Boolean(petUrl)} />
            <Lights />
            {/* 아바타 + 펫을 하나의 그룹으로 묶어 크기/회전 동기화 */}
            <group scale={modelScale} rotation={[0, rotY * (Math.PI / 180), 0]}>
              <Suspense fallback={null}>
                <AvatarViewer url={modelUrl} />
              </Suspense>
              {petUrl && (
                <Suspense fallback={null}>
                  <PetViewer url={petUrl} />
                </Suspense>
              )}
            </group>
          </Canvas>
        </div>

        {/* 슬라이더 컨트롤 */}
        <div style={controlsStyle}>
          <SliderRow
            label="크기"
            value={modelScale}
            min={0.3}
            max={3}
            step={0.05}
            fmt={(v) => `${v.toFixed(2)}x`}
            onChange={setModelScale}
          />
          <SliderRow
            label="방향"
            value={rotY}
            min={0}
            max={360}
            step={1}
            fmt={(v) => `${v}°`}
            onChange={setRotY}
          />
        </div>
      </div>
    </>
  );
}
