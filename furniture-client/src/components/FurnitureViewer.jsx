import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const FurnitureViewer = forwardRef(function FurnitureViewer(
  { widthCm, heightCm, depthCm, shelvesCount, colorHex, hasDoor, doorType, model3dUrl },
  ref
) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const furnitureGroupRef = useRef(null);
  const materialRef = useRef(null);

  useImperativeHandle(ref, () => ({
    captureSnapshot: () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return null;
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      return rendererRef.current.domElement.toDataURL('image/png');
    },
  }));

  useEffect(() => {
    const currentMount = mountRef.current;
    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1f242d');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(2.5, 2.5, 3.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(4, 6, 4);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const grid = new THREE.GridHelper(10, 20, 0x555555, 0x333333);
    grid.position.y = 0;
    scene.add(grid);

    const furnitureGroup = new THREE.Group();
    scene.add(furnitureGroup);
    furnitureGroupRef.current = furnitureGroup;

    const material = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.4,
      metalness: 0.1,
    });
    materialRef.current = material;

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!furnitureGroupRef.current || !materialRef.current) return;

    const group = furnitureGroupRef.current;

    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }

    materialRef.current.color.set(colorHex);

    const w = Number(widthCm) / 100;
    const h = Number(heightCm) / 100;
    const d = Number(depthCm) / 100;
    const t = 0.02; // Tebal kayu (2cm)
    const n = Number(shelvesCount);

    const mat = materialRef.current;

    const buildProceduralCabinet = () => {
      // Material logam untuk gagang pintu
      const handleMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37, // Warna gold metalik
        metalness: 0.8,
        roughness: 0.2,
      });

      const createPanel = (pWidth, pHeight, pDepth, posX, posY, posZ, customMat = mat) => {
        const geo = new THREE.BoxGeometry(pWidth, pHeight, pDepth);
        const mesh = new THREE.Mesh(geo, customMat);
        mesh.position.set(posX, posY, posZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      };

      const halfW = w / 2;
      const halfH = h / 2;
      const halfD = d / 2;
      const baseY = halfH;

      // 1. Sisi Kiri & Kanan
      createPanel(t, h, d, -halfW + t / 2, baseY, 0);
      createPanel(t, h, d, halfW - t / 2, baseY, 0);

      // 2. Sisi Atas & Bawah
      const innerW = Math.max(0.1, w - 2 * t);
      createPanel(innerW, t, d, 0, baseY + halfH - t / 2, 0);
      createPanel(innerW, t, d, 0, baseY - halfH + t / 2, 0);

      // 3. Sisi Belakang
      createPanel(w, h, t, 0, baseY, -halfD + t / 2);

      // 4. Sekat Ambalan
      if (n > 1) {
        const innerHeight = h - 2 * t;
        const totalSpacing = innerHeight - (n - 1) * t;
        const slotHeight = totalSpacing / n;

        for (let i = 1; i < n; i++) {
          const shelfPosY = (baseY - halfH + t) + i * slotHeight + (i - 0.5) * t;
          createPanel(innerW, t, d - t, 0, shelfPosY, t / 2);
        }
      }

      // 5. Pintu Lemari & Gagang Logam (Jika opsi pintu aktif)
      if (hasDoor) {
        const doorZ = halfD + t / 2;
        const doorHeight = h - 0.01; // Celah 1cm agar tidak clipping

        if (doorType === 'SINGLE') {
          const doorWidth = w - 0.01;
          createPanel(doorWidth, doorHeight, t, 0, baseY, doorZ);

          // Gagang pintu vertikal di sisi kanan
          createPanel(0.02, 0.2, 0.03, halfW - 0.08, baseY, doorZ + 0.02, handleMat);
        } else {
          // DOUBLE DOOR (2 Pintu Kiri & Kanan)
          const singleDoorW = (w / 2) - 0.008;

          // Pintu Kiri & Gagangnya
          createPanel(singleDoorW, doorHeight, t, -singleDoorW / 2 - 0.002, baseY, doorZ);
          createPanel(0.02, 0.2, 0.03, -0.04, baseY, doorZ + 0.02, handleMat);

          // Pintu Kanan & Gagangnya
          createPanel(singleDoorW, doorHeight, t, singleDoorW / 2 + 0.002, baseY, doorZ);
          createPanel(0.02, 0.2, 0.03, 0.04, baseY, doorZ + 0.02, handleMat);
        }
      }
    };

    if (model3dUrl) {
      const loader = new GLTFLoader();
      loader.load(
        model3dUrl,
        (gltf) => {
          const model = gltf.scene;
          model.scale.set(w, h, d);
          group.add(model);
        },
        undefined,
        (err) => {
          console.warn('Gagal memuat file GLB, fallback ke lemari prosedural:', err);
          buildProceduralCabinet();
        }
      );
    } else {
      buildProceduralCabinet();
    }
  }, [widthCm, heightCm, depthCm, shelvesCount, colorHex, hasDoor, doorType, model3dUrl]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
});

export default FurnitureViewer;