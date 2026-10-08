import { NextResponse } from "next/server";
import { query, transaction } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireSession();
    const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";
    const result = await query("select id, name, category, selling_price as \"sellingPrice\", cost_price as \"costPrice\", stock_quantity as \"stockQuantity\", active, created_at as \"createdAt\" from products where active=true and ($1='' or name ilike '%' || $1 || '%' or coalesce(category,'') ilike '%' || $1 || '%') order by name", [search]);
    const units=await query('select product_id as "productId",id,name,base_quantity as "baseQuantity",price from product_units where product_id=any($1::uuid[]) order by base_quantity',[result.rows.map(p=>p.id)]);return NextResponse.json({products:result.rows.map(p=>({...p,units:units.rows.filter(u=>u.productId===p.id)}))});
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "UNAUTHORIZED" ? "Unauthorized" : "Unable to load products" }, { status: error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500 });
  }
}

function validate(body:any){const name=String(body.name||"").trim(),type=body.itemType==="SERVICE"?"SERVICE":"PRODUCT",price=Number(body.sellingPrice),cost=Number(body.costPrice||0),stock=type==="SERVICE"?0:Number(body.stockQuantity||0),threshold=Number(body.lowStockThreshold??5),base=String(body.baseUnit||"piece").trim();if(!name||!base||![price,cost,stock,threshold].every(x=>Number.isFinite(x)&&x>=0)||!Number.isInteger(stock))throw new Error("Invalid item data");const units=type==="SERVICE"?[{name:"service",baseQuantity:1,price}]:Array.isArray(body.units)&&body.units.length?body.units:[{name:base,baseQuantity:1,price}];const seen=new Set<string>();for(const u of units){if(!String(u.name||"").trim()||!Number.isFinite(Number(u.baseQuantity))||Number(u.baseQuantity)<=0||!Number.isFinite(Number(u.price))||Number(u.price)<0||seen.has(String(u.name).toLowerCase()))throw new Error("Invalid or duplicate selling unit");seen.add(String(u.name).toLowerCase())}return {name,type,price,cost,stock,threshold,base,units}}
async function writeUnits(client:any,id:string,units:any[]){await client.query("delete from product_units where product_id=$1",[id]);for(const u of units)await client.query("insert into product_units(product_id,name,base_quantity,price) values($1,$2,$3,$4)",[id,String(u.name).trim(),Number(u.baseQuantity),Number(u.price)])}
export async function POST(request:Request){try{await requireSession(["ADMIN","MANAGER"]);const b=validate(await request.json());const item=await transaction(async client=>{const r=await client.query('insert into products(name,category,selling_price,cost_price,stock_quantity,item_type,base_unit,low_stock_threshold) values($1,$2,$3,$4,$5,$6,$7,$8) returning id',[b.name,null,b.price,b.cost,b.stock,b.type,b.base,b.threshold]);await writeUnits(client,r.rows[0].id,b.units);return r.rows[0]});return NextResponse.json({product:item},{status:201})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to create item"},{status:400})}}
export async function PATCH(request:Request){try{await requireSession(["ADMIN","MANAGER"]);const body=await request.json();const b=validate(body);if(!body.id)throw new Error("Missing item id");const item=await transaction(async client=>{const r=await client.query('update products set name=$2,selling_price=$3,cost_price=$4,stock_quantity=$5,item_type=$6,base_unit=$7,low_stock_threshold=$8 where id=$1 and active=true returning id',[body.id,b.name,b.price,b.cost,b.stock,b.type,b.base,b.threshold]);if(!r.rowCount)throw new Error("Item not found");await writeUnits(client,body.id,b.units);return r.rows[0]});return NextResponse.json({product:item})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to update item"},{status:400})}}
export async function DELETE(request: Request) {
  try {
    await requireSession(["ADMIN", "MANAGER"]);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Product id is required" }, { status: 400 });
    await transaction(async client => {
      await client.query("update products set active=false where id=$1", [id]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof Error && error.message === "FORBIDDEN" ? 403 : error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Unable to delete product" : error instanceof Error ? error.message : "Forbidden" }, { status });
  }
}
