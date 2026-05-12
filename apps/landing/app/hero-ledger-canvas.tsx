"use client";

import { Float, Line, RoundedBox, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const ledgerCards = [
	{ position: [-2.8, 1.15, -0.7], color: "#0f766e", rotation: -0.08 },
	{ position: [-1.25, 1.72, -1.05], color: "#2563eb", rotation: 0.04 },
	{ position: [0.65, 1.35, -0.3], color: "#d97706", rotation: -0.03 },
	{ position: [2.45, 0.82, -0.9], color: "#059669", rotation: 0.08 },
	{ position: [-3.05, -0.2, -1.15], color: "#2563eb", rotation: 0.06 },
	{ position: [-1.15, 0.05, 0.1], color: "#0f766e", rotation: -0.02 },
	{ position: [1.1, -0.22, -0.2], color: "#d97706", rotation: 0.03 },
	{ position: [2.85, -0.88, -0.8], color: "#0f766e", rotation: -0.07 },
	{ position: [-1.85, -1.45, -0.65], color: "#059669", rotation: 0.08 },
	{ position: [0.35, -1.55, -1.05], color: "#2563eb", rotation: -0.04 },
] as const;

type LedgerCardConfig = (typeof ledgerCards)[number];
type ColorMode = "light" | "dark";

function clampScrollProgress(value: number) {
	return THREE.MathUtils.clamp(value, 0, 1);
}

function getColorMode(): ColorMode {
	if (typeof document === "undefined" || typeof window === "undefined") {
		return "light";
	}

	const root = document.documentElement;

	if (root.classList.contains("dark")) {
		return "dark";
	}

	if (root.classList.contains("light")) {
		return "light";
	}

	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function useColorMode() {
	const [colorMode, setColorMode] = useState<ColorMode>("light");

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const root = document.documentElement;

		function updateColorMode() {
			setColorMode(getColorMode());
		}

		updateColorMode();

		const observer = new MutationObserver(updateColorMode);
		observer.observe(root, {
			attributeFilter: ["class"],
			attributes: true,
		});
		mediaQuery.addEventListener("change", updateColorMode);

		return () => {
			observer.disconnect();
			mediaQuery.removeEventListener("change", updateColorMode);
		};
	}, []);

	return colorMode;
}

function CentralHub({
	colorMode,
	onClick,
}: {
	colorMode: ColorMode;
	onClick: () => void;
}) {
	const ringRef = useRef<THREE.Group>(null);
	const isDark = colorMode === "dark";

	useFrame(({ clock }) => {
		if (!ringRef.current) {
			return;
		}

		ringRef.current.rotation.z = clock.elapsedTime * 0.28;
	});

	return (
		<group
			ref={ringRef}
			onClick={(event) => {
				event.stopPropagation();
				onClick();
			}}
		>
			<mesh>
				<circleGeometry args={[0.72, 72]} />
				<meshBasicMaterial
					color={isDark ? "#111827" : "#ffffff"}
					transparent
					opacity={isDark ? 0.82 : 0.74}
				/>
			</mesh>
			<mesh>
				<torusGeometry args={[0.76, 0.025, 16, 96]} />
				<meshBasicMaterial color="#0f766e" transparent opacity={0.72} />
			</mesh>
			<mesh rotation={[0, 0, Math.PI / 3]}>
				<torusGeometry args={[0.42, 0.018, 16, 96]} />
				<meshBasicMaterial color="#2563eb" transparent opacity={0.62} />
			</mesh>
			<mesh>
				<sphereGeometry args={[0.14, 32, 24]} />
				<meshStandardMaterial
					color={isDark ? "#f8fafc" : "#0f172a"}
					roughness={0.38}
					metalness={0.18}
				/>
			</mesh>
		</group>
	);
}

function Flow({
	active,
	card,
	colorMode,
	index,
	scrollProgress,
}: {
	active: boolean;
	card: LedgerCardConfig;
	colorMode: ColorMode;
	index: number;
	scrollProgress: number;
}) {
	const particleRef = useRef<THREE.Mesh>(null);
	const isDark = colorMode === "dark";
	const curve = useMemo(() => {
		const [x, y, z] = card.position;
		const direction = y > 0 ? 0.62 : -0.62;
		const spread = 1 + scrollProgress * 0.18;

		return new THREE.QuadraticBezierCurve3(
			new THREE.Vector3(0, 0, 0.12),
			new THREE.Vector3(x * 0.48 * spread, y * 0.38 + direction, 0.58),
			new THREE.Vector3(x * spread, y * (1 + scrollProgress * 0.08), z + 0.08),
		);
	}, [card.position, scrollProgress]);
	const points = useMemo(() => curve.getPoints(42), [curve]);

	useFrame(({ clock }) => {
		if (!particleRef.current) {
			return;
		}

		const progress =
			(clock.elapsedTime * (active ? 0.2 : 0.12) * (1 + scrollProgress * 1.2) +
				index * 0.11) %
			1;
		particleRef.current.position.copy(curve.getPoint(progress));
		const scale = active ? 1.35 + scrollProgress * 0.14 : 0.92;
		particleRef.current.scale.setScalar(scale);
	});

	return (
		<>
			<Line
				points={points}
				color={card.color}
				lineWidth={active ? 2.1 : 1}
				transparent
				opacity={active ? (isDark ? 0.74 : 0.52) : isDark ? 0.34 : 0.2}
			/>
			<mesh ref={particleRef}>
				<sphereGeometry args={[0.038, 16, 12]} />
				<meshBasicMaterial
					color={card.color}
					transparent
					opacity={active ? 0.95 : 0.55}
				/>
			</mesh>
		</>
	);
}

function LedgerCard({
	active,
	card,
	colorMode,
	index,
	onActivate,
	scrollProgress,
}: {
	active: boolean;
	card: LedgerCardConfig;
	colorMode: ColorMode;
	index: number;
	onActivate: () => void;
	scrollProgress: number;
}) {
	const ref = useRef<THREE.Group>(null);
	const [hovered, setHovered] = useState(false);
	const isDark = colorMode === "dark";
	const bars = useMemo(
		() => [
			{ x: -0.18, y: 0.19, width: 0.62, opacity: 0.45, color: card.color },
			{
				x: -0.28,
				y: 0.02,
				width: 0.42,
				opacity: 0.24,
				color: isDark ? "#cbd5e1" : "#475569",
			},
			{
				x: -0.2,
				y: -0.14,
				width: 0.58,
				opacity: 0.2,
				color: isDark ? "#94a3b8" : "#64748b",
			},
			{
				x: -0.36,
				y: -0.3,
				width: 0.26,
				opacity: 0.18,
				color: isDark ? "#94a3b8" : "#64748b",
			},
		],
		[card.color, isDark],
	);

	useFrame(({ clock }) => {
		if (!ref.current) {
			return;
		}

		const float = Math.sin(clock.elapsedTime * 0.9 + index * 0.72) * 0.045;
		const targetScale = active ? 1.18 : hovered ? 1.08 : 1;
		const nextScale = THREE.MathUtils.lerp(
			ref.current.scale.x,
			targetScale + scrollProgress * (active ? 0.08 : 0.03),
			0.1,
		);
		const spread = 1 + scrollProgress * 0.14;
		const lift = scrollProgress * 0.18;

		ref.current.position.x = card.position[0] * spread;
		ref.current.position.y = card.position[1] + float + lift;
		ref.current.position.z = card.position[2] - scrollProgress * 0.2;
		ref.current.rotation.z =
			card.rotation +
			Math.sin(clock.elapsedTime * 0.5 + index) * 0.012 +
			scrollProgress * 0.08;
		ref.current.scale.setScalar(nextScale);
	});

	return (
		<group
			ref={ref}
			position={card.position}
			rotation={[0, (index % 3 - 1) * 0.06, card.rotation]}
			onClick={(event) => {
				event.stopPropagation();
				onActivate();
			}}
			onPointerOver={(event) => {
				event.stopPropagation();
				setHovered(true);
				onActivate();
			}}
			onPointerOut={() => setHovered(false)}
		>
			<Float speed={1.6} rotationIntensity={0.08} floatIntensity={0.18}>
				<RoundedBox args={[1.18, 0.68, 0.055]} radius={0.055} smoothness={4}>
					<meshStandardMaterial
						color={isDark ? "#111827" : "#ffffff"}
						metalness={0.05}
						roughness={0.46}
						transparent
						opacity={active ? (isDark ? 0.98 : 0.92) : isDark ? 0.84 : 0.72}
					/>
				</RoundedBox>
				<RoundedBox
					args={[1.23, 0.73, 0.018]}
					radius={0.06}
					smoothness={4}
					position={[0, 0, -0.03]}
				>
					<meshBasicMaterial
						color={card.color}
						transparent
						opacity={active ? 0.32 : 0.18}
					/>
				</RoundedBox>
				{bars.map((bar) => (
					<mesh key={`${bar.y}-${bar.width}`} position={[bar.x, bar.y, 0.05]}>
						<boxGeometry args={[bar.width, 0.045, 0.018]} />
						<meshBasicMaterial
							color={bar.color}
							transparent
							opacity={active ? bar.opacity + 0.16 : bar.opacity}
						/>
					</mesh>
				))}
			</Float>
		</group>
	);
}

function LedgerScene() {
	const groupRef = useRef<THREE.Group>(null);
	const [activeIndex, setActiveIndex] = useState(5);
	const [scrollProgress, setScrollProgress] = useState(0);
	const colorMode = useColorMode();
	const { pointer, viewport } = useThree();
	const isCompact = viewport.width < 7;
	const isDark = colorMode === "dark";

	useEffect(() => {
		function updateScrollProgress() {
			const maxOffset = Math.max(window.innerHeight * 0.9, 1);
			setScrollProgress(clampScrollProgress(window.scrollY / maxOffset));
		}

		updateScrollProgress();
		window.addEventListener("scroll", updateScrollProgress, { passive: true });
		window.addEventListener("resize", updateScrollProgress);

		return () => {
			window.removeEventListener("scroll", updateScrollProgress);
			window.removeEventListener("resize", updateScrollProgress);
		};
	}, []);

	useEffect(() => {
		const nextIndex = Math.min(
			ledgerCards.length - 1,
			Math.floor(scrollProgress * ledgerCards.length),
		);
		setActiveIndex(nextIndex);
	}, [scrollProgress]);

	useFrame(() => {
		if (!groupRef.current) {
			return;
		}

		groupRef.current.rotation.x = THREE.MathUtils.lerp(
			groupRef.current.rotation.x,
			-0.08 - pointer.y * 0.08 + scrollProgress * 0.22,
			0.05,
		);
		groupRef.current.rotation.y = THREE.MathUtils.lerp(
			groupRef.current.rotation.y,
			pointer.x * 0.2 - scrollProgress * 0.18,
			0.05,
		);
		groupRef.current.position.y = THREE.MathUtils.lerp(
			groupRef.current.position.y,
			(isCompact ? -0.15 : 0) - scrollProgress * 0.4,
			0.05,
		);
		groupRef.current.position.z = THREE.MathUtils.lerp(
			groupRef.current.position.z,
			scrollProgress * 0.6,
			0.05,
		);
	});

	return (
		<group
			ref={groupRef}
			position={[isCompact ? 0.35 : 1.15, isCompact ? -0.15 : 0, 0]}
			scale={isCompact ? 0.7 + scrollProgress * 0.03 : 0.92 + scrollProgress * 0.06}
			onClick={() =>
				setActiveIndex((current) => (current + 1) % ledgerCards.length)
			}
		>
			<group position={[0, 0, -1.45]}>
				<gridHelper
					args={[7.5, 12, isDark ? "#334155" : "#94a3b8", isDark ? "#1e293b" : "#cbd5e1"]}
					rotation={[Math.PI / 2, 0, 0]}
				/>
			</group>
			<CentralHub
				colorMode={colorMode}
				onClick={() =>
					setActiveIndex((current) => (current + 1) % ledgerCards.length)
				}
			/>
			{ledgerCards.map((card, index) => (
				<Flow
					key={`flow-${card.position.join("-")}`}
					active={activeIndex === index}
					card={card}
					colorMode={colorMode}
					index={index}
					scrollProgress={scrollProgress}
				/>
			))}
			{ledgerCards.map((card, index) => (
				<LedgerCard
					key={`card-${card.position.join("-")}`}
					active={activeIndex === index}
					card={card}
					colorMode={colorMode}
					index={index}
					onActivate={() => setActiveIndex(index)}
					scrollProgress={scrollProgress}
				/>
			))}
			<Sparkles
				count={36 + Math.round(scrollProgress * 18)}
				scale={[5.6, 3.4, 1.4]}
				size={1.4 + scrollProgress * 0.6}
				speed={0.35 + scrollProgress * 0.45}
				color={isDark ? "#38bdf8" : "#0f766e"}
				opacity={(isDark ? 0.4 : 0.28) + scrollProgress * 0.12}
			/>
		</group>
	);
}

export function HeroLedgerCanvas() {
	const colorMode = useColorMode();
	const isDark = colorMode === "dark";

	return (
		<div className="absolute inset-0 z-[1] cursor-crosshair" aria-hidden="true">
			<Canvas
				camera={{ position: [0, 0, 7.8], fov: 36 }}
				dpr={[1, 1.75]}
				gl={{ alpha: true, antialias: true }}
			>
				<ambientLight intensity={isDark ? 1.1 : 1.4} />
				<directionalLight
					position={[4, 5, 7]}
					intensity={isDark ? 1.2 : 1.8}
					color={isDark ? "#cbd5e1" : "#ffffff"}
				/>
				<pointLight
					position={[-3, -2, 4]}
					intensity={isDark ? 1.15 : 0.8}
					color={isDark ? "#60a5fa" : "#38bdf8"}
				/>
				<LedgerScene />
			</Canvas>
		</div>
	);
}
