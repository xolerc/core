// === index.html dan ajratildi (XOLERIC SEO) ===
{
            "imports": {
                "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
                "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
            }
        }

import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
        import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
        import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

        // --- 1. SOZLAMALAR ---
        const CITY_RADIUS = 150; 
        const CITY_LENGTH = 1000; // Gigant uzunlik
        const BUILDING_COUNT = 1500; // Gigant miqdor

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.002); // Uzoqni ko'rish uchun tuman kamaytirildi

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
        camera.position.set(0, 40, 200);

        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(renderer.domElement);

        // OrbitControls - Erkin harakatlanish uchun
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = 0.8;
        controls.zoomSpeed = 1.2;

        // --- 2. MATRIX KOD TEKSTURASI ---
        function createMatrixTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 512; canvas.height = 512;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 512, 512);
            
            const chars = '0123456789ABCDEFHIJKLMNOPQRSTUVWXYZｦｧｨｩｪｫｬｭｮｯ';
            ctx.font = 'bold 20px monospace';
            for(let i=0; i<30; i++) {
                for(let j=0; j<30; j++) {
                    ctx.fillStyle = `rgba(0, 255, 50, ${Math.random()})`;
                    ctx.fillText(chars[Math.floor(Math.random()*chars.length)], i*18, j*18);
                }
            }
            const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            return tex;
        }
        const matrixTex = createMatrixTexture();

        // --- 3. SHADER MATERIAL ---
        const buildingMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uTex: { value: matrixTex }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPos;
                void main() {
                    vUv = uv;
                    vPos = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform sampler2D uTex;
                varying vec2 vUv;
                varying vec3 vPos;
                void main() {
                    vec2 uv = vUv * vec2(1.0, 4.0);
                    float speed = 0.5 + fract(sin(vPos.x) * 43758.5453);
                    vec4 tex = texture2D(uTex, vec2(uv.x, uv.y + uTime * speed));
                    
                    vec3 color = tex.rgb * vec3(0.0, 1.0, 0.3) * 2.5;
                    // Bino qirralari
                    float edge = step(0.95, fract(vUv.x * 2.0)) + step(0.98, fract(vUv.y * 5.0));
                    color += edge * vec3(0.0, 0.5, 0.2);

                    if(color.g < 0.15) discard; // Faqat yozuvlarni qoldirish
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });

        // --- 4. GIGANT SHAHARNI QURISH ---
        const buildingsGroup = new THREE.Group();
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        boxGeo.translate(0, 0.5, 0);

        for(let i=0; i<BUILDING_COUNT; i++) {
            const mesh = new THREE.Mesh(boxGeo, buildingMaterial);
            
            // Silindrsimon joylashuv
            const angle = Math.random() * Math.PI * 2;
            const z = (Math.random() - 0.5) * CITY_LENGTH;
            const r = CITY_RADIUS;
            
            mesh.position.x = Math.cos(angle) * r;
            mesh.position.y = Math.sin(angle) * r;
            mesh.position.z = z;

            // Markazga qaratish
            mesh.lookAt(0, 0, z);
            mesh.rotateX(Math.PI / 2);

            // Masshtab
            const h = 5 + Math.random() * 50;
            const w = 2 + Math.random() * 5;
            mesh.scale.set(w, h, w);

            buildingsGroup.add(mesh);
        }
        scene.add(buildingsGroup);

        // --- 5. YER VA MUHIT ---
        const grid = new THREE.IcosahedronGeometry(CITY_RADIUS + 50, 4);
        const gridMat = new THREE.MeshBasicMaterial({ color: 0x002200, wireframe: true, transparent: true, opacity: 0.1 });
        const sphereGrid = new THREE.Mesh(grid, gridMat);
        scene.add(sphereGrid);

        // --- 6. POST-PROCESSING ---
        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0.2;
        bloomPass.strength = 1.5;
        bloomPass.radius = 0.5;

        const composer = new EffectComposer(renderer);
        composer.addPass(renderScene);
        composer.addPass(bloomPass);

        // --- 7. ANIMATSIYA ---
        const clock = new THREE.Clock();

        function animate() {
            requestAnimationFrame(animate);
            const delta = clock.getElapsedTime();
            
            buildingMaterial.uniforms.uTime.value = delta;
            
            // Shaharni sekin aylantirib turish (atmosfera uchun)
            buildingsGroup.rotation.z += 0.0005;

            controls.update();
            composer.render();
        }

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        });

        window.onload = () => {
            document.getElementById('loading').style.display = 'none';
            animate();
        };