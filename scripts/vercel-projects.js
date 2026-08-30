const fs = require('fs')
const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)="?(.*?)"?\s*(?:#.*)?$/)
  if (m) env[m[1]] = m[2]
}
const token = env.VERCEL_TOKEN
fetch('https://api.vercel.com/v9/projects?limit=20', {
  headers: { Authorization: `Bearer ${token}` },
})
  .then((r) => r.json())
  .then((data) => {
    for (const p of data.projects ?? []) {
      console.log(p.name, '|', p.id, '|', (p.latestDeployments ?? []).map((d) => d.url).join(','))
    }
  })
  .catch((e) => console.error('ERR', e.message))
