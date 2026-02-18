import liff from "@line/liff"

export const initLiff = async () => {
  if (typeof window === "undefined") return

  await liff.init({
    liffId: import.meta.env.VITE_LIFF_ID
  })

  // 👇 เช็ค login ก่อน
  if (!liff.isLoggedIn()) {
    liff.login()
    return
  }

  // ตอนนี้ safe แล้ว
  const profile = await liff.getProfile()
  return profile
}
