const fs = require('fs')
const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)="?(.*?)"?\s*(?:#.*)?$/)
  if (m) env[m[1]] = m[2]
}
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
const examId = 'ba8630ba-37f6-427b-a929-3043d10ae5b2'
fetch(`${url}/rest/v1/exams?id=eq.${examId}&select=id,title,status,start_time,end_time,school_id`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
})
  .then((r) => r.json())
  .then((rows) => {
    console.log(JSON.stringify(rows, null, 2))
    if (Array.isArray(rows) && rows.length === 0) console.log('EXAM DOES NOT EXIST')
  })
  .catch((e) => console.error('ERR', e.message))
