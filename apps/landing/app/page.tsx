import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Separator,
} from "@millionaire/ui";
import {
	ArrowRight,
	BadgeCheck,
	CheckCircle2,
	ReceiptText,
	ShieldCheck,
	WalletCards,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HeroLedgerCanvas } from "./hero-ledger-canvas";
import {
	HeroMotion,
	Reveal,
	StaggerGroup,
	StaggerItem,
} from "./landing-motion";

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL!;

const workflow = [
	{
		icon: ShieldCheck,
		title: "처음 보는 회계 화면을 줄입니다",
		body: "Google로 로그인하면 기본 작업 공간이 준비되고, 사용자는 계좌 연결부터 시작합니다.",
	},
	{
		icon: WalletCards,
		title: "통장 데이터를 먼저 가져옵니다",
		body: "은행 인증으로 보유 계좌를 찾고, 실제로 관리할 계좌만 수집 대상으로 등록합니다.",
	},
	{
		icon: ReceiptText,
		title: "정리된 분개만 확인합니다",
		body: "수집 파이프라인이 거래를 분류하면 날짜 범위별 분개, 금액, 확신도를 확인합니다.",
	},
];

const currentFeatures = [
	"사업용으로 관리할 은행 계좌 연결",
	"연결된 계좌 중 필요한 계좌만 수집 대상으로 선택",
	"수집된 거래를 복식부기 분개 형태로 조회",
	"입금/출금 흐름을 조회 범위 기준으로 요약",
	"확신도가 낮은 분개를 먼저 확인",
	"회계 용어보다 거래 내용과 금액을 중심으로 표시",
];

const anxieties = [
	"회계 프로그램은 열어봤는데 어디부터 봐야 하는지 모르겠어요.",
	"세무사님이 보내준 자료를 봐도 결국 통장 잔고부터 확인하게 됩니다.",
	"클라우드 비용이나 구독료는 계속 나가는데 회계 처리는 제대로 되는 건지 불안해요.",
];

export default function Home() {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<section className="relative isolate overflow-hidden border-b border-border">
				<Image
					src="/hero-dashboard.png"
					alt="YourMillionaire dashboard preview"
					fill
					priority
					sizes="100vw"
					className="absolute inset-0 z-0 object-cover object-center opacity-25 dark:opacity-20"
				/>
				<HeroLedgerCanvas />
				<div
					className="pointer-events-none absolute inset-0 z-[2]"
					style={{
						background:
							"linear-gradient(90deg, color-mix(in oklab, var(--background) 97%, transparent) 0%, color-mix(in oklab, var(--background) 88%, transparent) 42%, color-mix(in oklab, var(--background) 46%, transparent) 75%, color-mix(in oklab, var(--background) 84%, transparent) 100%)",
					}}
				/>
				<div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-28 bg-gradient-to-t from-background to-transparent" />

				<header className="container relative z-20 flex h-16 items-center justify-between">
					<Link href="/" className="flex items-center gap-2 font-semibold">
						<Image
							width={30}
							height={30}
							src="https://cdn.yourmillionaire.kro.kr/logo.png"
							alt="로고"
						/>
						<span>YourMillionaire</span>
					</Link>
					<nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
						<Link href="#persona">대상 사용자</Link>
						<Link href="#workflow">사용 흐름</Link>
						<Link href="#features">기능</Link>
					</nav>
					<Button asChild size="sm">
						<Link href={DASHBOARD_URL}>
							대시보드
							<ArrowRight className="size-4" aria-hidden="true" />
						</Link>
					</Button>
				</header>

				<div className="container relative z-10 flex min-h-[76svh] flex-col justify-center pb-14 pt-12">
					<HeroMotion className="max-w-2xl">
						<Badge variant="secondary" className="mb-5">
							청년창업자를 위한 회계 정리
						</Badge>
						<h1 className="text-balance text-5xl font-semibold tracking-normal text-foreground sm:text-6xl">
							결제만 하면, 회계 정리는 이미 끝나 있어야 하니까
						</h1>
						<p className="mt-5 max-w-xl text-balance text-lg leading-8 text-muted-foreground">
							YourMillionaire는 회계 소프트웨어가 낯선 창업자가 은행 계좌를
							연결하고, 자동으로 수집된 거래가 분개로 정리되는 과정을 확인할 수
							있는 대시보드입니다.
						</p>
						<div className="mt-8 flex flex-col gap-3 sm:flex-row">
							<Button asChild size="lg">
								<Link href={DASHBOARD_URL}>
									대시보드 열기
									<ArrowRight className="size-4" aria-hidden="true" />
								</Link>
							</Button>
							<Button asChild variant="outline" size="lg">
								<Link href="#persona">왜 필요한지 보기</Link>
							</Button>
						</div>
					</HeroMotion>
				</div>
			</section>

			<Reveal>
				<section
					id="persona"
					className="container grid gap-8 py-16 lg:grid-cols-[0.9fr_1.1fr]"
				>
					<div>
						<Badge variant="outline">Persona</Badge>
						<h2 className="mt-4 text-3xl font-semibold tracking-normal">
							회계 소프트웨어가 낯선 창업자
						</h2>
						<p className="mt-3 text-muted-foreground">
							협업 툴에는 익숙하지만 회계 소프트웨어는 아직 낯선 창업자입니다.
							법인 계좌와 법인카드는 이미 사용 중이고, 매달 클라우드 비용과
							구독료도 빠져나가지만 회계 화면과 재무 용어는 여전히 어렵게
							느껴집니다.
						</p>
					</div>
					<StaggerGroup className="space-y-3">
						{anxieties.map((item, index) => (
							<StaggerItem key={item}>
								<div className="rounded-xl border border-border/70 bg-muted/30 p-4">
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<div className="size-1.5 rounded-full bg-primary" />
										초기 창업자 인터뷰
									</div>

									<p className="mt-3 text-sm leading-7 text-foreground">
										“{item}”
									</p>
								</div>
							</StaggerItem>
						))}
					</StaggerGroup>
				</section>
			</Reveal>

			<Reveal>
				<section id="workflow" className="container py-16">
					<div className="max-w-2xl">
						<Badge variant="outline">Dashboard Flow</Badge>
						<h2 className="mt-4 text-3xl font-semibold tracking-normal">
							회계 용어보다 먼저 보여야 할 정보
						</h2>
						<p className="mt-3 text-muted-foreground">
							현재 대시보드는 계좌를 연결하고, 자동으로 수집된 거래가 어떻게
							분개로 정리됐는지 확인하는 흐름에 집중합니다.
						</p>
					</div>

					<StaggerGroup className="mt-8 grid gap-4 md:grid-cols-3">
						{workflow.map((item) => {
							const Icon = item.icon;
							return (
								<StaggerItem key={item.title}>
									<Card>
										<CardHeader>
											<div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
												<Icon className="size-5" aria-hidden="true" />
											</div>
											<CardTitle>{item.title}</CardTitle>
										</CardHeader>
										<CardContent className="text-sm leading-6 text-muted-foreground">
											{item.body}
										</CardContent>
									</Card>
								</StaggerItem>
							);
						})}
					</StaggerGroup>
				</section>
			</Reveal>

			<Reveal>
				<section id="features" className="container">
					<div className="container grid gap-8 py-16 lg:grid-cols-[1fr_0.9fr]">
						<div>
							<Badge variant="outline">Available Now</Badge>
							<h2 className="mt-4 text-3xl font-semibold tracking-normal">
								창업자가 바로 쓰게 될 기능
							</h2>
							<p className="mt-3 max-w-2xl text-muted-foreground">
								복잡한 회계 메뉴를 늘어놓지 않고, 지금 필요한 두 가지 작업에
								집중합니다. 계좌를 등록하고, 정리된 분개를 확인합니다.
							</p>
						</div>
						<StaggerGroup className="grid gap-2">
							{currentFeatures.map((item) => (
								<StaggerItem key={item}>
									<div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-sm text-card-foreground">
										<CheckCircle2
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										{item}
									</div>
								</StaggerItem>
							))}
						</StaggerGroup>
					</div>
				</section>
			</Reveal>

			<Separator />
			<footer className="container flex flex-col gap-3 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
				<span>© 2026 YourMillionaire</span>
				<span className="flex items-center gap-2">
					<BadgeCheck className="size-4" aria-hidden="true" />
					계좌를 연결하고, 정리된 분개를 확인하세요
				</span>
			</footer>
		</main>
	);
}
