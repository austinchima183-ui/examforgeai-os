const fs = require('fs')
const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)="?(.*?)"?\s*(?:#.*)?$/)
  if (m) env[m[1]] = m[2]
}
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
fetch(`${url}/rest/v1/?apikey=${key}`)
  .then(r => r.json())
  .then(defs => {
    const tables = ['exams','exam_sessions','school_calendar_events','transactions','users','question_bank','exam_results']
    for (const t of tables) {
      const def = defs.definitions?.[t]
      if (!def) { console.log(t, ': NOT FOUND'); continue }
      console.log(t, ':', Object.keys(def.properties).join(', '))
    }
  })
  .catch(e => console.error('ERR', e.message))
