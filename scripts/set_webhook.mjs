import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = match[2] || '';
        value = value.replace(/(^['"]|['"]$)/g, '').trim();
        process.env[match[1]] = value;
      }
    });
  }
}
loadEnv();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8917394976:AAFmQ8dwmSs2yTs8IudHSQ1WzlahLL02_4U';
const domainArg = process.argv[2] || 'https://maroqli.uz';

async function main() {
  const webhookUrl = `${domainArg.replace(/\/$/, '')}/api/bot/telegram`;
  console.log(`🤖 Bot Username: @maroqlitolovrasmiybot`);
  console.log(`🔗 Webhook URL o'rnatilmoqda: ${webhookUrl}`);

  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
  const data = await res.json();

  if (data.ok) {
    console.log("✅ Webhook muvaffaqiyatli o'rnatildi!");
  } else {
    console.error("❌ Xatolik:", data.description);
  }
}

main().catch(console.error);
