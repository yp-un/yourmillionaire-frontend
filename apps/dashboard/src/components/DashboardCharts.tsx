import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import { cn } from "@millionaire/ui";

import { formatCurrency } from "../lib/journal";

export type ChartDatum = {
	name: string;
	value: number;
	fill?: string;
};

export type TrendDatum = {
	name: string;
	value: number;
};

const chartColors = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

export function MoneyBarChart({
	className,
	data,
	height = 240,
	valueFormatter = formatCurrency,
}: {
	className?: string;
	data: ChartDatum[];
	height?: number;
	valueFormatter?: (value: number) => string;
}) {
	return (
		<div className={cn("w-full", className)} style={{ height }}>
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
					<CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
					<XAxis
						dataKey="name"
						axisLine={false}
						tickLine={false}
						tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
					/>
					<YAxis hide domain={[0, "dataMax"]} />
					<Tooltip
						content={<ValueTooltip formatter={valueFormatter} />}
						cursor={{ fill: "var(--muted)" }}
					/>
					<Bar dataKey="value" radius={[6, 6, 2, 2]}>
						{data.map((entry, index) => (
							<Cell
								key={`${entry.name}-${index}`}
								fill={entry.fill ?? chartColors[index % chartColors.length]}
							/>
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

export function DonutChart({
	className,
	data,
	height = 220,
}: {
	className?: string;
	data: ChartDatum[];
	height?: number;
}) {
	const visibleData = data.filter((item) => item.value > 0);

	return (
		<div className={cn("w-full", className)} style={{ height }}>
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Tooltip content={<CountTooltip />} />
					<Pie
						data={visibleData.length ? visibleData : [{ name: "없음", value: 1 }]}
						dataKey="value"
						nameKey="name"
						innerRadius="62%"
						outerRadius="82%"
						paddingAngle={2}
					>
						{(visibleData.length ? visibleData : [{ name: "없음", value: 1 }]).map(
							(entry, index) => (
								<Cell
									key={`${entry.name}-${index}`}
									fill={
										visibleData.length
											? entry.fill ?? chartColors[index % chartColors.length]
											: "var(--muted)"
									}
								/>
							),
						)}
					</Pie>
				</PieChart>
			</ResponsiveContainer>
		</div>
	);
}

export function RateAreaChart({
	className,
	data,
	height = 240,
}: {
	className?: string;
	data: TrendDatum[];
	height?: number;
}) {
	return (
		<div className={cn("w-full", className)} style={{ height }}>
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={data} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
					<CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
					<XAxis
						dataKey="name"
						axisLine={false}
						tickLine={false}
						tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
					/>
					<YAxis
						axisLine={false}
						domain={["dataMin", "dataMax"]}
						tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
						tickFormatter={(value) => Number(value).toLocaleString("ko-KR")}
						tickLine={false}
						width={56}
					/>
					<Tooltip content={<RateTooltip />} />
					<Area
						type="monotone"
						dataKey="value"
						stroke="var(--chart-1)"
						fill="var(--chart-1)"
						fillOpacity={0.16}
						strokeWidth={2}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}

type TooltipPayload = {
	color?: string;
	name?: string;
	payload?: { name?: string };
	value?: number | string;
};

type TooltipProps = {
	active?: boolean;
	label?: string;
	payload?: TooltipPayload[];
};

function ValueTooltip({
	active,
	formatter,
	label,
	payload,
}: TooltipProps & { formatter: (value: number) => string }) {
	if (!active || !payload?.length) {
		return null;
	}

	const item = payload[0];

	return (
		<div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
			<p className="font-medium text-popover-foreground">{label ?? item.payload?.name}</p>
			<p className="number-tabular text-muted-foreground">
				{formatter(Number(item.value ?? 0))}
			</p>
		</div>
	);
}

function CountTooltip({ active, payload }: TooltipProps) {
	if (!active || !payload?.length) {
		return null;
	}

	const item = payload[0];

	return (
		<div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
			<p className="font-medium text-popover-foreground">{item.name ?? item.payload?.name}</p>
			<p className="number-tabular text-muted-foreground">
				{Number(item.value ?? 0).toLocaleString("ko-KR")}건
			</p>
		</div>
	);
}

function RateTooltip({ active, label, payload }: TooltipProps) {
	if (!active || !payload?.length) {
		return null;
	}

	return (
		<div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
			<p className="font-medium text-popover-foreground">{label}</p>
			<p className="number-tabular text-muted-foreground">
				{Number(payload[0].value ?? 0).toLocaleString("ko-KR")}원
			</p>
		</div>
	);
}
