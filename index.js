import express from 'express';
import { create, ev } from '@open-wa/wa-automate';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 3000;

const sessions = new Map();

app.use(bodyParser.json());
app.use(express.static('public'));

// 🔄 Create a new session (or return QR)
app.get('/generate-qr', async (req, res) => {
  const sessionId = req.query.sessionId;

  if (!sessionId) return res.status(400).send({ error: "Missing sessionId" });

  if (sessions.has(sessionId)) {
    return res.send({ message: "Session already active" });
  }

  const client = await create({
    sessionId,
    multiDevice: true,
    qrTimeout: 0, // Never timeout QR
    authTimeout: 60,
    headless: true,
    logConsole: false,
    popup: false,
    disableSpins: true
  });

  sessions.set(sessionId, client);

  ev.on(`qr.**`, async (qrcode, session) => {
    if (session === sessionId) {
      res.send({ qr: `data:image/png;base64,${qrcode}` });
    }
  });
});

// 🚀 Send image + caption
app.post('/send-message', async (req, res) => {
  const { sessionId, to, caption, image } = req.body;

  if (!sessionId || !to || !caption || !image) {
    return res.status(400).send({ error: "Missing parameters" });
  }

  const client = sessions.get(sessionId);

  if (!client) {
    return res.status(404).send({ error: "Session not found. Link WhatsApp first." });
  }

  try {
    await client.sendImage(
      to,
      image,   // Should be base64 string or image URL
      'meme.jpg',
      caption
    );
    res.send({ success: true });
  } catch (err) {
    res.status(500).send({ error: err.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Bot running on http://localhost:${PORT}`);
});
