import type { JournalEntry, JournalLine } from "../api/types";

const bankAccountCodes = new Set(["1001", "1002", "1003", "1010", "1020"]);

export const accountNames: Record<string, string> = {
  "1001": "현금",
  "1002": "보통예금",
  "1003": "정기예금",
  "1010": "외화예금",
  "1020": "단기금융상품",
  "1101": "매출채권",
  "1201": "미수금",
  "2101": "매입채무",
  "2201": "미지급금",
  "3101": "자본금",
  "4101": "매출",
  "4201": "용역수익",
  "5101": "상품매출원가",
  "5201": "급여",
  "5301": "임차료",
  "5401": "통신비",
  "5402": "소모품비",
  "5403": "지급수수료",
  "5404": "복리후생비",
  "5405": "여비교통비",
  "5501": "광고선전비",
  "5601": "세금과공과"
};

export function formatKrw(value: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

export function formatCurrency(value: number) {
  return `₩ ${formatKrw(value)}`;
}

export function getAccountLabel(accountCode: string) {
  return `${accountCode} ${accountNames[accountCode] ?? "미지정 계정"}`;
}

export function getEntryAmount(entry: JournalEntry) {
  return Math.max(sumBy(entry.lines, "debit"), sumBy(entry.lines, "credit"));
}

export function getEntryMovement(entry: JournalEntry): "expense" | "income" | "neutral" {
  const bankDebit = entry.lines
    .filter((line) => bankAccountCodes.has(line.accountCode))
    .reduce((total, line) => total + line.debit, 0);
  const bankCredit = entry.lines
    .filter((line) => bankAccountCodes.has(line.accountCode))
    .reduce((total, line) => total + line.credit, 0);

  if (bankDebit > bankCredit) {
    return "income";
  }

  if (bankCredit > bankDebit) {
    return "expense";
  }

  return "neutral";
}

export function summarizeEntries(entries: JournalEntry[]) {
  return entries.reduce(
    (summary, entry) => {
      const amount = getEntryAmount(entry);
      const movement = getEntryMovement(entry);

      if (movement === "income") {
        summary.moneyIn += amount;
      }

      if (movement === "expense") {
        summary.moneyOut += amount;
      }

      if ((entry.aiConfidence ?? 1) < 0.5) {
        summary.lowConfidence += 1;
      }

      return summary;
    },
    { lowConfidence: 0, moneyIn: 0, moneyOut: 0 }
  );
}

export function formatJournalLines(entry: JournalEntry) {
  const debitLines = entry.lines.filter((line) => line.debit > 0).map((line) => formatLine(line, "debit"));
  const creditLines = entry.lines.filter((line) => line.credit > 0).map((line) => formatLine(line, "credit"));

  if (debitLines.length === 0 || creditLines.length === 0) {
    return entry.lines.map((line) => getAccountLabel(line.accountCode)).join(" / ");
  }

  return `${debitLines.join(" + ")} → ${creditLines.join(" + ")}`;
}

export function getCurrentMonthRange() {
  const now = getSeoulDateParts(new Date());
  const lastDay = new Date(now.year, now.month, 0).getDate();

  return {
    from: `${now.year}-${pad2(now.month)}-01`,
    to: `${now.year}-${pad2(now.month)}-${pad2(lastDay)}`
  };
}

export function getRelativeMonthRange(monthOffset: number) {
  const now = getSeoulDateParts(new Date());
  const targetDate = new Date(now.year, now.month - 1 + monthOffset, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();

  return {
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(lastDay)}`
  };
}

function formatLine(line: JournalLine, side: "credit" | "debit") {
  return `${getAccountLabel(line.accountCode)} ${formatKrw(line[side])}원`;
}

function sumBy(lines: JournalLine[], key: "credit" | "debit") {
  return lines.reduce((total, line) => total + line[key], 0);
}

function getSeoulDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);

  return {
    day: value("day"),
    month: value("month"),
    year: value("year")
  };
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}
