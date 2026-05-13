import { lazy, Suspense } from "react";

import type { ChartDatum, TrendDatum } from "./DashboardCharts";

type MoneyBarChartProps = {
	className?: string;
	data: ChartDatum[];
	height?: number;
	valueFormatter?: (value: number) => string;
};

type DonutChartProps = {
	className?: string;
	data: ChartDatum[];
	height?: number;
};

type RateAreaChartProps = {
	className?: string;
	data: TrendDatum[];
	height?: number;
};

const LazyMoneyBarChart = lazy(() =>
	import("./DashboardCharts").then((module) => ({
		default: module.MoneyBarChart,
	})),
);

const LazyDonutChart = lazy(() =>
	import("./DashboardCharts").then((module) => ({
		default: module.DonutChart,
	})),
);

const LazyRateAreaChart = lazy(() =>
	import("./DashboardCharts").then((module) => ({
		default: module.RateAreaChart,
	})),
);

export function MoneyBarChart(props: MoneyBarChartProps) {
	return (
		<Suspense fallback={<ChartFallback height={props.height} />}>
			<LazyMoneyBarChart {...props} />
		</Suspense>
	);
}

export function DonutChart(props: DonutChartProps) {
	return (
		<Suspense fallback={<ChartFallback height={props.height} />}>
			<LazyDonutChart {...props} />
		</Suspense>
	);
}

export function RateAreaChart(props: RateAreaChartProps) {
	return (
		<Suspense fallback={<ChartFallback height={props.height} />}>
			<LazyRateAreaChart {...props} />
		</Suspense>
	);
}

function ChartFallback({ height = 240 }: { height?: number }) {
	return (
		<div
			className="w-full animate-pulse rounded-md bg-muted"
			style={{ height }}
			aria-hidden="true"
		/>
	);
}
