import dotenv from 'dotenv';
dotenv.config();

async function testTyphoon() {
  const apiKey = process.env.TYPHOON_API_KEY;
  console.log("Using API Key:", apiKey ? "Present" : "Missing");

  const url = "https://api.opentyphoon.ai/v1/chat/completions";
  const body = {
    model: "typhoon-v1.5-8b-instruct",
    messages: [{ role: "user", content: "hi" }],
    max_tokens: 1000
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    console.log("Status:", response.status);
    const data = await response.text();
    console.log("Response Body:", data);
  } catch (error) {
    console.error("Error:", error);
  }
}

testTyphoon();
