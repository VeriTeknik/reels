# Haftalık reel hattı

Pazar 20:45 (TSİ) koşan zamanlanmış görevin yaptığı iş.
Kaynak Buffer'daki LinkedIn taslakları, çıktı Postiz'de (sosyal.veriteknik.com) **taslak**.
Hiçbir şey yayınlanmaz veya zamanlanmaz; yayın kararı Cem'de.
Instagram, Facebook, Threads ve YouTube Postiz'de; LinkedIn ve X Buffer'da.

1. **Seçim.** Buffer (org `6888f5e649f7b6ba27236704`) LinkedIn kanalındaki (`6888f7a4cdb92dce19adf5c7`) `draft` gönderileri listelenir.
   Video taşımayan ve `state/processed.json` içinde olmayanlar işlenir; en fazla 2 tane, en yenisi önce.
2. **Şablon.** Sürüm notu taslağı (`vX.Y.Z yayında` ile başlar) `tools/cards.html` + `tools/render-cards.mjs` ile yapılır (`tools/releases/*.json` örnek).
   Diğer konular `tools/reel.html` + `tools/render.mjs` ile yapılır; gerekiyorsa yalnız **salt okunur** bir VeriTeknik MCP çağrısı (yalnız `test-lab-01`).
   Konu bir çağrıyla gösterilemiyorsa çağrı yapılmaz; uydurma çıktı gösterilmez.
3. **Ses.** 20-30 sn Türkçe metin, taslakla aynı olgular.
   Telaffuz: MCP → "Emsipi", Claude → "Klod", fail2ban → "fail-tu-ben", DNS → "De en es", Morpheus → "Morfius".
   Fish Audio, ses `241fac3c0dd14046a1f31816d9cdcc6d` ("TÜRKÇE ERKEK SES"), çağrı başına ≤500 bayt.
4. **Render.** 1080x1920 MP4; altyazılar sesteki duraklamalardan (ffmpeg `silencedetect`) zamanlanır.
5. **Depo.** `videos/YYYY/MM/<slug>.mp4` ve yanına `<slug>.post.json` (aşağıda) itilir; `state/processed.json`'a Buffer post id eklenir.
6. **Postiz taslağı.** Sunucuda `tools/postiz-draft.py <slug>.post.json` çalışır (VeriTeknik MCP `run_admin_command`, sunucu `0adee949-497f-4602-97aa-4a020de547c1`).
   Facebook, Instagram (Reel), Threads ve YouTube (VeriTeknik) kanallarına tek taslak grubu açar.
   API anahtarı sunucuda `/opt/postiz/api-key` (root, 600) dosyasındadır; komutlarda ve çıktıda geçmez.
7. **Özet.** İşlenen taslaklar, MCP çağrıları, harcanan Fish kredisi, Postiz taslak sonucu.

## `<slug>.post.json`

```json
{
  "video": "videos/2026/10/surum-v2.58.0.mp4",
  "text": "Buffer taslağının metni (FB / IG / YouTube açıklaması)",
  "threadsText": "Threads için en fazla 500 karakter, en fazla 1 hashtag",
  "title": "YouTube ve Facebook video başlığı #Shorts",
  "bufferPostId": "6ad11b4a180e27ff0b0854d0"
}
```

## Bilinen tuhaflıklar

- Threads 500 karakter sınırı koyar; uzun metin reddedilir.
- Instagram ve Threads videoyu önce işler, yayın 1-2 dk gecikir.
- Postiz'in Threads bağlantı adresi `threads.net` ile başlar ve izin ekranı açılmaz; yeniden bağlamak gerekirse aynı adresi `threads.com/oauth/authorize?...&response_type=code` olarak açmak çalışır.
