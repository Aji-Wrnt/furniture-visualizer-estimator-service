import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
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
  const gridRef = useRef(null);
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const moveIntervalRef = useRef(null);

  // State mode AR Passthrough Kamera
  const [arMode, setArMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [elevationCm, setElevationCm] = useState(0);

  // Expose fungsi captureSnapshot ke parent (mendukung komposit foto ruangan + mebel 3D)
  useImperativeHandle(ref, () => ({
    captureSnapshot: () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return null;

      // 1. Render frame terbaru
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      const canvas3D = rendererRef.current.domElement;
      const video = videoRef.current;

      // 2. Buat canvas pembantu seukuran viewport render 3D
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = canvas3D.width;
      offscreenCanvas.height = canvas3D.height;
      const ctx = offscreenCanvas.getContext('2d');

      // 3. Jika mode AR aktif dan feed video siap, gambar video ruangan asli
      if (arMode && video && video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
      } else {
        // Background studio standar jika kamera mati (gelap elegan)
        ctx.fillStyle = '#1f242d';
        ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      }

      // 4. Tumpuk render objek mebel 3D Three.js di atasnya
      ctx.drawImage(canvas3D, 0, 0);

      // 5. Ekspor ke Base64 PNG
      return offscreenCanvas.toDataURL('image/png');
    },
  }));

  // Kontrol Transformasi Manual Penuh (Sumbu X, Y, Z & Rotasi)
  const handleTransform = (axis, step) => {
    if (!furnitureGroupRef.current) return;

    if (axis === 'x') {
      furnitureGroupRef.current.position.x += step; // Geser Kiri / Kanan
    } else if (axis === 'z') {
      furnitureGroupRef.current.position.z += step; // Geser Maju / Mundur
    } else if (axis === 'y') {
      furnitureGroupRef.current.position.y += step; // Manual Naik ke Meja / Turun ke Lantai
    } else if (axis === 'rotate' || axis === 'rotateY') {
      furnitureGroupRef.current.rotation.y += step; // Putar Kiri / Kanan
    } else if (axis === 'rotateX') {
      furnitureGroupRef.current.rotation.x += step; // Putar Atas / Bawah
    }
  };

  const startMoving = (axis, step) => {
    handleTransform(axis, step);
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    moveIntervalRef.current = setInterval(() => {
      handleTransform(axis, step);
    }, 40); // 25fps update rate
  };

  const stopMoving = () => {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  };

  // Toggle AR Mode: Akses Kamera Universal (Webcam Laptop & Kamera Belakang HP)
  const toggleARMode = async () => {
    if (!arMode) {
      try {
        let stream = null;

        // Coba kamera belakang untuk HP (environment)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch (mobileErr) {
          // Fallback ke webcam laptop/PC
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Transparankan background Three.js agar video tembus
        if (sceneRef.current) {
          sceneRef.current.background = null;
        }
        if (rendererRef.current) {
          rendererRef.current.setClearColor(0x000000, 0);
        }

        // Sembunyikan grid lantai
        if (gridRef.current) {
          gridRef.current.visible = false;
        }

        // Matikan OrbitControls agar kamera Three.js statis sesuai posisi webcam
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }

        // Kunci sudut kamera menunduk ke lantai (ketinggian mata manusia 1.4m, lookAt lantai 0.4m)
        if (cameraRef.current) {
          cameraRef.current.position.set(0, 1.4, 2.5);
          cameraRef.current.lookAt(0, 0.4, 0);
        }

        setArMode(true);
      } catch (err) {
        alert('Gagal mengakses kamera/webcam: ' + err.message);
      }
    } else {
      // Matikan stream kamera
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      // Kembalikan background studio 3D
      if (sceneRef.current) {
        sceneRef.current.background = new THREE.Color('#1f242d');
      }
      if (rendererRef.current) {
        rendererRef.current.setClearColor(0x1f242d, 1);
      }

      // Tampilkan kembali grid lantai
      if (gridRef.current) {
        gridRef.current.visible = true;
      }

      // Hidupkan kembali OrbitControls untuk mode studio
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }

      setArMode(false);
    }
  };

  // Direct Gesture Drag: Rotasi Bebas Tanpa Clamping (Horizontal Sumbu Y & Vertikal Sumbu X)
  useEffect(() => {
    const canvas = mountRef.current;
    if (!canvas || !arMode) return;

    let isDragging = false;
    let previousPointerX = 0;
    let previousPointerY = 0;

    // --- MOUSE CONTROLS (DESKTOP/LAPTOP) ---
    const onMouseDown = (e) => {
      isDragging = true;
      previousPointerX = e.clientX;
      previousPointerY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!isDragging || !furnitureGroupRef.current) return;
      const deltaX = e.clientX - previousPointerX;
      const deltaY = e.clientY - previousPointerY;

      // Rotasi bebas horizontal & vertikal
      furnitureGroupRef.current.rotation.y += deltaX * 0.015;
      furnitureGroupRef.current.rotation.x += deltaY * 0.015;

      previousPointerX = e.clientX;
      previousPointerY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // --- TOUCH CONTROLS (SMARTPHONE / ROG PHONE) ---
    const onTouchStart = (e) => {
      if (e.touches && e.touches.length === 1) {
        isDragging = true;
        previousPointerX = e.touches[0].clientX;
        previousPointerY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e) => {
      if (!isDragging || !furnitureGroupRef.current || !e.touches || e.touches.length === 0) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;

      const deltaX = currentX - previousPointerX;
      const deltaY = currentY - previousPointerY;

      // Rotasi bebas horizontal (Yaw) & vertikal (Pitch) tanpa batasan/clamping
      furnitureGroupRef.current.rotation.y += deltaX * 0.015;
      furnitureGroupRef.current.rotation.x += deltaY * 0.015;

      previousPointerX = currentX;
      previousPointerY = currentY;
    };

    const onTouchEnd = () => {
      isDragging = false;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [arMode]);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 300;
    const height = currentMount.clientHeight || 300;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1f242d');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 2.8);
    camera.lookAt(0, 0.6, 0);
    cameraRef.current = camera;

    // 2. Renderer dengan alpha: true (agar bisa transparan saat AR passthrough aktif)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.6, 0);
    controlsRef.current = controls;

    // 4. Pencahayaan
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(4, 6, 4);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Grid Lantai Studio
    const grid = new THREE.GridHelper(10, 20, 0x555555, 0x333333);
    grid.position.y = 0;
    scene.add(grid);
    gridRef.current = grid;

    // Group penampung mebel
    const furnitureGroup = new THREE.Group();
    scene.add(furnitureGroup);
    furnitureGroupRef.current = furnitureGroup;

    // Material dasar kayu
    const material = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.4,
      metalness: 0.1,
    });
    materialRef.current = material;

    // Render loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (controlsRef.current && controlsRef.current.enabled) {
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    // ResizeObserver untuk responsif layar laptop & resize jendela
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW === 0 || newH === 0) return;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    });
    resizeObserver.observe(currentMount);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Update geometri saat parameter berubah
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
        const doorHeight = h - 0.01;

        if (doorType === 'SINGLE') {
          const doorWidth = w - 0.01;
          createPanel(doorWidth, doorHeight, t, 0, baseY, doorZ);
          createPanel(0.02, 0.2, 0.03, halfW - 0.08, baseY, doorZ + 0.02, handleMat);
        } else {
          const singleDoorW = (w / 2) - 0.008;

          createPanel(singleDoorW, doorHeight, t, -singleDoorW / 2 - 0.002, baseY, doorZ);
          createPanel(0.02, 0.2, 0.03, -0.04, baseY, doorZ + 0.02, handleMat);

          createPanel(singleDoorW, doorHeight, t, singleDoorW / 2 + 0.002, baseY, doorZ);
          createPanel(0.02, 0.2, 0.03, 0.04, baseY, doorZ + 0.02, handleMat);
        }
      }

      createContactShadow();
    };

    const createContactShadow = () => {
      const shadowGeo = new THREE.PlaneGeometry(Math.max(w * 1.35, 0.8), Math.max(d * 1.35, 0.8));
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 256;
      shadowCanvas.height = 256;
      const shadowCtx = shadowCanvas.getContext('2d');

      const gradient = shadowCtx.createRadialGradient(128, 128, 16, 128, 128, 120);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
      gradient.addColorStop(0.35, 'rgba(0, 0, 0, 0.38)');
      gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.12)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      shadowCtx.fillStyle = gradient;
      shadowCtx.fillRect(0, 0, 256, 256);

      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      });

      const groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
      groundShadow.rotation.x = -Math.PI / 2;
      groundShadow.position.set(0, 0.002, 0);
      group.add(groundShadow);
    };

    if (model3dUrl) {
      const loader = new GLTFLoader();
      loader.load(
        model3dUrl,
        (gltf) => {
          const model = gltf.scene;
          model.scale.set(w, h, d);
          group.add(model);
          createContactShadow();
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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Feed Kamera Passthrough (Webcam Laptop / Kamera Belakang HP) */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: arMode ? 'block' : 'none',
          zIndex: 1,
        }}
      />

      {/* Kanvas 3D Three.js */}
      <div
        ref={mountRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          zIndex: 2,
        }}
      />

      {/* Tombol Toggle Kamera AR Passthrough */}
      <button
        type="button"
        onClick={toggleARMode}
        className="btn-ar-toggle"
      >
        <span>{arMode ? '⏹️ Matikan Kamera (Mode 3D)' : '📷 Aktifkan Kamera Ruangan (AR)'}</span>
      </button>

      {/* Kontrol Analog Virtual (D-Pad & Rotasi On-Screen) saat Mode AR Aktif */}
      {arMode && (
        <button
          type="button"
          onClick={() => setShowControls((prev) => !prev)}
          className="btn-controls-toggle"
          title="Sembunyikan atau Tampilkan Kontrol Analog"
        >
          {showControls ? '🎮 Sembunyikan Kontrol' : '🎮 Tampilkan Kontrol'}
        </button>
      )}

      {/* Kontrol Analog Virtual Split-Thumb saat Mode AR Aktif */}
      {arMode && showControls && (
        <div className="ar-control-overlay">
          {/* Sisi Kiri: D-Pad Translasi & Tombol Elevasi Manual */}
          <div className="left-controls">
            {/* Tombol Manual Elevasi Sumbu Y (Naik ke Meja / Turun ke Lantai) */}
            <div className="elevation-buttons">
              <button
                type="button"
                className="dpad-btn elev-btn"
                title="Naikkan ke Meja (Sumbu +Y)"
                onMouseDown={() => startMoving('y', 0.04)}
                onMouseUp={stopMoving}
                onTouchStart={() => startMoving('y', 0.04)}
                onTouchEnd={stopMoving}
              >
                ▲ Y
              </button>
              <button
                type="button"
                className="dpad-btn elev-btn"
                title="Turunkan ke Lantai (Sumbu -Y)"
                onMouseDown={() => startMoving('y', -0.04)}
                onMouseUp={stopMoving}
                onTouchStart={() => startMoving('y', -0.04)}
                onTouchEnd={stopMoving}
              >
                ▼ Y
              </button>
            </div>

            {/* D-Pad Maju, Mundur, Kiri, Kanan */}
            <div className="dpad-container">
              <button
                type="button"
                className="dpad-btn up"
                title="Maju (Mendekat ke Dinding)"
                onMouseDown={() => startMoving('z', -0.05)}
                onMouseUp={stopMoving}
                onTouchStart={() => startMoving('z', -0.05)}
                onTouchEnd={stopMoving}
              >
                ▲
              </button>
              <div className="dpad-row">
                <button
                  type="button"
                  className="dpad-btn left"
                  title="Geser Kiri"
                  onMouseDown={() => startMoving('x', -0.05)}
                  onMouseUp={stopMoving}
                  onTouchStart={() => startMoving('x', -0.05)}
                  onTouchEnd={stopMoving}
                >
                  ◀
                </button>
                <button
                  type="button"
                  className="dpad-btn center-reset"
                  title="Reset Posisi & Rotasi"
                  onClick={() => {
                    if (furnitureGroupRef.current) {
                      furnitureGroupRef.current.position.set(0, 0, 0);
                      furnitureGroupRef.current.rotation.set(0, 0, 0);
                    }
                  }}
                >
                  ◉
                </button>
                <button
                  type="button"
                  className="dpad-btn right"
                  title="Geser Kanan"
                  onMouseDown={() => startMoving('x', 0.05)}
                  onMouseUp={stopMoving}
                  onTouchStart={() => startMoving('x', 0.05)}
                  onTouchEnd={stopMoving}
                >
                  ▶
                </button>
              </div>
              <button
                type="button"
                className="dpad-btn down"
                title="Mundur (Mendekat ke Layar)"
                onMouseDown={() => startMoving('z', 0.05)}
                onMouseUp={stopMoving}
                onTouchStart={() => startMoving('z', 0.05)}
                onTouchEnd={stopMoving}
              >
                ▼
              </button>
            </div>
          </div>

          {/* Sisi Kanan: Rotasi Manual */}
          <div className="rotation-controls">
            <button
              type="button"
              className="rot-btn"
              title="Putar Kiri"
              onMouseDown={() => startMoving('rotateY', -0.08)}
              onMouseUp={stopMoving}
              onTouchStart={() => startMoving('rotateY', -0.08)}
              onTouchEnd={stopMoving}
            >
              ↺ Putar Kiri
            </button>
            <button
              type="button"
              className="rot-btn"
              title="Putar Kanan"
              onMouseDown={() => startMoving('rotateY', 0.08)}
              onMouseUp={stopMoving}
              onTouchStart={() => startMoving('rotateY', 0.08)}
              onTouchEnd={stopMoving}
            >
              Putar Kanan ↻
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default FurnitureViewer;