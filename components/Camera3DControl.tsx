
import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { CameraControlState, ImageData, CameraPreset } from '../types';
import { ROTATE_LIMITS, TILT_LIMITS, PRESET_LIST } from '../constants';

interface Props {
  state: CameraControlState;
  sourceImage: ImageData | null;
  onChange: (updates: Partial<CameraControlState>) => void;
  onReplace?: () => void;
  activePreset?: CameraPreset;
}

export const Camera3DControl: React.FC<Props> = ({ state, sourceImage, onChange, onReplace, activePreset }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelCameraRef = useRef<THREE.Group | null>(null);
  const photoPlaneRef = useRef<THREE.Mesh | null>(null);
  const frustumRef = useRef<THREE.LineSegments | null>(null);
  
  const rotationArcRef = useRef<THREE.Line | null>(null);

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const currentPresetLabel = useMemo(() => {
    // Check if current state matches any preset, else "Custom View"
    const matched = PRESET_LIST.find(p => p.id === activePreset);
    return matched?.label || "Manual Sync";
  }, [activePreset, state]);

  // Texture Loader logic
  useEffect(() => {
    if (photoPlaneRef.current && sourceImage) {
      const loader = new THREE.TextureLoader();
      loader.load(sourceImage.base64, (texture) => {
        if (photoPlaneRef.current) {
          const mat = photoPlaneRef.current.material as THREE.MeshBasicMaterial;
          mat.map = texture;
          mat.needsUpdate = true;
          photoPlaneRef.current.visible = true;
        }
      });
    }
  }, [sourceImage]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.set(18, 15, 18);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Grid & Lighting
    const grid = new THREE.GridHelper(40, 40, 0x1a1a1a, 0x0a0a0a);
    scene.add(grid);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const spot = new THREE.SpotLight(0xff9900, 100, 100, 0.3);
    spot.position.set(10, 20, 10);
    scene.add(spot);

    // Subject Plane
    const photoMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const photoPlane = new THREE.Mesh(new THREE.PlaneGeometry(5, 7), photoMat);
    scene.add(photoPlane);
    photoPlaneRef.current = photoPlane;

    // Virtual Camera Model
    const camGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.0), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 }));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.8, 32), new THREE.MeshStandardMaterial({ color: 0x050505 }));
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.7;
    camGroup.add(body, lens);
    
    // Frustum Visualizer
    const frustumGeo = new THREE.EdgesGeometry(new THREE.ConeGeometry(1, 4, 4));
    const frustumMat = new THREE.LineBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.3 });
    const frustum = new THREE.LineSegments(frustumGeo, frustumMat);
    frustum.rotation.x = -Math.PI / 2;
    frustum.position.z = 2.5;
    camGroup.add(frustum);
    frustumRef.current = frustum;

    scene.add(camGroup);
    modelCameraRef.current = camGroup;

    // Rotation Arc
    const rotGeo = new THREE.BufferGeometry();
    const rotArc = new THREE.Line(rotGeo, new THREE.LineBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.15 }));
    scene.add(rotArc);
    rotationArcRef.current = rotArc;

    let isDragging = false;
    let prevX = 0, prevY = 0;

    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      onChange({ 
        rotate: Math.max(ROTATE_LIMITS.min, Math.min(ROTATE_LIMITS.max, stateRef.current.rotate + dx * 0.4)),
        tilt: Math.max(TILT_LIMITS.min, Math.min(TILT_LIMITS.max, stateRef.current.tilt - dy * 0.008))
      });
      prevX = e.clientX; prevY = e.clientY;
    };
    const onMouseUp = () => { isDragging = false; };

    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const animate = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      renderer.dispose();
      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!modelCameraRef.current || !photoPlaneRef.current) return;

    const angle = THREE.MathUtils.degToRad(state.rotate);
    const dist = 11 - state.forward * 0.8;
    const camY = state.tilt * 8;
    
    modelCameraRef.current.position.set(Math.sin(angle) * dist, camY, Math.cos(angle) * dist);
    modelCameraRef.current.lookAt(0, state.floating ? 3 : 0, 0);

    photoPlaneRef.current.position.y = state.floating ? 3 : 0;

    // Update Rotation Guideline
    const rotPoints = [];
    for(let i = -90; i <= 90; i+=2) {
      const a = THREE.MathUtils.degToRad(i);
      rotPoints.push(new THREE.Vector3(Math.sin(a) * dist, 0, Math.cos(a) * dist));
    }
    rotationArcRef.current?.geometry.setFromPoints(rotPoints);
    if (rotationArcRef.current) rotationArcRef.current.position.y = camY;

    // Adjust frustum based on wideAngle
    if (frustumRef.current) {
      const scale = state.wideAngle ? 2.5 : 1.0;
      frustumRef.current.scale.set(scale, scale, 1);
    }
  }, [state]);

  return (
    <div className="relative w-full h-full bg-[#050505] rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      
      {sourceImage && (
        <button 
          onClick={onReplace}
          className="absolute top-8 right-8 bg-black/60 hover:bg-black/90 backdrop-blur-2xl px-5 py-3 rounded-2xl border border-white/10 flex items-center gap-3 transition-all group z-10"
        >
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white">Change Scan</span>
        </button>
      )}

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-black/90 backdrop-blur-3xl px-8 py-3 rounded-full border border-orange-500/20 shadow-2xl flex items-center gap-5">
          <div className="flex gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
             <div className="w-1.5 h-1.5 rounded-full bg-orange-500/40" />
          </div>
          <span className="text-[10px] font-mono font-black text-white uppercase tracking-[0.3em]">
            {currentPresetLabel} // {state.floating ? 'LEV_MOD_1' : 'GRND_LOK'}
          </span>
        </div>
      </div>
    </div>
  );
};
