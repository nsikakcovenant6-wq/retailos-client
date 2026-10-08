import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query, transaction } from "@/lib/db";

function receiptNo() { return `REC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; }

export async function GET(request: Request) {
  try {
    await requireSession(["ADMIN", "MANAGER", "EMPLOYEE"]);
    const p = new URL(request.url).searchParams;
    const search = p.get("search")?.trim() ?? "";
    const status = p.get("status")?.trim() ?? "";
    const payment = p.get("payment")?.trim() ?? "";
    const result = await query("select s.id, s.receipt_no as \"receiptNo\", s.total_amount as \"totalAmount\", s.payment, s.status, s.created_at as \"createdAt\", u.full_name as \"employeeName\" from sales s join users u on u.id=s.employee_id where ($1='' or s.receipt_no ilike '%'||$1||'%') and ($2='' or s.status::text=$2) and ($3='' or s.payment::text=$3) order by s.created_at desc limit 100", [search, status, payment]);
    return NextResponse.json({ sales: result.rows });
  } catch (error) { return NextResponse.json({ error: "Unable to load sales" }, { status: 500 }); }
}

export async function POST(request:Request){try{const user=await requireSession(["ADMIN","MANAGER","EMPLOYEE"]);const body=await request.json(),payment=String(body.payment||"").toUpperCase(),items=Array.isArray(body.items)?body.items:[];if(!["CASH","TRANSFER","POS"].includes(payment)||!items.length)throw new Error("Payment method and cart items required");const sale=await transaction(async client=>{let total=0,totalCost=0;const lines:{id:string;quantity:number;unit:string;base:number;price:number;cost:number;line:number;service:boolean}[]=[];for(const item of items){const id=String(item.productId||""),quantity=Number(item.quantity);if(!id||!Number.isInteger(quantity)||quantity<=0)throw new Error("Invalid sale quantity");const r=await client.query("select id,item_type,cost_price,stock_quantity from products where id=$1 and active=true for update",[id]);if(!r.rowCount)throw new Error("Product not found");const p=r.rows[0],u=await client.query("select name,base_quantity,price from product_units where product_id=$1 and name=$2",[id,String(item.unitName||"")]);if(!u.rowCount)throw new Error("Invalid selling unit");const unit=u.rows[0],base=Number(unit.base_quantity)*quantity,service=p.item_type==="SERVICE";if(!service&&(!Number.isInteger(base)||base>Number(p.stock_quantity)))throw new Error("Insufficient stock or invalid base quantity");const price=service?Number(item.unitPrice):Number(unit.price);if(!Number.isFinite(price)||price<0||Math.round(price*100)!==price*100)throw new Error("Invalid service price");const line=Math.round(price*quantity*100)/100,cost=service?0:Number(p.cost_price)*base;total+=line;totalCost+=cost;lines.push({id,quantity,unit:unit.name,base,price,cost,line,service})}total=Math.round(total*100)/100;const paid=body.amountPaid===undefined?total:Number(body.amountPaid);if(!Number.isFinite(paid)||paid<0||paid>total||Math.round(paid*100)!==paid*100)throw new Error("Invalid amount paid");const customerId=body.customerId||null;if(paid<total&&!customerId)throw new Error("Customer required for unpaid balance");if(customerId){const r=await client.query("select id from customers where id=$1 and active=true",[customerId]);if(!r.rowCount)throw new Error("Customer not found")}const receipt=receiptNo();const created=await client.query('insert into sales(receipt_no,employee_id,payment,status,total_amount,total_cost,amount_paid,customer_id) values($1,$2,$3,\'COMPLETED\',$4,$5,$6,$7) returning id,receipt_no as "receiptNo",total_amount as "totalAmount",amount_paid as "amountPaid",created_at as "createdAt"',[receipt,user.id,payment,total,totalCost,paid,customerId]);const saleId=created.rows[0].id;for(const l of lines){await client.query("insert into sale_items(sale_id,product_id,quantity,unit_price,unit_cost,line_total,unit_name,base_quantity) values($1,$2,$3,$4,$5,$6,$7,$8)",[saleId,l.id,l.quantity,l.price,l.cost/l.quantity,l.line,l.unit,l.base]);if(!l.service)await client.query("update products set stock_quantity=stock_quantity-$2 where id=$1",[l.id,l.base])}if(paid>0)await client.query("insert into sale_payments(sale_id,amount,method,recorded_by) values($1,$2,$3,$4)",[saleId,paid,payment,user.id]);await client.query("insert into audit_logs(user_id,action,entity,entity_id,details) values($1,'CREATE','SALE',$2,$3)",[user.id,saleId,JSON.stringify({receipt,total,paid})]);return {...created.rows[0],balance:Math.round((total-paid)*100)/100}});return NextResponse.json({sale},{status:201})}catch(e){const message=e instanceof Error?e.message:"Unable to complete sale";return NextResponse.json({error:message},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:400})}}
export async function PATCH(request: Request) {
  try {
    const user = await requireSession(["ADMIN", "MANAGER"]);
    const { id } = await request.json();
    await transaction(async client => {
      const sale = await client.query("select id,status from sales where id=$1 for update", [id]);
      if (!sale.rowCount) throw new Error("Sale not found");
      if (sale.rows[0].status === "CANCELLED") return; const paid=await client.query("select amount_paid from sales where id=$1",[id]); if(Number(paid.rows[0].amount_paid)>0) throw new Error("Refund recorded payments before cancelling this sale");
      const items = await client.query("select si.product_id,si.base_quantity, p.item_type from sale_items si join products p on p.id=si.product_id where sale_id=$1", [id]);
      for (const item of items.rows.filter((i:any)=>i.item_type!=="SERVICE")) await client.query("update products set stock_quantity=stock_quantity+$2 where id=$1", [item.product_id, item.base_quantity]);
      await client.query("update sales set status='CANCELLED' where id=$1", [id]);
      await client.query("insert into audit_logs(user_id,action,entity,entity_id) values($1,'CANCEL','SALE',$2)", [user.id, id]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to cancel sale" }, { status: 400 }); }
}
