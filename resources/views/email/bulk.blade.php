<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{ $subject ?? 'Something just dropped' }}</title>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');

body {
  margin:0;
  background:#0b0b0b;
  font-family:'Inter', sans-serif;
}

.container {
  max-width:600px;
  margin:auto;
  background:#121212;
}

/* HEADER */
.header {
  padding:20px 30px;
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.logo {
  color:#fff;
  font-weight:800;
  font-size:18px;
}

.logo span {
  color:#1db954;
}

/* HERO */
.hero {
  padding:50px 30px 30px;
}

.eyebrow {
  color:#1db954;
  font-size:12px;
  letter-spacing:2px;
  margin-bottom:20px;
}

.headline {
  color:#fff;
  font-size:36px;
  font-weight:800;
  line-height:1.2;
}

.subtext {
  color:#b3b3b3;
  margin-top:15px;
  font-size:15px;
}

/* CTA */
.cta {
  padding:30px;
}

.cta a {
  background:#1db954;
  color:#000;
  padding:14px 32px;
  border-radius:999px;
  text-decoration:none;
  font-weight:700;
  display:inline-block;
}

/* CONTENT */
.content {
  padding:10px 30px 30px;
}

.content p {
  color:#eaeaea;
  font-size:16px;
  line-height:1.6;
}

.content small {
  color:#b3b3b3;
}

/* STATS */
.stats {
  display:flex;
  background:#0b0b0b;
  border-top:1px solid #1f1f1f;
  border-bottom:1px solid #1f1f1f;
}

.stat {
  flex:1;
  text-align:center;
  padding:20px;
}

.stat h2 {
  color:#1db954;
  margin:0;
}

.stat p {
  color:#888;
  font-size:11px;
  margin-top:5px;
}

/* FOOTER */
.footer {
  padding:30px;
  text-align:center;
}

.footer p {
  color:#6b6b6b;
  font-size:12px;
}

.footer a {
  color:#1db954;
  text-decoration:none;
}

@media(max-width:480px){
  .headline { font-size:28px; }
  .stats { flex-direction:column; }
}
</style>
</head>

<body>

<div class="container">

  <!-- HEADER -->
  <div class="header">
    <div class="logo">Email<span>Lelo</span></div>
  </div>

  <!-- HERO -->
  <div class="hero">
    <div class="eyebrow">JUST DROPPED</div>

    <div class="headline">
      Something big just landed.
    </div>

    <div class="subtext">
      This isn’t just another update. This is the one you’ve been waiting for.
    </div>
  </div>

  <!-- CTA -->
  <div class="cta">
    <a href="{{ $cta_url ?? '#' }}">
      Open Now
    </a>
  </div>

  <!-- CONTENT -->
  <div class="content">
    <p>
      We’ve been building quietly. Now it’s live.
    </p>

    <p>
      {{ $body2 ?? "Faster. Cleaner. Built for people who don’t wait." }}
    </p>

    <small>
      You’re getting this because you’re early. And that matters.
    </small>
  </div>

  <!-- STATS -->
  <div class="stats">
    <div class="stat">
      <h2>{{ $stat1_value ?? '2.4M' }}</h2>
      <p>REACH</p>
    </div>
    <div class="stat">
      <h2>{{ $stat2_value ?? '99.9%' }}</h2>
      <p>DELIVERY</p>
    </div>
    <div class="stat">
      <h2>{{ $stat3_value ?? '<1s' }}</h2>
      <p>SPEED</p>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <p>
      {{ $company_name ?? 'EmailLelo' }}
    </p>

    <p>
      Not feeling this?
      <a href="{{ $unsubscribe_url ?? '#' }}">Unsubscribe</a>
    </p>
  </div>

</div>

</body>
</html> 