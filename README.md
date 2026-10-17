# SweGBG Lab

Lek med din sajt: verktyg från SweGBG som körs helt i webbläsaren. Inga filer laddas upp.

- **Intro-studion (Crink)** – ditt eget CRiNTRO-laddintro från din logga, live i dator och mobil.
- **Scrollfilm** – dra genom en H3-film (din egen mp4 eller en demo) som den spelas på sajten.
- **Sajt-preview** – din egen startsida (bransch, logga, tjänster, kontakt), live i dator/mobil, och nedladdningsbar som EN offline HTML-fil.

Live: https://lab.swegbg.com · Repo: SweGBG/swegbg-lab · Next.js 16 · Supabase (inloggning)

## Kör lokalt
```
npm install
npm run dev
```

## Supabase (inloggning + spara intron)
1. Supabase → SQL Editor → klistra in `supabase/lab.sql` → Run.
2. Authentication → URL Configuration: Site URL `https://lab.swegbg.com`,
   Redirect URLs `https://lab.swegbg.com/**` och `http://localhost:3000/**`.
3. Vercel → swegbg-lab → Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://bwqqqllxqiqyzkuzdwew.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon-nyckeln (Settings → API)
   Lägg aldrig `service_role`-nyckeln här.
4. Redeploy. Utan nycklarna fungerar Lab ändå, bara "Logga in" döljs.

Plus: ändra `plan` till `plus` för en användare i Table Editor → `lab_profiles`.

## Struktur
```
src/app/page.tsx                    skalet
src/components/lab/Lab.tsx          sidomeny + aktivt verktyg (#intro / #film)
src/components/lab/FileDrop.tsx     välj/släpp fil, läses lokalt
src/components/lab/Login.tsx        magisk länk
src/components/lab/tools/IntroStudio.tsx
src/components/lab/tools/CrintroPreview.tsx   samma laddintro som på kundsajterna
src/components/lab/tools/ScrollFilm.tsx
src/components/lab/tools/SitePreview.tsx      #sajt
src/lib/sitegen.ts                  bygger hela HTML-filen (ingen extern kod, loggan inbäddad en gång)
src/lib/logo.ts                     ta bort bakgrund, beskär, rund/ruta-ram
src/lib/frames.ts                   mp4 → rutor i webbläsaren, texture streaming
src/lib/palette.ts                  färger ur loggan
src/lib/rules.ts                    strecketsstilar + simulerade nät
public/demo/                        demofilmer (pizza, kol, protein) + exempellogga
```
