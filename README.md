# Maheen's Photobooth ♡

A tiny, dependency-free photobooth web app: live filters, cute & retro modes, print layouts, stickers, cats, and matcha/hazelnut lattes.

## Run locally

```sh
python -m http.server 8000
# then open http://localhost:8000
```

The camera needs `https://` or `localhost`. On a phone, open the hosted (https) link.

## Deploy on Vercel (so it works on her phone)

It's a plain static site: there's no build step, and `vercel.json` handles the headers (camera permission, service-worker caching, manifest type).

- **Dashboard:** push this repo to GitHub, then in Vercel go to **Add New → Project → Import**. Set Framework Preset: **Other**, and leave Build Command and Output Directory empty. Deploy.
- **CLI:** `npm i -g vercel`, then run `vercel` (preview) or `vercel --prod` from this folder.

Open the `https://….vercel.app` link on the phone and use "Add to Home Screen" to install it like an app. It works offline after the first visit.

## Features

- **Cute mode / Retro mode.** Retro restyles the whole site (wooden TV, film-leader countdown, cats in sunglasses).
- **53 filters in 4 tabs:**
  - **♡ Cute** (13): Matcha, Hazelnut, Strawberry Milk, Dreamy, duotones…
  - **☀ Natural** (13): Vivid, Warm, Cool, Golden Hour, Soft Skin, Crisp, Fade, Moody, Mono…
  - **📷 Dazz** (16): D Classic, CPM 35, Inst C, GR F, NT 16, 135 NE (film border), HOGA (soft edges), KV 88 (camcorder), D Exp (expired film), Kino 800 (red halation), 1998 (flash + date stamp)…
  - **📼 Retro** (11): Disposable '98, VHS, Super 8, Polaroid '72, Game Boy, Riso…
- **10 layouts:** Classic / Trio / Twin strips, Polaroid, Heart, Grid of 4, Big & Little, Film Roll, Six Pack, Postcard.
- **9 frame colours**, auto-placed die-cut stickers (shuffle-able) and a caption.
- After shooting you can still change the filter, frame, stickers and caption.
- **Customise stickers:** after shooting, add your own from a tray of 13 (Miso, Gina, Blackie, strawberry & raspberry matcha, hazelnut latte, hearts, bows…).
  - Drag them anywhere on the photo.
  - Resize and rotate with the sliders, or resize with the mouse wheel.
  - Copy, bring to front, or remove (the <kbd>Delete</kbd> key works too).
  - Placed stickers are included in the saved and shared photo.
- **The cats:** **Miso** (light orange tabby), **Gina** (sleepy white Persian, with blue eyes when she wakes up), and **Blackie** (the black cat peeking over the camera, whose eyes follow your cursor). Tap them to see what they say.
- **Saved in Cache Storage** (`maheen-photos-v1`) automatically; browse, share, or delete them in the album.
- **WhatsApp:** on phones, the native share sheet opens with the photo attached. On desktop, the photo downloads and WhatsApp opens so you can attach it.
- No camera? Pick photos from the gallery instead.
- Secrets: click the cats and lattes, and type `meow`.
