
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

export const Camera3DControl: React.FC<Props> = ({ state, sourceImage, onChange, activePreset }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelCameraRef = useRef<THREE.Group | null>(null);
  const photoPlaneRef = useRef<THREE.Mesh | null>(null);
  
  const rotationArcRef = useRef<THREE.Line | null>(null);
  const tiltArcRef = useRef<THREE.Line | null>(null);
  const distanceLineRef = useRef<THREE.Line | null>(null);
  const lensMeshRef = useRef<THREE.Mesh | null>(null);

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const currentPresetLabel = useMemo(() => {
    const matched = PRESET_LIST.find(p => p.id === activePreset);
    return matched?.label || "Свободный Ракурс";
  }, [activePreset]);

  // Texture Loader for Identity Preservation Visuals
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

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.Fog(0x050505, 20, 100);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 1000);
    camera.position.set(25, 18, 25);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Enhanced Grid & Environment
    const grid = new THREE.GridHelper(60, 30, 0x333333, 0x111111);
    scene.add(grid);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    
    const spotLight = new THREE.SpotLight(0xffffff, 2);
    spotLight.position.set(15, 30, 15);
    spotLight.castShadow = true;
    scene.add(spotLight);

    // Identity Anchor (Photo Plane)
    const photoMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const photoPlane = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), photoMat);
    photoPlane.position.y = 3;
    scene.add(photoPlane);
    photoPlaneRef.current = photoPlane;

    // Professional Camera Model
    const camGroup = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.9, 0.7), 
        new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 1, roughness: 0.2 })
    );
    
    // Lens that changes based on wideAngle state
    const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, 0.6, 32), 
        new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.8, roughness: 0.1 })
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.5;
    lensMeshRef.current = lens;
    
    const eyeRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.015, 16, 100), 
        new THREE.MeshBasicMaterial({ color: 0xea580c })
    );
    eyeRing.rotation.x = Math.PI / 2;
    eyeRing.position.z = 0.8;
    
    camGroup.add(body, lens, eyeRing);
    scene.add(camGroup);
    modelCameraRef.current = camGroup;

    // Dynamic Helpers
    const rotGeo = new THREE.BufferGeometry();
    const rotArc = new THREE.Line(rotGeo, new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.4 }));
    scene.add(rotArc);
    rotationArcRef.current = rotArc;

    const tiltGeo = new THREE.BufferGeometry();
    const tiltArc = new THREE.Line(tiltGeo, new THREE.LineBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.4 }));
    scene.add(tiltArc);
    tiltArcRef.current = tiltArc;

    const distGeo = new THREE.BufferGeometry();
    const distLine = new THREE.Line(distGeo, new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3 }));
    scene.add(distLine);
    distanceLineRef.current = distLine;

    // Interaction State
    let isDragging = false;
    let lastX = 0, lastY = 0;

    const handleInputStart = (x: number, y: number) => {
      isDragging = true;
      lastX = x;
      lastY = y;
    };

    const handleInputMove = (x: number, y: number) => {
      if (!isDragging) return;
      const dx = x - lastX;
      const dy = y - lastY;
      
      onChange({ 
        rotate: Math.max(ROTATE_LIMITS.min, Math.min(ROTATE_LIMITS.max, stateRef.current.rotate + dx * 0.4)),
        tilt: Math.max(TILT_LIMITS.min, Math.min(TILT_LIMITS.max, stateRef.current.tilt - dy * 0.008))
      });
      
      lastX = x;
      lastY = y;
    };

    const handleInputEnd = () => { isDragging = false; };

    // Events
    const canvas = renderer.domElement;
    
    const onMouseDown = (e: MouseEvent) => handleInputStart(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => handleInputMove(e.clientX, e.clientY);
    const onMouseUp = () => handleInputEnd();

    const onTouchStart = (e: TouchEvent) => handleInputStart(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();
        handleInputMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => handleInputEnd();

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    const animate = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        // Subtle drift or smoothing can be added here if needed
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('touchstart', onTouchStart);
      renderer.dispose();
    };
  }, []);

  // Reactive Logic
  useEffect(() => {
    if (!modelCameraRef.current || !photoPlaneRef.current || !lensMeshRef.current) return;

    const angle = THREE.MathUtils.degToRad(state.rotate);
    const dist = 14 - state.forward * 1.0;
    const camY = (state.tilt * 10) + 3;
    
    const posX = Math.sin(angle) * dist;
    const posZ = Math.cos(angle) * dist;
    
    // Smooth transition
    modelCameraRef.current.position.set(posX, camY, posZ);
    
    const targetY = state.floating ? 6 : 3;
    photoPlaneRef.current.position.y = targetY;
    modelCameraRef.current.lookAt(0, targetY, 0);

    // Update Helpers Visuals
    const rotPoints = [];
    for(let i = -110; i <= 110; i+=2) {
      const a = THREE.MathUtils.degToRad(i);
      rotPoints.push(new THREE.Vector3(Math.sin(a) * dist, 0.05, Math.cos(a) * dist));
    }
    rotationArcRef.current?.geometry.setFromPoints(rotPoints);

    const tiltPoints = [new THREE.Vector3(posX, 0.05, posZ), new THREE.Vector3(posX, camY, posZ)];
    tiltArcRef.current?.geometry.setFromPoints(tiltPoints);

    const distPoints = [new THREE.Vector3(0, targetY, 0), new THREE.Vector3(posX, camY, posZ)];
    distanceLineRef.current?.geometry.setFromPoints(distPoints);

    // Visual Lens Feedback
    const lensScale = state.wideAngle ? 0.7 : 1.0;
    lensMeshRef.current.scale.set(1.2, 1, lensScale);

  }, [state]);

  return (
    <div className="relative w-full h-full bg-[#050505] rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden border border-white/5 shadow-inner transition-all group">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none" />
      
      {/* UI Overlays */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 pointer-events-none z-20">
        <div className="bg-black/60 backdrop-blur-2xl p-4 rounded-2xl border border-white/10 space-y-2">
            {[
                { label: 'Orbit', color: '#00ffcc', val: `${state.rotate.toFixed(0)}°` },
                { label: 'Pitch', color: '#ff00ff', val: `${state.tilt.toFixed(2)}` },
                { label: 'Dolly', color: '#ffaa00', val: `${state.forward.toFixed(0)}m` }
            ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest min-w-[40px]">{item.label}</span>
                    <span className="text-[9px] font-mono font-bold text-white">{item.val}</span>
                </div>
            ))}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/80 backdrop-blur-3xl px-6 py-3 rounded-full border border-white/10 z-20 shadow-2xl">
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.3em] whitespace-nowrap">
          {currentPresetLabel}
        </span>
      </div>

      <div className="absolute top-6 right-6 lg:opacity-0 group-hover:opacity-100 transition-opacity">
         <div className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/5 text-[8px] font-bold text-gray-500 uppercase tracking-widest">
            3D Engine Active
         </div>
      </div>
    </div>
  );
};
