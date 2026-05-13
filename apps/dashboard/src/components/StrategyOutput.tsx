import { type ReactNode, type RefObject, useEffect, useState } from "react";

export function useStreamingStrategyText(
	outputText: string,
	strategyRunning: boolean,
) {
	const [displayedText, setDisplayedText] = useState("");
	const [autoScroll, setAutoScroll] = useState(true);

	useEffect(() => {
		if (!outputText) {
			setDisplayedText("");
			setAutoScroll(true);
			return;
		}

		setDisplayedText((current) => {
			if (outputText.startsWith(current)) {
				return current;
			}

			return "";
		});

		const timer = window.setInterval(() => {
			setDisplayedText((current) => {
				if (!outputText.startsWith(current)) {
					return outputText.slice(0, 3);
				}

				if (current.length >= outputText.length) {
					window.clearInterval(timer);
					return current;
				}

				const remaining = outputText.length - current.length;
				const chunkSize = strategyRunning
					? remaining > 120
						? 6
						: remaining > 40
							? 4
							: 2
					: remaining > 240
						? 24
						: remaining > 80
							? 16
							: 8;
				return outputText.slice(0, current.length + chunkSize);
			});
		}, 50);

		return () => window.clearInterval(timer);
	}, [outputText, strategyRunning]);

	useEffect(() => {
		if (!autoScroll || !displayedText) {
			return;
		}

		window.scrollTo({
			behavior: "smooth",
			top: document.documentElement.scrollHeight,
		});
	}, [displayedText, autoScroll]);

	useEffect(() => {
		if (!strategyRunning) {
			return;
		}

		const handleWheel = (event: WheelEvent) => {
			if (event.deltaY < 0) {
				setAutoScroll(false);
			}
		};
		const handleScroll = () => {
			if (isWindowScrolledToBottom()) {
				setAutoScroll(true);
			}
		};

		window.addEventListener("wheel", handleWheel, { passive: true });
		window.addEventListener("scroll", handleScroll, { passive: true });
		window.addEventListener("touchmove", handleScroll, { passive: true });

		return () => {
			window.removeEventListener("wheel", handleWheel);
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("touchmove", handleScroll);
		};
	}, [strategyRunning]);

	return {
		autoScroll,
		displayedText,
		setAutoScroll,
	};
}

export function StrategyMarkdownContent({
	bottomRef,
	content,
	pendingMessage,
	pending = false,
	onAutoScrollChange,
}: {
	bottomRef?: RefObject<HTMLDivElement | null>;
	content: string;
	pendingMessage?: string;
	pending?: boolean;
	onAutoScrollChange?: (enabled: boolean) => void;
}) {
	const lines = content.split(/\r?\n/);
	const blocks: ReactNode[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index]?.trim() ?? "";

		if (!line) {
			index += 1;
			continue;
		}

		const codeFence = /^```(\w+)?\s*$/.exec(line);
		if (codeFence) {
			const codeLines: string[] = [];
			index += 1;

			while (
				index < lines.length &&
				!/^```\s*$/.test(lines[index]?.trim() ?? "")
			) {
				codeLines.push(lines[index] ?? "");
				index += 1;
			}

			if (index < lines.length) {
				index += 1;
			}

			blocks.push(
				<pre
					key={`code-${index}`}
					className="overflow-x-auto rounded-md border bg-muted p-3 text-xs leading-6 text-foreground"
				>
					<code>{codeLines.join("\n")}</code>
				</pre>,
			);
			continue;
		}

		if (/^>\s?/.test(line)) {
			const quoteLines: string[] = [];

			while (index < lines.length && /^>\s?/.test(lines[index]?.trim() ?? "")) {
				quoteLines.push((lines[index] ?? "").trim().replace(/^>\s?/, ""));
				index += 1;
			}

			blocks.push(
				<blockquote
					key={`quote-${index}`}
					className="border-l-2 border-primary/50 pl-3 text-muted-foreground"
				>
					{quoteLines.map((quoteLine, quoteIndex) => (
						<p key={`quote-line-${quoteIndex}`} className="leading-7">
							{renderInlineMarkdown(quoteLine)}
						</p>
					))}
				</blockquote>,
			);
			continue;
		}

		if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
			blocks.push(<hr key={`rule-${index}`} className="my-4 border-border" />);
			index += 1;
			continue;
		}

		if (isMarkdownTableStart(lines, index)) {
			const tableRows: string[][] = [];
			const headers = parseMarkdownTableRow(lines[index] ?? "");
			index += 2;

			while (
				index < lines.length &&
				isMarkdownTableRow(lines[index]?.trim() ?? "")
			) {
				tableRows.push(parseMarkdownTableRow(lines[index] ?? ""));
				index += 1;
			}

			blocks.push(
				<div
					key={`table-${index}`}
					className="overflow-x-auto rounded-md border"
				>
					<table className="w-full min-w-[32rem] border-collapse text-sm">
						<thead className="bg-muted/70">
							<tr>
								{headers.map((header, headerIndex) => (
									<th
										key={`${header}-${headerIndex}`}
										className="border-b px-3 py-2 text-left font-semibold text-foreground"
									>
										{renderInlineMarkdown(header)}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{tableRows.map((row, rowIndex) => (
								<tr key={`row-${rowIndex}`} className="border-t">
									{headers.map((_, cellIndex) => (
										<td
											key={`cell-${rowIndex}-${cellIndex}`}
											className="px-3 py-2 align-top text-muted-foreground"
										>
											{renderInlineMarkdown(row[cellIndex] ?? "")}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>,
			);
			continue;
		}

		const heading = /^(#{1,3})\s+(.+)$/.exec(line);
		if (heading) {
			const level = heading[1].length;
			const className =
				level === 1 ? "text-lg" : level === 2 ? "text-base" : "text-sm";
			blocks.push(
				<h3
					key={`heading-${index}`}
					className={`mt-5 first:mt-0 font-semibold tracking-normal text-foreground ${className}`}
				>
					{renderInlineMarkdown(heading[2])}
				</h3>,
			);
			index += 1;
			continue;
		}

		if (/^\d+\.\s+/.test(line)) {
			const items: ReactNode[] = [];
			while (
				index < lines.length &&
				/^\d+\.\s+/.test(lines[index]?.trim() ?? "")
			) {
				const item = (lines[index] ?? "").trim().replace(/^\d+\.\s+/, "");
				items.push(
					<li key={`ordered-item-${index}`}>{renderInlineMarkdown(item)}</li>,
				);
				index += 1;
			}
			blocks.push(
				<ol key={`ordered-${index}`} className="ml-5 list-decimal space-y-1">
					{items}
				</ol>,
			);
			continue;
		}

		if (/^[-*]\s+/.test(line)) {
			const items: ReactNode[] = [];
			while (
				index < lines.length &&
				/^[-*]\s+/.test(lines[index]?.trim() ?? "")
			) {
				const item = (lines[index] ?? "").trim().replace(/^[-*]\s+/, "");
				items.push(
					<li key={`bullet-item-${index}`}>{renderInlineMarkdown(item)}</li>,
				);
				index += 1;
			}
			blocks.push(
				<ul key={`bullet-${index}`} className="ml-5 list-disc space-y-1">
					{items}
				</ul>,
			);
			continue;
		}

		const paragraph: string[] = [];
		while (index < lines.length) {
			const nextLine = lines[index]?.trim() ?? "";
			if (
				!nextLine ||
				/^(#{1,3})\s+/.test(nextLine) ||
				/^\d+\.\s+/.test(nextLine) ||
				/^[-*]\s+/.test(nextLine) ||
				/^```/.test(nextLine) ||
				/^>\s?/.test(nextLine) ||
				/^(-{3,}|\*{3,}|_{3,})$/.test(nextLine) ||
				isMarkdownTableStart(lines, index)
			) {
				break;
			}
			paragraph.push(nextLine);
			index += 1;
		}

		blocks.push(
			<p key={`paragraph-${index}`} className="leading-7 text-foreground">
				{renderInlineMarkdown(paragraph.join(" "))}
			</p>,
		);
	}

	return (
		<div
			className="ym-panel min-h-64 space-y-3 p-4 text-sm"
			onWheel={(event) => {
				if (event.deltaY < 0) {
					onAutoScrollChange?.(false);
				}
			}}
			onTouchMove={() => onAutoScrollChange?.(false)}
		>
			{blocks}
			{pending ? <StreamingIndicator message={pendingMessage} /> : null}
			<div ref={bottomRef} aria-hidden="true" />
		</div>
	);
}

function StreamingIndicator({ message = "분석 중..." }: { message?: string }) {
	return (
		<div className="pt-1 text-sm" aria-live="polite">
			<span className="ym-shimmer-text font-medium">{message}</span>
		</div>
	);
}

function isWindowScrolledToBottom() {
	const scrollTop = window.scrollY;
	const viewportHeight = window.innerHeight;
	const pageHeight = document.documentElement.scrollHeight;

	return Math.ceil(scrollTop + viewportHeight) >= pageHeight;
}

function isMarkdownTableStart(lines: string[], index: number) {
	const header = lines[index]?.trim() ?? "";
	const divider = lines[index + 1]?.trim() ?? "";

	return (
		isMarkdownTableRow(header) &&
		/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(divider)
	);
}

function isMarkdownTableRow(line: string) {
	return line.includes("|") && !/^(-{3,}|\*{3,}|_{3,})$/.test(line);
}

function parseMarkdownTableRow(line: string) {
	return line
		.trim()
		.replace(/^\|/, "")
		.replace(/\|$/, "")
		.split("|")
		.map((cell) => cell.trim());
}

function renderInlineMarkdown(value: string) {
	const parts = value
		.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|\*[^*]+\*)/g)
		.filter(Boolean);

	return parts.map((part, index) => {
		const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
		if (link) {
			const [, label, href] = link;
			return (
				<a
					key={`${part}-${index}`}
					className="font-medium text-primary underline-offset-4 hover:underline"
					href={href}
					rel="noreferrer"
					target="_blank"
				>
					{label}
				</a>
			);
		}

		if (part.startsWith("**") && part.endsWith("**")) {
			return (
				<strong key={`${part}-${index}`} className="font-semibold">
					{part.slice(2, -2)}
				</strong>
			);
		}

		if (part.startsWith("~~") && part.endsWith("~~")) {
			return (
				<del key={`${part}-${index}`} className="text-muted-foreground">
					{part.slice(2, -2)}
				</del>
			);
		}

		if (part.startsWith("`") && part.endsWith("`")) {
			return (
				<code
					key={`${part}-${index}`}
					className="rounded bg-muted px-1 py-0.5 text-[0.85em] text-foreground"
				>
					{part.slice(1, -1)}
				</code>
			);
		}

		if (part.startsWith("*") && part.endsWith("*")) {
			return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
		}

		return part;
	});
}
