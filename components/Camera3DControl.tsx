
import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { CameraControlState, ImageData, CameraPreset } from '../types';
import { ROTATE_LIMITS, TILT_LIMITS, PRESET_LIST } from '../constants';

interface Props {
  state: CameraControlState;
  sourceImage: ImageData | null;
  onChange: (updates: Partial<CameraControlState>) => void;
  activePreset?: CameraPreset;
}

export const Camera3DControl: React.FC<Props> = ({ state, sourceImage, onChange, activePreset }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  const modelCameraRef = useRef<THREE.Group | null>(null);
  const photoPlaneRef = useRef<THREE.Mesh | null>(null);
  
  // HUD Arcs
  const rotationArcRef = useRef<THREE.Line | null>(null);
  const tiltArcRef = useRef<THREE.Line | null>(null);
  const distanceLineRef = useRef<THREE.Line | null>(null);
  
  const rotationNodeRef = useRef<THREE.Mesh | null>(null);
  const tiltNodeRef = useRef<THREE.Mesh | null>(null);
  const distanceNodeRef = useRef<THREE.Mesh | null>(null);

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const currentPresetLabel = useMemo(() => {
    return PRESET_LIST.find(p => p.id === activePreset)?.label || "Custom View";
  }, [activePreset]);

  useEffect(() => {
    if (photoPlaneRef.current && sourceImage) {
      const loader = new THREE.TextureLoader();
      loader.load(sourceImage.base64, (texture) => {
        if (photoPlaneRef.current) {
          (photoPlaneRef.current.material as THREE.MeshBasicMaterial).map = texture;
          (photoPlaneRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
          photoPlaneRef.current.visible = true;
        }
      });
    }
  }, [sourceImage]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.set(15, 12, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Grid
    const grid = new THREE.GridHelper(30, 20, 0x222222, 0x111111);
    scene.add(grid);

    // Photo Plane
    const photoGeo = new THREE.PlaneGeometry(4, 5.5);
    const photoMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const photoPlane = new THREE.Mesh(photoGeo, photoMat);
    scene.add(photoPlane);
    photoPlaneRef.current = photoPlane;

    // Camera Model
    const cameraGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.9), new THREE.MeshStandardMaterial({ color: 0x1a2b3c }));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.6, 32), new THREE.MeshStandardMaterial({ color: 0x050505 }));
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.6;
    cameraGroup.add(body, lens);
    scene.add(cameraGroup);
    modelCameraRef.current = cameraGroup;

    // Arcs Construction
    const createArc = (color: number) => {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.LineBasicMaterial({ color, linewidth: 3 });
      return new THREE.Line(geometry, material);
    };

    const rotArc = createArc(0x00ffcc); scene.add(rotArc); rotationArcRef.current = rotArc;
    const tArc = createArc(0xff66cc); scene.add(tArc); tiltArcRef.current = tArc;
    const distLine = createArc(0xffaa00); scene.add(distLine); distanceLineRef.current = distLine;

    // Nodes
    const createNode = (color: number) => new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32), new THREE.MeshBasicMaterial({ color }));
    const rotNode = createNode(0x00ffcc); scene.add(rotNode); rotationNodeRef.current = rotNode;
    const tNode = createNode(0xff66cc); scene.add(tNode); tiltNodeRef.current = tNode;
    const distNode = createNode(0xffcc00); scene.add(distNode); distanceNodeRef.current = distNode;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pointLight = new THREE.PointLight(0xffffff, 1.5);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    let isDragging = false;
    let prevX = 0, prevY = 0;

    const handleDown = (clientX: number, clientY: number) => { isDragging = true; prevX = clientX; prevY = clientY; };
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const dx = clientX - prevX;
      const dy = clientY - prevY;
      onChange({ 
        rotate: Math.max(ROTATE_LIMITS.min, Math.min(ROTATE_LIMITS.max, stateRef.current.rotate + dx * 0.5)),
        tilt: Math.max(TILT_LIMITS.min, Math.min(TILT_LIMITS.max, stateRef.current.tilt - dy * 0.01))
      });
      prevX = clientX; prevY = clientY;
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', (e) => handleDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => isDragging = false);
    
    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      requestAnimationFrame(animate);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    return () => renderer.dispose();
  }, [onChange]);

  useEffect(() => {
    if (!modelCameraRef.current) return;

    const angle = THREE.MathUtils.degToRad(state.rotate);
    const dist = 10 - state.forward * 0.6;
    const camY = state.tilt * 6;
    
    // Position Camera
    modelCameraRef.current.position.set(Math.sin(angle) * dist, camY, Math.cos(angle) * dist);
    modelCameraRef.current.lookAt(0, 0, 0);

    // Update Rotation Arc (Cyan)
    const rotPoints = [];
    for(let i = -90; i <= 90; i+=2) {
      const a = THREE.MathUtils.degToRad(i);
      rotPoints.push(new THREE.Vector3(Math.sin(a) * 8, 0, Math.cos(a) * 8));
    }
    rotationArcRef.current?.geometry.setFromPoints(rotPoints);
    rotationNodeRef.current?.position.set(Math.sin(angle) * 8, 0, Math.cos(angle) * 8);

    // Update Tilt Arc (Pink)
    const tiltPoints = [];
    for(let i = -1; i <= 1; i+=0.1) {
      const a = THREE.MathUtils.degToRad(state.rotate);
      tiltPoints.push(new THREE.Vector3(Math.sin(a) * dist, i * 6, Math.cos(a) * dist));
    }
    tiltArcRef.current?.geometry.setFromPoints(tiltPoints);
    tiltNodeRef.current?.position.copy(modelCameraRef.current.position).multiplyScalar(0.9);
    
    if (tiltNodeRef.current) {
      tiltNodeRef.current.position.y = camY;
    }

    // Update Distance Line (Orange)
    distanceLineRef.current?.geometry.setFromPoints([new THREE.Vector3(0,0,0), modelCameraRef.current.position]);
    distanceNodeRef.current?.position.copy(modelCameraRef.current.position).multiplyScalar(0.6);

  }, [state]);

  return (
    <div className="relative w-full h-full bg-[#0a0a0a] rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
      <div ref={containerRef} className="w-full h-full cursor-move" />
      
      {/* Legend Overlay */}
      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00ffcc]" />
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Rotation (↔)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff66cc]" />
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Vertical Tilt (↕)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffaa00]" />
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Distance/Zoom</span>
          </div>
        </div>
      </div>

      {/* Preset Indicator Overlay */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-black/90 backdrop-blur-2xl px-6 py-2.5 rounded-full border border-white/10 shadow-2xl">
          <span className="text-[11px] font-mono font-black text-[#00ffcc] uppercase tracking-[0.2em] animate-pulse">
            {currentPresetLabel}
          </span>
        </div>
      </div>
    </div>
  );
};
