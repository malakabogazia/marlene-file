import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Globe3D({ locations = [], selectedLocation, onSelectLocation }) {
  const mountRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    // 1. إعداد المشهد والكاميرا والريندر
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 2.75;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. مجموعة الكرة الأرضية عشان تلف بكل اللي عليها
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 3. خامة الكرة الأرضية (Vintage Earth Texture)
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
    );
    const bumpTexture = textureLoader.load(
      'https://unpkg.com/three-globe/example/img/earth-topology.png'
    );

    const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.03,
      roughness: 0.75,
      metalness: 0.1,
      color: new THREE.Color('#e8cfa8'), // لمسة دافئة عتيقة مطابقة لألوان مكتب مارلين
    });

    const earthMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    globeGroup.add(earthMesh);

    // 4. إضاءة دافئة تحاكي مصباح المكتب (Warm Desk Lamp Lighting)
    const ambientLight = new THREE.AmbientLight(0xffe6c2, 1.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffd28a, 1.8);
    directionalLight.position.set(-3, 2, 4);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0x4a7c9b, 0.6);
    backLight.position.set(3, -2, -3);
    scene.add(backLight);

    // 5. تحويل إحداثيات (خط العرض والطول) لنقطة 3D على سطح الكرة
    const latLngToVector3 = (lat, lng, radius = 1.02) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      return new THREE.Vector3(x, y, z);
    };

    // إضافة نقاط المواقع الـ 3 على سطح الكرة
    markersRef.current = [];
    locations.forEach((loc) => {
      const pos = latLngToVector3(loc.lat, loc.lng, 1.025);
      const isSelected = selectedLocation === loc.id;

      // الدائرة الأساسية للنقطة
      const dotGeo = new THREE.SphereGeometry(isSelected ? 0.045 : 0.032, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0xff7b00 : 0xfff5e0,
      });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      dotMesh.position.copy(pos);
      dotMesh.userData = { locationId: loc.id };

      // حلقة خارجية حول النقطة زي الفيجما
      const ringGeo = new THREE.RingGeometry(0.045, 0.062, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0xff9d3b : 0xfdf5e6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.lookAt(new THREE.Vector3(0, 0, 0));

      globeGroup.add(dotMesh);
      globeGroup.add(ringMesh);
      markersRef.current.push(dotMesh);
    });

    // توجيه الكرة مبدئياً ناحية النقاط المختارة لو وجدت
    if (locations.length > 0) {
      const targetLoc = locations.find((l) => l.id === selectedLocation) || locations[0];
      globeGroup.rotation.y = -((targetLoc.lng + 90) * (Math.PI / 180));
      globeGroup.rotation.x = (targetLoc.lat * 0.4) * (Math.PI / 180);
    }

    // 6. التحكم بالماوس (تدوير الكرة بالسحب + الضغط على النقاط)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaMove = {
        x: e.clientX - previousMousePosition.x,
        y: e.clientY - previousMousePosition.y,
      };
      globeGroup.rotation.y += deltaMove.x * 0.007;
      globeGroup.rotation.x += deltaMove.y * 0.007;
      // تحديد زاوية الميل الرأسي عشان الكرة متتقلبش بزيادة
      globeGroup.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, globeGroup.rotation.x));
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = (e) => {
      // لو المستخدم ضغط كليك بدون سحب، نشوف لو داس على نقطة من الـ 3
      const moveDist = Math.hypot(
        e.clientX - previousMousePosition.x,
        e.clientY - previousMousePosition.y
      );
      if (isDragging && moveDist < 5) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(markersRef.current);
        if (intersects.length > 0 && onSelectLocation) {
          onSelectLocation(intersects[0].object.userData.locationId);
        }
      }
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 7. حلقة الحركة (دوران هادئ تلقائي لما المستخدم مبيحركهاش)
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isDragging) {
        globeGroup.rotation.y += 0.0025;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      domElem.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.dispose();
    };
  }, [locations, selectedLocation, onSelectLocation]);

  return (
    <div
      ref={mountRef}
      style={{
        width: '360px',
        height: '360px',
        cursor: 'grab',
        filter: 'drop-shadow(0 20px 35px rgba(0,0,0,0.85))',
      }}
      title="اسحبي الكرة بالماوس لتدويرها واضغطي على النقاط!"
    />
  );
}