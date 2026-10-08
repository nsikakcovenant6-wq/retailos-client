import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";

function rangeFor(period: string) {
  if (period === "monthly") return "(date_trunc('month', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos')";
  if (period === "yearly") return "(date_trunc('year', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos')";
  return "(((now() at time zone 'Africa/Lagos')::date)::timestamp at time zone 'Africa/Lagos')";
}

export async function GET(request: Request) {
  try {
    await requireSession(["ADMIN", "MANAGER"]);
    const requested = new URL(request.url).searchParams.get("period") ?? "daily";
    const period = ["daily", "monthly", "yearly"].includes(requested) ? requested : "daily";
    const start = rangeFor(period);
    const where = `s.status='COMPLETED' and s.created_at >= ${start}`;

    const summary = await query(`select coalesce(sum(s.total_amount),0) as "totalSales", coalesce(sum(s.total_amount-s.total_cost),0) as "totalProfit", count(*)::int as "transactions" from sales s where ${where}`);
    const payments = await query(`select s.payment, coalesce(sum(s.total_amount),0) as amount, count(*)::int as transactions from sales s where ${where} group by s.payment order by amount desc`);
    const topItems = await query(`select p.name, sum(si.quantity)::int as quantity, sum(si.line_total) as sales from sale_items si join sales s on s.id=si.sale_id join products p on p.id=si.product_id where ${where} group by p.id,p.name order by sales desc limit 10`);
    const employees = await query(`select u.full_name as "employeeName", count(s.id)::int as transactions, coalesce(sum(s.total_amount),0) as sales from sales s join users u on u.id=s.employee_id where ${where} group by u.id,u.full_name order by sales desc`);
    const trend = await query("select to_char(day,'YYYY-MM-DD') as date, coalesce(sum(s.total_amount),0) as sales from generate_series((now() at time zone 'Africa/Lagos')::date - 6, (now() at time zone 'Africa/Lagos')::date, interval '1 day') day left join sales s on (s.created_at at time zone 'Africa/Lagos')::date=day::date and s.status='COMPLETED' group by day order by day");

    return NextResponse.json({ period, summary: summary.rows[0], payments: payments.rows, topItems: topItems.rows, employees: employees.rows, trend: trend.rows });
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : error instanceof Error && error.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : status === 401 ? "Unauthorized" : "Unable to generate report" }, { status });
  }
}
