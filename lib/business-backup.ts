type BackupQuery=(sql:string,params:unknown[])=>Promise<{rows:Record<string,unknown>[]} >;
const scopedTables=['business_settings','categories','customers','products','orders','stock_movements','receipts','audit_logs'] as const;
export async function collectBusinessBackup(businessId:string,query:BackupQuery){
 if(!businessId?.trim())throw new Error('Business context is required.');
 const tables:Record<string,unknown>={};
 tables.businesses=(await query('SELECT * FROM businesses WHERE id=$1',[businessId])).rows;
 tables.users=(await query('SELECT id,business_id,name,email,role,phone,active,created_at,updated_at FROM users WHERE business_id=$1',[businessId])).rows;
 for(const table of scopedTables)tables[table]=(await query(`SELECT * FROM ${table} WHERE business_id=$1`,[businessId])).rows;
 for(const table of ['order_items','delivery_events'])tables[table]=(await query(`SELECT t.* FROM ${table} t JOIN orders o ON o.id=t.order_id WHERE o.business_id=$1`,[businessId])).rows;
 tables.loyalty_transactions=(await query('SELECT t.* FROM loyalty_transactions t JOIN customers c ON c.id=t.customer_id WHERE c.business_id=$1',[businessId])).rows;
 return tables;
}
