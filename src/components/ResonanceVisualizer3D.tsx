import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { theoreticalSpeedOfSound } from '../utils/physics';

interface VisualizerProps {
  mode: number;
  resonanceLevel: number;
  waterFraction: number;
  active?: boolean;
}

interface Visualizer3DProps extends VisualizerProps {
  targetFrequency: number;
  detectedFrequency: number;
  temperature: number;
  airColumnCm: number;
  tubeLengthCm: number;
}

type HoverRegion = 'air' | 'water' | 'fork';

interface HoverState {
  region: HoverRegion;
  // Posición normalizada dentro de la columna de aire (0 = agua, 1 = boca).
  u: number;
  x: number;
  y: number;
}

const TUBE_H = 10;
const TUBE_TOP = TUBE_H / 2;
const TUBE_BOTTOM = -TUBE_H / 2;
const TUBE_R = 1.25;

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

function ParticlesWave({ mode, resonanceLevel, waterFraction, active }: VisualizerProps) {
  const N = 260;
  const ref = useRef<THREE.InstancedMesh>(null);
  const waterCur = useRef(waterFraction);

  const particles = useMemo(() => {
    const t = [];
    for (let i = 0; i < N; i++) {
      t.push({
        u: Math.random(),
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
    const live = active ? Math.max(0.18, level) : 0;
    const fade = active ? 1 : 0;

    particles.forEach((p, i) => {
      const y = waterY + p.u * airLen;
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
      <mesh ref={left} position={[-0.32, 0.55, 0]}>
        <capsuleGeometry args={[0.085, 2, 8, 20]} />
        <Metal />
      </mesh>
      <mesh ref={right} position={[0.32, 0.55, 0]}>
        <capsuleGeometry args={[0.085, 2, 8, 20]} />
        <Metal />
      </mesh>
      <mesh position={[0, -0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.085, 0.5, 8, 20]} />
        <Metal />
      </mesh>
      <mesh position={[0, -1.35, 0]}>
        <capsuleGeometry args={[0.085, 1.2, 8, 20]} />
        <Metal />
      </mesh>
      <mesh position={[0, -2.1, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.12, 24]} />
        <Metal />
      </mesh>
    </group>
  );
}

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

function GradientBackdrop() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#454c5a');
    g.addColorStop(0.55, '#262b34');
    g.addColorStop(1, '#111419');
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
      <mesh position={[0, TUBE_TOP, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[TUBE_R, 0.06, 16, 64]} />
        <meshPhysicalMaterial color="#d7efff" roughness={0.08} metalness={0.1} clearcoat={1} envMapIntensity={1.4} />
      </mesh>
      <mesh position={[0, TUBE_BOTTOM, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[TUBE_R, 48]} />
        <meshStandardMaterial color="#0f141d" metalness={0.4} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
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

function NodeMarkers({ mode, waterFraction, show }: { mode: number; waterFraction: number; show: boolean }) {
  const markers = useMemo(() => {
    const out: { u: number; type: 'node' | 'antinode' }[] = [];
    for (let k = 0; (2 * k) / mode <= 1.001; k++) {
      out.push({ u: Math.min(1, (2 * k) / mode), type: 'node' });
    }
    for (let k = 0; (2 * k + 1) / mode <= 1.001; k++) {
      out.push({ u: Math.min(1, (2 * k + 1) / mode), type: 'antinode' });
    }
    return out;
  }, [mode]);

  if (!show) return null;

  const waterY = TUBE_BOTTOM + waterFraction * TUBE_H;
  const airLen = Math.max(0.001, TUBE_TOP - waterY);

  return (
    <group>
      {markers.map((m, i) => (
        <mesh key={i} position={[0, waterY + m.u * airLen, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[TUBE_R * 1.12, 0.035, 10, 48]} />
          <meshBasicMaterial
            color={m.type === 'node' ? '#00e5ff' : '#00ff88'}
            transparent
            opacity={0.75}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Hotspots({
  waterFraction,
  forkVisible,
  onHover,
}: {
  waterFraction: number;
  forkVisible: boolean;
  onHover: (h: HoverState | null) => void;
}) {
  const waterY = TUBE_BOTTOM + waterFraction * TUBE_H;
  const airLen = Math.max(0.001, TUBE_TOP - waterY);
  const waterLen = Math.max(0.001, waterY - TUBE_BOTTOM);

  const handleMove = (region: HoverRegion) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const u = region === 'air' ? Math.max(0, Math.min(1, (e.point.y - waterY) / airLen)) : 0;
    const canvas = e.nativeEvent.target as HTMLElement;
    const x = Math.min(e.nativeEvent.offsetX + 16, Math.max(0, canvas.clientWidth - 240));
    const y = Math.min(e.nativeEvent.offsetY + 12, Math.max(0, canvas.clientHeight - 190));
    onHover({ region, u, x, y });
  };

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'crosshair';
  };

  const handleOut = () => {
    document.body.style.cursor = 'default';
    onHover(null);
  };

  const hidden = <meshBasicMaterial transparent opacity={0} depthWrite={false} />;

  return (
    <group>
      <mesh
        position={[0, waterY + airLen / 2, 0]}
        onPointerMove={handleMove('air')}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <cylinderGeometry args={[TUBE_R * 1.06, TUBE_R * 1.06, airLen, 24]} />
        {hidden}
      </mesh>
      <mesh
        position={[0, TUBE_BOTTOM + waterLen / 2, 0]}
        onPointerMove={handleMove('water')}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <cylinderGeometry args={[TUBE_R * 1.06, TUBE_R * 1.06, waterLen, 24]} />
        {hidden}
      </mesh>
      {forkVisible && (
        <mesh
          position={[0, TUBE_TOP + 1.6, 0]}
          onPointerMove={handleMove('fork')}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
        >
          <boxGeometry args={[1.6, 4.2, 1.6]} />
          {hidden}
        </mesh>
      )}
    </group>
  );
}

export function ResonanceVisualizer3D({
  mode,
  resonanceLevel,
  waterFraction,
  active,
  targetFrequency,
  detectedFrequency,
  temperature,
  airColumnCm,
  tubeLengthCm,
}: Visualizer3DProps) {
  const [hover, setHover] = useState<HoverState | null>(null);

  const speed = theoreticalSpeedOfSound(temperature);
  const lambdaCm = (speed / targetFrequency) * 100;
  const waterLevelCm = Math.max(0, tubeLengthCm - airColumnCm);
  const forkVisible = Boolean(active) && resonanceLevel > 50;

  let tooltip: { title: string; rows: [string, string][]; note?: string } | null = null;
  if (hover) {
    if (hover.region === 'air') {
      const envelope = Math.abs(Math.sin(((mode * Math.PI) / 2) * hover.u));
      const zone =
        envelope < 0.2 ? 'cerca de un nodo' : envelope > 0.8 ? 'cerca de un antinodo' : 'zona intermedia';
      tooltip = {
        title: 'Columna de aire',
        rows: [
          ['Altura sobre el agua', `${(hover.u * airColumnCm).toFixed(1)} cm`],
          ['Amplitud local', `${Math.round(envelope * 100)} % (${zone})`],
          ['Columna de aire', `${airColumnCm.toFixed(1)} cm`],
          [`λ a ${targetFrequency} Hz`, `${lambdaCm.toFixed(1)} cm`],
          [`v teórica (${temperature} °C)`, `${speed.toFixed(1)} m/s`],
          ...(active ? [['Resonancia ahora', `${Math.round(resonanceLevel)} %`] as [string, string]] : []),
        ],
        note: 'Anillos: cian = nodo · verde = antinodo',
      };
    } else if (hover.region === 'water') {
      tooltip = {
        title: 'Agua',
        rows: [
          ['Nivel de agua', `${waterLevelCm.toFixed(1)} cm (${Math.round(waterFraction * 100)} % del tubo)`],
          ['Columna de aire', `${airColumnCm.toFixed(1)} cm`],
          ['Largo del tubo', `${tubeLengthCm.toFixed(0)} cm`],
        ],
        note: 'La superficie del agua actúa como extremo cerrado: nodo de desplazamiento.',
      };
    } else {
      tooltip = {
        title: 'Diapasón',
        rows: [
          ['Frecuencia objetivo', `${targetFrequency} Hz`],
          ['Frecuencia detectada', detectedFrequency > 0 ? `${detectedFrequency.toFixed(1)} Hz` : '—'],
          [
            'Desviación',
            detectedFrequency > 0 ? `${(detectedFrequency - targetFrequency).toFixed(1)} Hz` : '—',
          ],
          ['Nivel de resonancia', `${Math.round(resonanceLevel)} %`],
        ],
        note: 'El diapasón excita la columna de aire a su frecuencia natural.',
      };
    }
  }

  return (
    <div className="glass-panel visualizer-container" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
      <div className="visualizer-header" style={{ pointerEvents: 'none' }}>
        <h2>Tubo Resonante 3D</h2>
        <p>Onda estacionaria en la columna de aire · Modo {mode}</p>
        <p style={{ fontSize: '0.75rem', opacity: 0.75 }}>Pasa el cursor por el tubo para ver los datos del experimento</p>
      </div>

      {hover && tooltip && (
        <div className="viz-tooltip" style={{ left: hover.x, top: hover.y }}>
          <div className="viz-tooltip-title">{tooltip.title}</div>
          {tooltip.rows.map(([label, value]) => (
            <div className="viz-tooltip-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
          {tooltip.note && <div className="viz-tooltip-note">{tooltip.note}</div>}
        </div>
      )}

      <Canvas camera={{ position: [0, 1.5, 15], fov: 42 }} dpr={[1, 2]} shadows>
        <color attach="background" args={['#20242c']} />
        <fog attach="fog" args={['#20242c', 24, 42]} />

        <GradientBackdrop />

        <ambientLight intensity={0.7} />
        <hemisphereLight args={['#bcd4ff', '#1a2238', 0.6]} />
        <directionalLight position={[6, 9, 6]} intensity={1.4} castShadow />
        <directionalLight position={[-7, 3, -4]} intensity={0.7} color="#5a82ff" />
        <spotLight position={[0, 12, 6]} angle={0.5} penumbra={1} intensity={0.8} color="#bfe3ff" />

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
        <NodeMarkers mode={mode} waterFraction={waterFraction} show={hover?.region === 'air'} />
        <Hotspots waterFraction={waterFraction} forkVisible={forkVisible} onHover={setHover} />

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
