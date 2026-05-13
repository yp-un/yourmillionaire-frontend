"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type MotionWrapperProps = {
	children: ReactNode;
	className?: string;
	delay?: number;
};

export function HeroMotion({ children, className }: MotionWrapperProps) {
	const reducedMotion = useReducedMotion();

	return (
		<motion.div
			className={className}
			initial={reducedMotion ? false : { opacity: 0, y: 18 }}
			animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
			transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
		>
			{children}
		</motion.div>
	);
}

export function Reveal({
	children,
	className,
	delay = 0,
}: MotionWrapperProps) {
	const reducedMotion = useReducedMotion();

	return (
		<motion.div
			className={className}
			initial={reducedMotion ? false : { opacity: 0, y: 28 }}
			whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.2 }}
			transition={{
				duration: 0.65,
				delay,
				ease: [0.22, 1, 0.36, 1],
			}}
		>
			{children}
		</motion.div>
	);
}

export function StaggerGroup({
	children,
	className,
}: MotionWrapperProps) {
	const reducedMotion = useReducedMotion();

	return (
		<motion.div
			className={className}
			initial={reducedMotion ? false : "hidden"}
			whileInView={reducedMotion ? undefined : "visible"}
			viewport={{ once: true, amount: 0.18 }}
			variants={{
				hidden: {},
				visible: {
					transition: {
						staggerChildren: 0.1,
						delayChildren: 0.06,
					},
				},
			}}
		>
			{children}
		</motion.div>
	);
}

export function StaggerItem({
	children,
	className,
}: MotionWrapperProps) {
	const reducedMotion = useReducedMotion();

	return (
		<motion.div
			className={className}
			variants={
				reducedMotion
					? undefined
					: {
							hidden: { opacity: 0, y: 20, scale: 0.985 },
							visible: {
								opacity: 1,
								y: 0,
								scale: 1,
								transition: {
									duration: 0.55,
									ease: [0.22, 1, 0.36, 1],
								},
							},
						}
			}
			whileHover={reducedMotion ? undefined : { y: -2 }}
			transition={{ duration: 0.2 }}
		>
			{children}
		</motion.div>
	);
}
