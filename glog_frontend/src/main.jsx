import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useGLTF } from '@react-three/drei';
import App from './App';
import './feed/theme/feedTheme.css';

// 앱 시작 즉시 지구본 모델 백그라운드 preload
useGLTF.preload('/models/earth/scene.gltf');

// Access Token 메모리 저장소 (전역 변수, 새로고침 시 초기화 → AuthContext가 refresh로 복구)
window.__accessToken = null;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
