import { DiscordSDK } from "https://unpkg.com/@discord/embedded-app-sdk@1.2.0/output/index.mjs";

window.sdkReady = false;
window.sdkError = null;

const sdkReadyTimeout = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Discord SDK phản hồi quá thời gian.')), 10000);
});

try {
  window.discordSdk = new DiscordSDK('1541005812951162920');
  window.sdkReadyPromise = Promise.race([
    window.discordSdk.ready(),
    sdkReadyTimeout
  ]).then(() => {
    window.sdkReady = true;
  }).catch(error => {
    window.sdkError = error;
    console.error('Lỗi khởi tạo SDK:', error);
  });
} catch (error) {
  window.sdkError = error;
  window.sdkReadyPromise = Promise.resolve();
  console.error('Lỗi tạo SDK:', error);
}
