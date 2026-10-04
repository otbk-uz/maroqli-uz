const botToken = "8917394976:AAH8rn5mRC7hk70JKtqfL4dEaM_86-wczCM";
const webhookUrl = "https://maroqli.uz/api/bot/telegram";

async function setupNewBot() {
  console.log("Setting up new bot token...");

  // 1. Reset Description
  const descRes = await fetch(`https://api.telegram.org/bot${botToken}/setMyDescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: "MAROQLI.uz — rasmiy to'lov va tasdiqlash boti. Saytdan qilingan buyurtmalar va to'lov chekini ko'rib chiqish hamda tasdiqlash uchun xizmat qiladi."
    })
  });
  console.log("setMyDescription result:", await descRes.json());

  // 2. Reset Short Description
  const shortDescRes = await fetch(`https://api.telegram.org/bot${botToken}/setMyShortDescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      short_description: "MAROQLI.uz platformasi to'lov va tasdiqlash boti."
    })
  });
  console.log("setMyShortDescription result:", await shortDescRes.json());

  // 3. Reset Name
  const nameRes = await fetch(`https://api.telegram.org/bot${botToken}/setMyName`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: "MAROQLI TO'LOV"
    })
  });
  console.log("setMyName result:", await nameRes.json());

  // 4. Set Webhook
  const webhookRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"]
    })
  });
  console.log("setWebhook result:", await webhookRes.json());

  // 5. Check getWebhookInfo & getMe
  const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  console.log("Webhook Info:", await infoRes.json());

  const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  console.log("getMe:", await meRes.json());
}

setupNewBot();
