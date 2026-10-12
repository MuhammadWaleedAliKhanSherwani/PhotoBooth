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
- **24 filters:** 13 cute (Matcha, Hazelnut, Strawberry Milk, Dreamy, duotones…) and 11 retro (Disposable '98 with date stamp, VHS, Super 8, Polaroid '72, Game Boy, Riso…).
- **10 layouts:** Classic / Trio / Twin strips, Polaroid, Heart, Grid of 4, Big & Little, Film Roll, Six Pack, Postcard.
- **9 frame colours**, auto-placed die-cut stickers (shuffle-able) and a caption.
- After shooting you can still change the filter, frame, stickers and caption.
- **Saved in Cache Storage** (`maheen-photos-v1`) automatically; browse, share, or delete them in the album.
- **WhatsApp:** on phones, the native share sheet opens with the photo attached. On desktop, the photo downloads and WhatsApp opens so you can attach it.
- No camera? Pick photos from the gallery instead.
- Secrets: click the cats and lattes, and type `meow`.
