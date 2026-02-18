import liff from "@line/liff"

export const initLiff = async () => {
  if (typeof window === "undefined") return null

  const liffId = import.meta.env.VITE_LIFF_ID
  if (!liffId) {
    console.error("LIFF ID is missing! Please add VITE_LIFF_ID to your .env file.")
    return null
  }

  await liff.init({ liffId })

  if (!liff.isLoggedIn()) {
    liff.login()
    return null
  }

  return liff
}
