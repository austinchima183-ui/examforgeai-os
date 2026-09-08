// RC1: test the failure-update RLS path directly as the teacher
const ANON = require('fs').readFileSync('/home/z/my-project/.env.local', 'utf8')
  .split('\n').find((l) => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')).split('=')[1];

(async () => {
  // 1. sign in
  const auth = await fetch('https://pzfnptrrnxkgodclyhft.supabase.co/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'e2e-teacher-1787626988@examforge-test.com', password: 'Teacher123!' }),
  }).then((r) => r.json());
  const token = auth.access_token;
  console.log('teacher auth:', token ? 'OK (uid ' + auth.user.id.slice(0, 8) + '…)' : 'FAILED');

  // 2. try updating the stuck row
  const r = await fetch('https://pzfnptrrnxkgodclyhft.supabase.co/rest/v1/ai_generation_requests?id=eq.' + process.argv[2], {
    method: 'PATCH',
    headers: {
      apikey: ANON,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ status: 'failed', error_message: 'direct RLS test', duration_ms: 123 }),
  });
  console.log('PATCH status:', r.status);
  console.log('body:', (await r.text()).slice(0, 400));
})();
