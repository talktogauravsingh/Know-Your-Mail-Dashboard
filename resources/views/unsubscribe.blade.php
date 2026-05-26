<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unsubscribe</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#f8fafc; color:#1e293b; }
        .card { background:#fff; border-radius:12px; padding:40px; max-width:440px; width:100%; box-shadow:0 4px 24px rgba(0,0,0,.08); text-align:center; }
        h1 { font-size:1.4rem; margin-bottom:8px; }
        p { color:#64748b; margin-bottom:24px; font-size:.95rem; }
        form button { background:#ef4444; color:#fff; border:none; border-radius:8px; padding:12px 28px; font-size:1rem; cursor:pointer; }
        form button:hover { background:#dc2626; }
        .email { font-weight:600; color:#1e293b; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Unsubscribe</h1>
        <p>You are about to unsubscribe <span class="email">{{ $email }}</span> from further emails from this sender. This cannot be undone.</p>
        <form method="POST" action="/unsubscribe/{{ $sendLogId }}/{{ $token }}">
            @csrf
            <button type="submit">Confirm Unsubscribe</button>
        </form>
    </div>
</body>
</html>
