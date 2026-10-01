import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { expenseService } from "./expense.service";
import { Expense } from "../types";
import { currency, shortDate } from "../utils/formatters";

export type ReportFilters = {
  from?: string;
  to?: string;
  userId?: string;
  projectName?: string;
  category?: string;
  status?: string;
};

const cleanParams = (params: ReportFilters) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => Boolean(value))) as ReportFilters;

const filterExpenses = (expenses: Expense[], filters: ReportFilters) => {
  const params = cleanParams(filters);
  return expenses.filter((expense) => {
    if (params.from && expense.date < params.from) return false;
    if (params.to && expense.date > params.to) return false;
    if (params.userId) {
      const ownerId = typeof expense.userId === "object" ? expense.userId._id || expense.userId.id : expense.userId;
      if (ownerId !== params.userId) return false;
    }
    if (params.projectName && !expense.projectName.toLowerCase().includes(params.projectName.toLowerCase())) return false;
    if (params.category && expense.category !== params.category) return false;
    if (params.status && expense.status !== params.status) return false;
    return true;
  });
};

const summarize = (expenses: Expense[]) => {
  const byStatus = expenses.reduce<Record<string, { _id: string; count: number; total: number }>>((acc, expense) => {
    if (!acc[expense.status]) acc[expense.status] = { _id: expense.status, count: 0, total: 0 };
    acc[expense.status].count += 1;
    acc[expense.status].total += expense.amount;
    return acc;
  }, {});
  return {
    total: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    summary: Object.values(byStatus),
    items: expenses
  };
};

const csvEscape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const toCsv = (expenses: Expense[]) => [
  ["Date", "Project", "Client", "Category", "Amount", "Payment", "Status", "Description"].map(csvEscape).join(","),
  ...expenses.map((expense) =>
    [
      expense.date,
      expense.projectName,
      expense.clientName,
      expense.category,
      expense.amount,
      expense.paymentMode,
      expense.status,
      expense.description
    ].map(csvEscape).join(",")
  )
].join("\n");

const toHtml = (expenses: Expense[]) => {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const rows = expenses.map((expense) => `
    <tr>
      <td>${shortDate(expense.date)}</td>
      <td>${expense.projectName}</td>
      <td>${expense.clientName}</td>
      <td>${expense.category}</td>
      <td>${currency(expense.amount)}</td>
      <td>${expense.status}</td>
    </tr>
  `).join("");

  return `
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; color: #111827; }
          h1 { margin-bottom: 4px; }
          .total { margin: 0 0 24px; color: #374151; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border-bottom: 1px solid #E5E7EB; padding: 10px 8px; text-align: left; font-size: 12px; }
          th { background: #F3F4F6; }
        </style>
      </head>
      <body>
        <h1>Dabba's Ledger Report</h1>
        <p class="total">Total: ${currency(total)} | Items: ${expenses.length}</p>
        <table>
          <thead><tr><th>Date</th><th>Project</th><th>Client</th><th>Category</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;
};

const shareFile = async (filename: string, mimeType: string) => {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filename, {
      mimeType,
      dialogTitle: "Share Dabba's Ledger report"
    });
  }
};

export const reportService = {
  summary: async (params: ReportFilters) => {
    const expenses = filterExpenses(await expenseService.allForReports(), params);
    return summarize(expenses);
  },
  exportFile: async (type: "pdf" | "csv", params: ReportFilters) => {
    const expenses = filterExpenses(await expenseService.allForReports(), params);
    if (type === "csv") {
      const filename = `${FileSystem.documentDirectory}dabbas-ledger-report.csv`;
      await FileSystem.writeAsStringAsync(filename, toCsv(expenses), { encoding: FileSystem.EncodingType.UTF8 });
      await shareFile(filename, "text/csv");
      return filename;
    }

    const { uri } = await Print.printToFileAsync({ html: toHtml(expenses) });
    await shareFile(uri, "application/pdf");
    return uri;
  }
};
