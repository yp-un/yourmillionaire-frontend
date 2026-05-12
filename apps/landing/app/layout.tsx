import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
	metadataBase: new URL("https://yourmillionaire.kro.kr"),
	title: {
		default: "YourMillionaire | 청년창업자를 위한 계좌 연결과 분개 조회",
		template: "%s | YourMillionaire",
	},
	description:
		"회계 SW가 낯선 청년창업자가 은행 계좌를 연결하고 정리된 분개를 확인하는 대시보드입니다.",
	openGraph: {
		title: "YourMillionaire",
		description:
			"결제 이후의 회계 정리를 계좌 연결과 분개 조회로 시작하는 Bank Journal",
		url: "https://yourmillionaire.kro.kr",
		siteName: "YourMillionaire",
		images: [
			{
				url: "https://cdn.yourmillionaire.kro.kr/logo.png",
				width: 300,
				height: 300,
				alt: "YourMillionaire dashboard preview",
			},
		],
		locale: "ko_KR",
		type: "website",
	},
	icons: {
		icon: {
			url: "https://cdn.yourmillionaire.kro.kr/logo.png",
			type: "image/png",
		},
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ko">
			<body>{children}</body>
		</html>
	);
}
