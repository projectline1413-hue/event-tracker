import liff from "@line/liff";

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string;

export async function initLiff() {
  try {
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      // 1. ถ้ายังไม่ Login ให้เรียก login()
      liff.login();
      return null;
    }

    // 2. ถ้า Login แล้วค่อยคืนค่า liff instance
    return liff;
  } catch (err) {
    console.error("LIFF Init Error:", err);
    throw err;
  }
}

export default liff;
