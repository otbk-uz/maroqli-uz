const botToken = "8917394976:AAFmQ8dwmSs2yTs8IudHSQ1WzlahLL02_4U";

async function cleanBotInfo() {
  console.log("Cleaning bot info...");

  // 1. Reset Description (Info bio)
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

  // 4. Verify getMe
  const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  console.log("getMe info:", await meRes.json());
}

cleanBotInfo();
