const TOKEN = '8917394976:AAFmQ8dwmSs2yTs8IudHSQ1WzlahLL02_4U';

async function check() {
  console.log("Checking Bot info...");
  const meRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`);
  const meData = await meRes.json();
  console.log("Bot getMe:", JSON.stringify(meData, null, 2));

  console.log("\nChecking Webhook info...");
  const hookRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
  const hookData = await hookRes.json();
  console.log("Webhook Info:", JSON.stringify(hookData, null, 2));
}

check().catch(console.error);
