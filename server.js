import express from "express";
import { middleware, messagingApi } from "@line/bot-sdk";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import cors from "cors";
import sharp from "sharp";
import { callTyphoon, callTyphoonOCR } from "./typhoon.js";

dotenv.config();

/* ==============================
   LINE Config
============================== */
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

if (!config.channelAccessToken || !config.channelSecret) {
  throw new Error("Missing LINE channel config in .env");
}

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

/* ==============================
   Supabase (Server Only)
============================== */
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ==============================
   Express Setup
============================== */
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

/* ==============================
   Helper: stream → buffer
============================== */
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });

/* ==============================
   Webhook
============================== */
app.post("/api/webhook", middleware(config), (req, res) => {

  // ตอบ LINE ทันที (สำคัญมาก)
  res.status(200).json({ status: "ok" });

  // ทำงานต่อแบบ background
  Promise.all(req.body.events.map(handleEvent))
    .catch(err => console.error("Webhook Error:", err));

});


/* ==============================
   Event Handler
============================== */
async function handleEvent(event) {

  console.log("Incoming:", event.type, event.message?.type);
  console.log("Full event:", JSON.stringify(event, null, 2));

  if (event.type !== "message") return;

  const lineUserId = event.source.userId;

  if (!lineUserId) {
    console.log("No userId found in event.source");
    return;
  }

  try {

    /* --------------------------
       1. Get or Create Profile
    --------------------------- */
    let { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("line_user_id", lineUserId)
      .maybeSingle();

    let userUuid;
    let displayName = "Runner";

    if (profile) {
      userUuid = profile.id;
      displayName = profile.display_name;
    } else {
      try {
        const lineProfile = await client.getProfile(lineUserId);
        displayName = lineProfile.displayName;
      } catch {}

      const { data } = await supabase
        .from("profiles")
        .insert({
          line_user_id: lineUserId,
          display_name: displayName,
        })
        .select("id")
        .single();
      
      if (!data) throw new Error("Failed to create profile");
      userUuid = data.id;
    }

    /* --------------------------
       2. Image Message
    --------------------------- */
    if (event.message.type === "image") {

  // ✅ 1. ตอบกลับทันที
      client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: "⏳ กำลังประมวลผลภาพ กรุณารอสักครู่..."
        }
      ],
    }).catch(err => {
      console.error("Reply error:", err);
    });


  const messageId = event.message.id;
      const blobClient = new messagingApi.MessagingApiBlobClient({
        channelAccessToken: config.channelAccessToken,
      });

      const stream = await blobClient.getMessageContent(messageId);
      const buffer = await streamToBuffer(stream);

      // Pre-process image with sharp for better OCR
      const processedBuffer = await sharp(buffer)
        .resize({ width: 1000, withoutEnlargement: true })
        .grayscale()
        .normalize()
        .threshold(160)
        .toBuffer();

      const fileName = `${lineUserId}/${Date.now()}.jpg`;

      // Upload ORIGINAL buffer to storage
      const { error: uploadError } = await supabase.storage
        .from("run-images")
        .upload(fileName, buffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("run-images").getPublicUrl(fileName);

      let detectedDistance = 0;
      let rawText = "";

      // 3. OCR with Typhoon
      try {
        console.log("Processing image with Typhoon OCR...");
        rawText = await callTyphoonOCR(processedBuffer, `${lineUserId}.jpg`);
        console.log("OCR Result:", rawText);

        if (rawText.trim().length > 0) {
          // 4. Extract KM with Typhoon Chat
        const typhoonResult = await callTyphoon([
          { 
            role: "system", 
            content: `You are a running data extractor. 
            Analyze the OCR text. The user just ran a race. 
            Look for the DISTANCE in KM. 
            IMPORTANT: 
            - If you see a large number like '427' or '512' without a decimal, but it's clearly the distance, assume the decimal is missing (e.g., 427 becomes 4.27). 
            - Running distance is usually between 0.1 and 100.0 km.
            - Return ONLY the number.` 
          },
          { role: "user", content: `OCR Text: ${rawText}` }
        ]);
          detectedDistance = parseFloat(typhoonResult.trim()) || 0;
        }
      } catch (err) {
        console.error("AI/OCR Error:", err);
      }

      if (detectedDistance > 0) {
        // บันทึกลง Supabase
        await supabase.from("runs").insert({
          user_id: userUuid,
          image_url: publicUrl,
          distance_km: detectedDistance,
          raw_ocr_text: rawText,
        });

       await client.pushMessage({
          to: lineUserId,
          messages: [
            {
              type: "text",
              text: `🤖 ตรวจพบระยะทาง ${detectedDistance} km\n✅ บันทึกเรียบร้อยครับ!`
            }
          ],
        });

        return; 

      } else {
       await client.pushMessage({
  to: lineUserId,
  messages: [
    {
      type: "text",
      text: "❌ ระบบไม่สามารถอ่านระยะทางได้\nกรุณาส่งรูปใหม่ครับ"
    }
  ],
});
      
    return;}
    }

       /* --------------------------
       3. Text Message
    --------------------------- */
    if (event.message.type === "text") {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "text",
            text: "🏃 กรุณาส่ง 'รูปภาพ' ผลการวิ่งเพื่อบันทึกระยะทางครับ\n(ไม่สามารถบันทึกจากการพิมพ์ข้อความได้)"
          }
        ],
      });
    }

  } catch (err) {
    console.error("HandleEvent Error:", err);

    await client.pushMessage({
      to: lineUserId,
      messages: [
        { type: "text", text: "เกิดข้อผิดพลาดในการประมวลผลครับ" }
      ],
    });
  }
}


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});