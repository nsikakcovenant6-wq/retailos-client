import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(){
 try{
  const user=await requireSession();
  const [sales,products,lowStock,recent,activity]=await Promise.all([
   query("select coalesce(sum(total_amount),0) as \"todaySales\", count(*)::int as \"todayTransactions\" from sales where status='COMPLETED' and (created_at at time zone 'Africa/Lagos')::date=(now() at time zone 'Africa/Lagos')::date"),
   query("select count(*)::int as count, coalesce(sum(stock_quantity),0)::int as units from products where active=true"),
   query("select id,name,stock_quantity as \"stockQuantity\" from products where active=true and stock_quantity<=5 order by stock_quantity,name limit 10"),
   query("select s.receipt_no as \"receiptNo\",s.total_amount as amount,s.payment,s.status,s.created_at as \"createdAt\",u.full_name as \"employeeName\" from sales s join users u on u.id=s.employee_id order by s.created_at desc limit 8"),
   query("select a.action,a.entity,a.created_at as \"createdAt\",u.full_name as \"userName\" from audit_logs a join users u on u.id=a.user_id order by a.created_at desc limit 8")
  ]);
  return NextResponse.json({user,stats:{...sales.rows[0],...products.rows[0]},lowStock:lowStock.rows,recent:recent.rows,activity:activity.rows});
 }catch(error){const status=error instanceof Error&&error.message==="UNAUTHORIZED"?401:500;return NextResponse.json({error:status===401?"Unauthorized":"Unable to load dashboard"},{status})}
}
