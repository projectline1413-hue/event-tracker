import liff from '@line/liff';

export const initLiff = async () => {
  await liff.init({ liffId: import.meta.env.VITE_LIFF_ID as string });
  return liff;
};
