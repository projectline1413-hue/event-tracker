import dotenv from "dotenv";
dotenv.config();

/**
 * ฟังก์ชันสำหรับเรียกใช้งาน Chat Completion (Typhoon) ผ่าน native fetch
 */
export async function callTyphoon(messages) {
  const apiKey = process.env.TYPHOON_API_KEY;
  if (!apiKey) throw new Error("TYPHOON_API_KEY is missing");

  const url = "https://api.opentyphoon.ai/v1/chat/completions";
  const body = {
    model: "typhoon-v2.5-30b-a3b-instruct",
    messages: messages,
    max_tokens: 1000,
    temperature: 0.1,
  };

  console.log("--- TYPHOON REQUEST BODY ---");
  console.log(JSON.stringify(body, null, 2));
  console.log("----------------------------");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`--- TYPHOON CHAT API ERROR ---`);
      console.error(`Status: ${response.status}`);
      console.error(`Body: ${errorText}`);
      console.error(`------------------------------`);
      throw new Error(
        `Typhoon Chat API error: ${response.status} - ${errorText}`,
      );
    }

    const data = await response.json();
const content = data.choices[0].message.content;
console.log("--- TYPHOON RESPONSE ---");
    console.log(content);
    console.log("------------------------");

    return data.choices[0].message.content;
  } catch (error) {
    if (error.message.includes("429")) {
      console.error("Typhoon Chat: Rate limit reached.");
      throw new Error("RATE_LIMIT_REACHED");
    }
    console.error("Typhoon Chat Error:", error.message);
    throw error;
  }
}

/**
 * ฟังก์ชันสำหรับเรียกใช้งาน OCR (Typhoon OCR)
 */
export async function callTyphoonOCR(imageBuffer, fileName = "image.jpg") {
  const apiKey = process.env.TYPHOON_API_KEY;
  if (!apiKey) throw new Error("TYPHOON_API_KEY is missing");

  // สร้าง Blob จาก Buffer เพื่อใช้กับ FormData
  const blob = new Blob([imageBuffer], { type: "image/jpeg" });

  const formData = new FormData();
  formData.append("file", blob, fileName);
  formData.append("model", "typhoon-ocr");
  formData.append("task_type", "default");
  formData.append("max_tokens", "1000");
  formData.append("temperature", "0.1");
  formData.append("top_p", "0.6");
  formData.append("repetition_penalty", "1.2");

  try {
    const response = await fetch("https://api.opentyphoon.ai/v1/ocr", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`--- TYPHOON OCR API ERROR ---`);
      console.error(`Status: ${response.status}`);
      console.error(`Body: ${errorText}`);
      console.error(`------------------------------`);
      throw new Error(
        `Typhoon OCR API error: ${response.status} - ${errorText}`,
      );
    }

    const result = await response.json();

    const extractedTexts = [];
    for (const pageResult of result.results || []) {
      if (pageResult.success && pageResult.message) {
        let content = pageResult.message.choices[0].message.content;
        try {
          const parsedContent = JSON.parse(content);
          content = parsedContent.natural_text || content;
        } catch (e) {
          // ใช้ content ปกติหากไม่ใช่ JSON
        }
        extractedTexts.push(content);
      }
    }

    return extractedTexts.join("\n");
  } catch (error) {
    console.error("Typhoon OCR Error:", error);
    throw error;
  }
}
