const botToken = "8917394976:AAH8rn5mRC7hk70JKtqfL4dEaM_86-wczCM";
const webhookUrl = "https://www.maroqli.uz/api/bot/telegram";

async function setupNewBot() {
  console.log("Setting up webhook URL with www:", webhookUrl);

  // Set Webhook
  const webhookRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"]
    })
  });
  console.log("setWebhook result:", await webhookRes.json());

  // Check getWebhookInfo
  const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  console.log("Webhook Info:", await infoRes.json());
}

setupNewBot();
