const {test}=require('node:test');
const assert=require('node:assert/strict');
const bcrypt=require('bcrypt');
const {repair}=require('../scripts/repair-local-accounts.cjs');
const env={NODE_ENV:'development',DB_HOST:'127.0.0.1',DB_PORT:'3307',DB_USER:'app',DB_PASSWORD:'test-password',DB_NAME:'test'};
test('repair refuses production and remote databases before connecting',async()=>{
 for(const values of [{NODE_ENV:'production'},{NODE_ENV:undefined},{DB_HOST:'db.example.com'}]){
  await assert.rejects(repair({...env,...values},()=>{throw new Error('must not connect')}),/requires NODE_ENV/);
 }
});
test('repair hashes both accounts, uses bound values, and commits one transaction',async()=>{
 const events=[];const rows=[];
 const db={beginTransaction:async()=>events.push('begin'),execute:async(sql,args)=>{assert.ok(sql.includes('VALUES (?, ?, ?)'));rows.push(args)},commit:async()=>events.push('commit'),rollback:async()=>events.push('rollback'),end:async()=>events.push('end')};
 await repair(env,async()=>db);
 assert.deepEqual(events,['begin','commit','end']);
 assert.equal(rows.length,2);
 assert.deepEqual(rows.map(r=>[r[0],r[2]]),[['admin','ADMIN'],['orderadmin','ORDER_ADMIN']]);
 assert.ok(await bcrypt.compare('admin123',rows[0][1]));
 assert.ok(await bcrypt.compare('orderadmin123',rows[1][1]));
});
test('repair rolls back if either account update fails and closes connection',async()=>{
 const events=[];
 const db={beginTransaction:async()=>events.push('begin'),execute:async()=>{throw new Error('write failed')},commit:async()=>events.push('commit'),rollback:async()=>events.push('rollback'),end:async()=>events.push('end')};
 await assert.rejects(repair(env,async()=>db),/write failed/);
 assert.deepEqual(events,['begin','rollback','end']);
});
