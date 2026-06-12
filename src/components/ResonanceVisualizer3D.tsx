import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface VisualizerProps {
  mode: number;
  resonanceLevel: number;
  waterFraction: number; // 0 (vacío) .. 1 (lleno de agua)
  active?: boolean; // true sólo mientras se captura con el micrófono
}

const TUBE_H = 10;
const TUBE_TOP = TUBE_H / 2; //  5  -> boca abierta (vientre)
const TUBE_BOTTOM = -TUBE_H / 2; // -5 -> fondo / agua (nodo)
const TUBE_R = 1.25;

/** Agua con cuerpo, superficie reflectante (con leve oleaje) y menisco contra el vidrio. */
function Water({ waterFraction }: { waterFraction: number }) {
  const body = useRef<THREE.Mesh>(null);
  const surface = useRef<THREE.Mesh>(null);
  const meniscus = useRef<THREE.Mesh>(null);
  const current = useRef(waterFraction);

  useFrame((state) => {
    current.current += (waterFraction - current.current) * 0.12;
    const h = Math.max(0.001, current.current * TUBE_H);
    const topY = TUBE_BOTTOM + h;

    if (body.current) {
      body.current.scale.y = h;
      body.current.position.y = TUBE_BOTTOM + h / 2;
    }
    const ripple = 1 + Math.sin(state.clock.getElapsedTime() * 1.6) * 0.005;
    if (surface.current) {
      surface.current.position.y = topY;
      surface.current.scale.set(ripple, ripple, 1);
    }
    if (meniscus.current) meniscus.current.position.y = topY;
  });

  return (
    <group>
      <mesh ref={body}>
        <cylinderGeometry args={[TUBE_R * 0.94, TUBE_R * 0.94, 1, 48]} />
        <meshPhysicalMaterial
          color="#1488d6"
          transparent
          opacity={0.88}
          roughness={0.25}
          metalness={0}
          clearcoat={0.4}
          clearcoatRoughness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={surface} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[TUBE_R * 0.94, 48]} />
        <meshPhysicalMaterial
          color="#2ba6ec"
          transparent
          opacity={0.7}
          roughness={0.3}
          metalness={0}
          clearcoat={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={meniscus} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[TUBE_R * 0.9, TUBE_R * 0.96, 48]} />
        <meshBasicMaterial color="#7fb8e8" transparent opacity={0.3} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * Onda estacionaria de la columna de aire (sólo entre la superficie del agua y
 * la boca). Nodo en el agua, vientre en la boca; el nº de nodos depende del modo.
 */
function ParticlesWave({ mode, resonanceLevel, waterFraction, active }: VisualizerProps) {
  const N = 260;
  const ref = useRef<THREE.InstancedMesh>(null);
  const waterCur = useRef(waterFraction);

  const particles = useMemo(() => {
    const t = [];
    for (let i = 0; i < N; i++) {
      t.push({
        u: Math.random(), // posición a lo largo de la columna de aire (0 agua → 1 boca)
        ang: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return t;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    waterCur.current += (waterFraction - waterCur.current) * 0.12;
    const waterY = TUBE_BOTTOM + waterCur.current * TUBE_H;
    const airLen = Math.max(0.001, TUBE_TOP - waterY);
    const t = state.clock.getElapsedTime() * 12;
    const level = resonanceLevel / 100;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    // Sólo hay onda mientras se captura con el micrófono. En reposo (active=false)
    // todo queda oculto y quieto. Al capturar, se ve una onda base que crece con
    // la resonancia (mínimo 18 % para que SIEMPRE se vea el patrón).
    const live = active ? Math.max(0.18, level) : 0;
    const fade = active ? 1 : 0;

    particles.forEach((p, i) => {
      const y = waterY + p.u * airLen;
      // Envolvente del modo: sin(m·π/2·u) → nodo en el agua, vientre en la boca.
      const envelope = Math.abs(Math.sin((mode * Math.PI) / 2 * p.u));
      const amp = 0.9 * live * envelope;
      const osc = Math.sin(t + p.phase);
      const r = amp * osc;

      dummy.position.set(Math.cos(p.ang) * r, y, Math.sin(p.ang) * r);
      const s = (0.45 + envelope * 0.9) * fade;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);

      const inten = envelope * live;
      color.setHSL(0.5 - inten * 0.06, 1, 0.45 + inten * 0.5);
      ref.current!.setColorAt(i, color);
    });

    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]}>
      <sphereGeometry args={[0.07, 14, 14]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/** Diapasón metálico (patas redondeadas) que aparece y vibra sólo con resonancia alta. */
function TuningFork({ resonanceLevel }: { resonanceLevel: number }) {
  const group = useRef<THREE.Group>(null);
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const appear = useRef(0);

  useFrame((state) => {
    const level = resonanceLevel / 100;
    const target = Math.max(0, Math.min(1, (level - 0.45) / 0.35));
    appear.current += (target - appear.current) * 0.12;

    if (group.current) {
      group.current.scale.setScalar(appear.current);
      group.current.visible = appear.current > 0.01;
    }

    const t = state.clock.getElapsedTime() * 45;
    const a = (0.03 + 0.13 * level) * appear.current;
    const d = Math.sin(t) * a;
    if (left.current) left.current.position.x = -0.32 - d;
    if (right.current) right.current.position.x = 0.32 + d;
  });

  const Metal = () => (
    <meshStandardMaterial color="#c9d2e3" metalness={1} roughness={0.18} envMapIntensity={1.2} />
  );

  return (
    <group ref={group} position={[0, TUBE_TOP + 1.8, 0]}>
      {/* patas (tines) redondeadas */}
      <mesh ref={left} position={[-0.32, 0.55, 0]}>
        <capsuleGeometry args={[0.085, 2, 8, 20]} />
        <Metal />
      </mesh>
      <mesh ref={right} position={[0.32, 0.55, 0]}>
        <capsuleGeometry args={[0.085, 2, 8, 20]} />
        <Metal />
      </mesh>
      {/* puente curvo en U */}
      <mesh position={[0, -0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.085, 0.5, 8, 20]} />
        <Metal />
      </mesh>
      {/* mango */}
      <mesh position={[0, -1.35, 0]}>
        <capsuleGeometry args={[0.085, 1.2, 8, 20]} />
        <Metal />
      </mesh>
      {/* pie */}
      <mesh position={[0, -2.1, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.12, 24]} />
        <Metal />
      </mesh>
    </group>
  );
}

/** Resplandor (pseudo-bloom) que se intensifica con la resonancia. */
function ResonanceGlow({ resonanceLevel, waterFraction }: { resonanceLevel: number; waterFraction: number }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const waterCur = useRef(waterFraction);

  useFrame(() => {
    waterCur.current += (waterFraction - waterCur.current) * 0.12;
    const waterY = TUBE_BOTTOM + waterCur.current * TUBE_H;
    const airMidY = (waterY + TUBE_TOP) / 2;
    const lvl = resonanceLevel / 100;

    if (lightRef.current) {
      lightRef.current.intensity = lvl * 7;
      lightRef.current.position.y = airMidY;
    }
    if (haloRef.current) {
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity = lvl * 0.3;
      haloRef.current.position.y = airMidY;
    }
  });

  return (
    <>
      <pointLight ref={lightRef} color="#00e5ff" distance={22} />
      <mesh ref={haloRef} position={[0, 0, -1.8]}>
        <planeGeometry args={[9, 13]} />
        <meshBasicMaterial
          color="#00e5ff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

/** Fondo degradado azulado para dar contraste al tubo (sin depender de internet). */
function GradientBackdrop() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#454c5a'); // arriba, grafito claro
    g.addColorStop(0.55, '#262b34');
    g.addColorStop(1, '#111419'); // abajo, grafito oscuro
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 256);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }, []);

  return (
    <mesh position={[0, 0, -16]} scale={[70, 45, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={texture} toneMapped={false} depthWrite={false} fog={false} />
    </mesh>
  );
}

function GlassTube() {
  return (
    <group>
      {/* pared de vidrio: transparente simple (sin transmisión) para que el
          agua de detrás se vea con claridad, pero con reflejos y clearcoat. */}
      <mesh>
        <cylinderGeometry args={[TUBE_R, TUBE_R, TUBE_H, 64, 1, true]} />
        <meshPhysicalMaterial
          transparent
          opacity={0.16}
          roughness={0.08}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.05}
          envMapIntensity={1.4}
          color="#dcefff"
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* labio redondeado de la boca */}
      <mesh position={[0, TUBE_TOP, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[TUBE_R, 0.06, 16, 64]} />
        <meshPhysicalMaterial color="#d7efff" roughness={0.08} metalness={0.1} clearcoat={1} envMapIntensity={1.4} />
      </mesh>
      {/* fondo cerrado */}
      <mesh position={[0, TUBE_BOTTOM, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[TUBE_R, 48]} />
        <meshStandardMaterial color="#0f141d" metalness={0.4} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* base / soporte de laboratorio */}
      <mesh position={[0, TUBE_BOTTOM - 0.2, 0]}>
        <cylinderGeometry args={[TUBE_R * 1.25, TUBE_R * 1.45, 0.5, 48]} />
        <meshStandardMaterial color="#252b36" metalness={0.7} roughness={0.35} envMapIntensity={1} />
      </mesh>
      <mesh position={[0, TUBE_BOTTOM + 0.05, 0]}>
        <torusGeometry args={[TUBE_R * 1.02, 0.05, 12, 48]} />
        <meshStandardMaterial color="#3a4250" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function ResonanceVisualizer3D({ mode, resonanceLevel, waterFraction, active }: VisualizerProps) {
  return (
    <div className="glass-panel visualizer-container" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="visualizer-header" style={{ pointerEvents: 'none' }}>
        <h2>Tubo Resonante 3D</h2>
        <p>Onda estacionaria en la columna de aire · Modo {mode}</p>
      </div>

      <Canvas camera={{ position: [0, 1.5, 15], fov: 42 }} dpr={[1, 2]} shadows>
        <color attach="background" args={['#20242c']} />
        <fog attach="fog" args={['#20242c', 24, 42]} />

        <GradientBackdrop />

        <ambientLight intensity={0.7} />
        <hemisphereLight args={['#bcd4ff', '#1a2238', 0.6]} />
        <directionalLight position={[6, 9, 6]} intensity={1.4} castShadow />
        <directionalLight position={[-7, 3, -4]} intensity={0.7} color="#5a82ff" />
        <spotLight position={[0, 12, 6]} angle={0.5} penumbra={1} intensity={0.8} color="#bfe3ff" />

        {/* Entorno generado en escena (reflejos realistas sin depender de internet) */}
        <Environment resolution={128}>
          <Lightformer intensity={2.2} position={[0, 4, -6]} scale={[10, 10, 1]} color="#8fb8ff" />
          <Lightformer intensity={1.4} position={[5, 1, 4]} scale={[4, 10, 1]} color="#ffffff" />
          <Lightformer intensity={1.1} position={[-5, 2, 3]} scale={[4, 8, 1]} color="#2b5bff" />
        </Environment>

        <GlassTube />
        <Water waterFraction={waterFraction} />
        <ParticlesWave mode={mode} resonanceLevel={resonanceLevel} waterFraction={waterFraction} active={active} />
        <TuningFork resonanceLevel={active ? resonanceLevel : 0} />
        <ResonanceGlow resonanceLevel={active ? resonanceLevel : 0} waterFraction={waterFraction} />

        <ContactShadows
          position={[0, TUBE_BOTTOM - 0.46, 0]}
          opacity={0.55}
          scale={14}
          blur={2.6}
          far={7}
          color="#000000"
        />

        <OrbitControls
          enablePan={false}
          minDistance={9}
          maxDistance={22}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.7}
        />
      </Canvas>
    </div>
  );
}
