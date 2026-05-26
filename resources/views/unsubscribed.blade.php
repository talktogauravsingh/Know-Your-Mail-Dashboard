<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unsubscribed</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#f8fafc; color:#1e293b; }
        .card { background:#fff; border-radius:12px; padding:40px; max-width:440px; width:100%; box-shadow:0 4px 24px rgba(0,0,0,.08); text-align:center; }
        .icon { font-size:2.5rem; margin-bottom:12px; }
        h1 { font-size:1.4rem; margin-bottom:8px; }
        p { color:#64748b; font-size:.95rem; }
        .email { font-weight:600; color:#1e293b; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">✅</div>
        <h1>You've been unsubscribed</h1>
        <p><span class="email">{{ $email }}</span> has been removed from this mailing list and will not receive further emails.</p>
    </div>
</body>
</html>
