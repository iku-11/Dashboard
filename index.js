// =============================
// Kurona Dashboard Backend ✨
// =============================

const express = require("express");
const session = require("express-session");
const path = require("path");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();

app.use(
  session({
    secret: "kurona-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

const CLIENT_ID = "1425424309538656388";
const CLIENT_SECRET = "BhtgJlK54TyStn25yT0m0S1q-HSmjUmu";
const REDIRECT_URI = "https://a0b3d29f-401f-47c1-afcb-4bfc96ca941e-00-2l1ec8wvu52f7.sisko.replit.dev/callback";

// 🔹 login route
app.get("/login", (req, res) => {
  const authorizeURL = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=identify%20guilds`;
  res.redirect(authorizeURL);
});

// 🔹 callback from Discord
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("مافي كود 😭");

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    scope: "identify guilds",
  });

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const data = await tokenRes.json();
    if (!data.access_token) {
      console.error("Token error:", data);
      return res.send("ما قدرنا نحصل على التوكن 😭");
    }

    req.session.access_token = data.access_token;

    // جلب بيانات المستخدم وحفظها بالجلسة
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const userData = await userRes.json();
    req.session.user = userData;

    res.redirect("/servers.html");
  } catch (err) {
    console.error(err);
    res.send("صار خطأ أثناء المصادقة 😭");
  }
});

// 🔹 API: get managed servers
app.get("/api/servers", async (req, res) => {
  const token = req.session.access_token;
  if (!token) return res.status(401).json({ error: "غير مسجل الدخول" });

  try {
    const response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const guilds = await response.json();

    if (!Array.isArray(guilds)) {
      console.error("Guilds response:", guilds);
      return res.status(500).json({ error: "خطأ في جلب السيرفرات" });
    }

    const managed = guilds.filter((g) => (g.permissions & 0x20) === 0x20);
    res.json(managed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل في جلب السيرفرات" });
  }
});

// 🔹 logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// 🔹 start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Kurona Dashboard شغال على المنفذ ${PORT}`));