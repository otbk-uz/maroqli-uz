const botToken = "8917394976:AAH8rn5mRC7hk70JKtqfL4dEaM_86-wczCM";

async function checkInfo() {
  const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const data = await infoRes.json();
  console.log("getWebhookInfo FULL:", JSON.stringify(data, null, 2));
}

checkInfo();
