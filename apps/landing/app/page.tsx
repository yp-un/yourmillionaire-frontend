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
	CalendarClock,
	CheckCircle2,
	FileText,
	Landmark,
	LockKeyhole,
	ReceiptText,
	ShieldCheck,
	WalletCards,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
	"법인 통장처럼 관리할 은행 계좌 연결",
	"연결된 계좌 중 수집 대상만 선택 등록",
	"수집된 거래를 복식부기 분개 형태로 조회",
	"입금/출금 흐름을 조회 범위 기준으로 요약",
	"확신도가 낮은 분개를 먼저 확인",
	"회계 용어보다 거래 내용과 금액을 중심으로 표시",
];

const notes = [
	"계좌 등록 직후에는 아직 표시할 분개가 없을 수 있습니다.",
	"거래 수집과 분류는 백엔드 파이프라인이 실행된 뒤 반영됩니다.",
	"지금 화면은 계좌 연결과 분개 확인에 집중합니다.",
];

const anxieties = [
	"국세청 문자나 가산세가 무섭습니다.",
	"이 지출이 비용 처리되는지 매번 헷갈립니다.",
	"재무제표보다 통장 잔고가 먼저 눈에 들어옵니다.",
];

export default function Home() {
	return (
		<main className="min-h-screen bg-white">
			<section className="relative isolate overflow-hidden border-b">
				<Image
					src="/hero-dashboard.png"
					alt="YourMillionaire dashboard preview"
					fill
					priority
					sizes="100vw"
					className="absolute inset-0 -z-20 object-cover object-center opacity-35"
				/>
				<div className="absolute inset-0 -z-10 bg-white/70" />

				<header className="container flex h-16 items-center justify-between">
					<Link href="/" className="flex items-center gap-2 font-semibold">
						<span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
							<Landmark className="size-4" aria-hidden="true" />
						</span>
						<span>YourMillionaire</span>
					</Link>
					<nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
						<Link href="#persona">대상 사용자</Link>
						<Link href="#workflow">사용 흐름</Link>
						<Link href="#security">보안</Link>
					</nav>
					<Button asChild size="sm">
						<Link href={DASHBOARD_URL}>
							대시보드
							<ArrowRight className="size-4" aria-hidden="true" />
						</Link>
					</Button>
				</header>

				<div className="container flex min-h-[76svh] flex-col justify-center pb-14 pt-12">
					<div className="max-w-2xl">
						<Badge variant="secondary" className="mb-5">
							청년창업자를 위한 회계 정리 베타
						</Badge>
						<h1 className="text-balance text-5xl font-semibold tracking-normal text-slate-950 sm:text-6xl">
							네가 결제만 하면, 정리는 끝나 있어야 하니까
						</h1>
						<p className="mt-5 max-w-xl text-balance text-lg leading-8 text-slate-700">
							YourMillionaire는 회계 소프트웨어를 처음 보는 창업자가 은행 계좌를
							연결하고, 수집된 거래가 분개로 정리되는 과정을 확인하는
							대시보드입니다.
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
					</div>
				</div>
			</section>

			<section
				id="persona"
				className="container grid gap-8 py-16 lg:grid-cols-[0.9fr_1.1fr]"
			>
				<div>
					<Badge variant="outline">Persona</Badge>
					<h2 className="mt-4 text-3xl font-semibold tracking-normal">
						회계 SW를 한 번도 써본 적 없는 공동창업자
					</h2>
					<p className="mt-3 text-slate-600">
						민지는 Figma, Notion, Slack은 익숙하지만 회계 화면은 낯섭니다. 법인
						통장과 법인카드는 있고, 매달 클라우드 비용과 툴 구독료는 나가지만
						재무제표는 읽을 줄 모릅니다.
					</p>
				</div>
				<div className="grid gap-3">
					{anxieties.map((item) => (
						<Card key={item}>
							<CardContent className="flex items-start gap-3 p-4 text-sm leading-6 text-slate-700">
								<FileText
									className="mt-0.5 size-4 shrink-0 text-primary"
									aria-hidden="true"
								/>
								{item}
							</CardContent>
						</Card>
					))}
				</div>
			</section>

			<section id="workflow" className="container py-16">
				<div className="max-w-2xl">
					<Badge variant="outline">Dashboard Flow</Badge>
					<h2 className="mt-4 text-3xl font-semibold tracking-normal">
						회계 용어보다 먼저 보여야 하는 것
					</h2>
					<p className="mt-3 text-slate-600">
						현재 대시보드는 계좌를 연결하고, 수집된 거래가 어떻게 분개로
						정리됐는지 확인하는 흐름에 집중합니다.
					</p>
				</div>

				<div className="mt-8 grid gap-4 md:grid-cols-3">
					{workflow.map((item) => {
						const Icon = item.icon;
						return (
							<Card key={item.title}>
								<CardHeader>
									<div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
										<Icon className="size-5" aria-hidden="true" />
									</div>
									<CardTitle>{item.title}</CardTitle>
								</CardHeader>
								<CardContent className="text-sm leading-6 text-slate-600">
									{item.body}
								</CardContent>
							</Card>
						);
					})}
				</div>
			</section>

			<section id="features" className="border-y bg-slate-50">
				<div className="container grid gap-8 py-16 lg:grid-cols-[1fr_0.9fr]">
					<div>
						<Badge variant="secondary">Available Now</Badge>
						<h2 className="mt-4 text-3xl font-semibold tracking-normal">
							민지가 실제로 누르게 될 기능
						</h2>
						<p className="mt-3 max-w-2xl text-slate-600">
							복잡한 회계 메뉴를 늘어놓지 않고, 지금 필요한 두 가지 작업에
							집중합니다. 계좌를 등록하고, 정리된 분개를 확인합니다.
						</p>
					</div>
					<div className="grid gap-2">
						{currentFeatures.map((item) => (
							<div
								key={item}
								className="flex items-center gap-3 rounded-lg border bg-white p-3 text-sm"
							>
								<CheckCircle2
									className="size-4 text-primary"
									aria-hidden="true"
								/>
								{item}
							</div>
						))}
					</div>
				</div>
			</section>

			<section
				id="security"
				className="container grid gap-6 py-16 md:grid-cols-2"
			>
				<Card>
					<CardHeader>
						<LockKeyhole
							className="mb-3 size-6 text-primary"
							aria-hidden="true"
						/>
						<CardTitle>은행 인증은 연결에만 사용</CardTitle>
					</CardHeader>
					<CardContent className="text-sm leading-6 text-slate-600">
						은행 비밀번호는 CODEF 연결 생성에만 사용되며, 프론트엔드 화면에는
						연결 결과로 받은 계좌 목록만 표시합니다.
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CalendarClock
							className="mb-3 size-6 text-primary"
							aria-hidden="true"
						/>
						<CardTitle>정리는 파이프라인 이후 표시</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm leading-6 text-slate-600">
						{notes.map((note) => (
							<p key={note}>{note}</p>
						))}
					</CardContent>
				</Card>
			</section>

			<Separator />
			<footer className="container flex flex-col gap-3 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
				<span>© 2026 YourMillionaire</span>
				<span className="flex items-center gap-2">
					<BadgeCheck className="size-4" aria-hidden="true" />
					Connect accounts, review journals
				</span>
			</footer>
		</main>
	);
}
