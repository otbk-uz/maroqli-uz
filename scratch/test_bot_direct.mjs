const botToken = "8917394976:AAH8rn5mRC7hk70JKtqfL4dEaM_86-wczCM";

async function testBot() {
  const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const meData = await meRes.json();
  console.log("getMe:", meData);

  const webhookRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const webhookData = await webhookRes.json();
  console.log("getWebhookInfo:", webhookData);

  // Send test msg to admin
  const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: '5116279804',
      text: "✅ MAROQLI TO'LOV boti tayyor va faol ishlamoqda! (/start buyrug'ini botda sinab ko'ring)"
    })
  });
  console.log("sendMessage to admin:", await sendRes.json());
}

testBot();
