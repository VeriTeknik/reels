# Haftalık reel hattı

Pazar 20:45 (TSİ) koşan zamanlanmış görevin yaptığı iş.

1. Buffer (org `6888f5e649f7b6ba27236704`) Instagram kanalındaki (`6888f667cdb92dce1998581f`) **taslakları** listeler. Videosu olmayan, yalnız görsel taşıyan taslaklar işlenir; en fazla 2 tane, en yenisi önce.
2. Her taslak için konuya uyan **salt okunur** bir VeriTeknik MCP çağrısı yapılır (yalnız `test-lab-01` üzerinde; `inspect_server`, `read_server_log`, `check_backups`, `get_dns_zone` gibi). Sunucuda değişiklik yapan araç çağrılmaz. Çıktıda IP adreslerinin son iki hanesi gizlenir.
   Konu bir MCP çağrısıyla gösterilemiyorsa (ör. faturalama yenilikleri) çağrı yapılmaz ve "Gerçek çağrı" dipnotu konmaz; video taslaktaki maddelerden metin kartlarıyla kurulur. Uydurma çıktı gösterilmez.
3. 20-30 sn'lik Türkçe seslendirme metni yazılır (taslakla aynı olgular, yeni iddia yok). Telaffuz: MCP → "Emsipi", Claude → "Klod", fail2ban → "fail-tu-ben". Fish Audio, ses `241fac3c0dd14046a1f31816d9cdcc6d` ("TÜRKÇE ERKEK SES"), çağrı başına ≤500 bayt.
4. `reel.html` şablonu doldurulur, `render.mjs` ile 1080x1920 MP4 üretilir; altyazılar sesteki duraklamalardan (ffmpeg `silencedetect`) zamanlanır.
5. Video `videos/YYYY/MM/<slug>.mp4` olarak bu depoya itilir; Buffer taslağına `https://raw.githubusercontent.com/VeriTeknik/reels/main/...` adresiyle video eklenir, taslak `reel` tipine çevrilir. Görsel taslak silinmez; hiçbir şey yayınlanmaz veya kuyruğa alınmaz.
6. Özet: işlenen taslaklar, yapılan MCP çağrıları, harcanan Fish kredisi, video linkleri.
