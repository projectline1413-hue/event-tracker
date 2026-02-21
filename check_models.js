// check_models.js
import dotenv from "dotenv";
dotenv.config();

async function getModels() {
  const response = await fetch("https://api.opentyphoon.ai/v1/models", {
    headers: { "Authorization": `Bearer ${process.env.TYPHOON_API_KEY}` }
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}
getModels();