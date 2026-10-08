import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
 try {
  await requireSession();
  const result=await query('select name from store_settings where id=1');
  return NextResponse.json({name:result.rows[0]?.name || "My Store"});
 }catch(error) {
  const status=error instanceof Error && error.message==="UNAUTHORIZED"?401:500;
  return NextResponse.json({error:status===401?"Unauthorized":"Unable to load store settings. Run the store settings migration."},{status});
 }
}
export async function PATCH(request:Request) {
 try {
  await requireSession(["ADMIN","MANAGER"]);
  const {name}=await request.json();
  if(typeof name!=="string" || !name.trim() || name.trim().length>160) return NextResponse.json({error:"Enter a store name (1–160 characters)."},{status:400});
  const result=await query('insert into store_settings(id,name) values(1,$1) on conflict(id) do update set name=excluded.name, updated_at=now() returning name',[name.trim()]);
  return NextResponse.json({name:result.rows[0].name});
 }catch(error){
  const status=error instanceof Error&&error.message==="FORBIDDEN"?403:error instanceof Error&&error.message==="UNAUTHORIZED"?401:500;
  return NextResponse.json({error:status===403?"Forbidden":status===401?"Unauthorized":"Unable to update store name"},{status});
 }
}
