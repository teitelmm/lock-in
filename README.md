# 🔒 Lock In

Lock In helps you study faster:

- **Study sets**: upload a PowerPoint, PDF, Word doc, photos of your notes, or pasted text. AI turns it into flashcards and a practice quiz built only from your material.
- **Four ways to study each set**:
  - **Quiz**: one question at a time with instant feedback and explanations, then "retry the ones I missed".
  - **Flashcards**: flip each card and sort it into *know it* or *still learning*, then do another round with only the missed cards.
  - **Speed Round**: answer as many multiple-choice questions as you can in 60 seconds. A streak multiplier goes up to ×4, and your high score is saved.
  - **Falling Words**: a definition falls toward the ground and you type the term before it lands. Small typos are OK. It speeds up as you score, and you have 3 lives.
- **Homework helper**: type the problem or snap a photo, then pick a mode:
  - **Tutor me**: works through it one step at a time and gives hints instead of the answer. There's a "Just show me the answer" button if you're done.
  - **Steps + answer**: numbered worked steps and a clear final answer. You can ask follow-up questions after.
- A day streak and weekly session count on your dashboard.

Built with Next.js 15, Tailwind CSS, Supabase (sign-in, database, file storage), and the Claude API.

## Use it inside Claude (no setup)

`artifact/lock-in.html` is a single-page version of Lock In published as a Claude Artifact:
https://claude.ai/artifact/3ChkGLRPfxmizycsqMtJww

It has the same study sets, games and homework helper. Instead of an API key and Supabase, it asks Claude through your own claude.ai account, and saves your sets and homework in the page's private storage. To change it, edit that file and republish it to the same artifact.

## Setup

You need Node.js 20+ and two free accounts:

- **Anthropic API key**: create one at https://console.anthropic.com/settings/keys. You pay per use; making a study set from a typical slide deck costs a few cents.
- **Supabase project**: create one at https://supabase.com/dashboard.

Then:

1. **Install the dependencies**
   ```bash
   npm install
   ```
2. **Add your keys.** Copy `.env.example` to `.env.local`, then fill in:
   - `ANTHROPIC_API_KEY`: your Anthropic key.
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: in Supabase, go to **Project Settings → API**.
3. **Create the database tables.** In Supabase, open **SQL Editor**, paste in all of `supabase/migrations/0001_init.sql`, and click **Run**. This creates:
   - the tables
   - the security rules that keep each user's data private
   - the private `uploads` storage bucket
4. **Set up sign-in.** In Supabase, go to **Authentication → URL Configuration**:
   - Set **Site URL** to `http://localhost:3000` (later, your real site address).
   - Add `http://localhost:3000/auth/callback` to **Redirect URLs**.
   - Email sign-up works out of the box.
   - For "Continue with Google", turn on the Google provider under **Authentication → Providers**.
5. **Run it**
   ```bash
   npm run dev
   ```
   Then open http://localhost:3000.

### Put it online (Vercel)

1. Import the GitHub repo at https://vercel.com/new.
2. Add the same three environment variables.
3. Deploy.
4. In Supabase, add your Vercel address (`https://your-app.vercel.app`) as the Site URL, and add `https://your-app.vercel.app/auth/callback` as a redirect URL.

Generating a study set from a big deck can take a minute or more. The API routes ask for up to 300 seconds (`maxDuration`), but Vercel's Hobby plan may cut them off sooner. If that happens, split large decks into smaller uploads.

## Supported files

| File | How it's read |
| --- | --- |
| `.pptx` | Slide text and speaker notes are extracted. Slides that are only pictures have no text, so export those as PDF instead. |
| `.pdf` | Sent to Claude as-is, so it sees text, diagrams, and charts. Up to 22 MB. |
| `.docx`, `.txt`, `.md` | Text is extracted. |
| Photos (`.jpg`, `.png`, `.webp`, `.gif`) | Sent as images. Big phone photos are shrunk in the browser before uploading. |

Older `.ppt` and `.doc` files aren't supported. Re-save them as `.pptx`/`.docx` or PDF.

## Development

```bash
npm run dev        # start the app
npm test           # unit tests (file extraction, answer matching, scoring, streaks)
npm run lint
npm run typecheck
npm run build
```

### Where things are

```
app/
  api/sets/generate/          upload → extract → Claude (structured output) → save set
  api/homework/[id]/reply/    streams the tutor / solver reply, saves the chat
  dashboard/  sets/  homework/  login/  auth/
components/games/             QuizRunner, Flashcards, SpeedRound, FallingWords
lib/
  anthropic.ts                Claude client, model, refusal fallback, error messages
  extract.ts                  pptx/docx/txt → text; pdf/images → native content blocks
  prompts.ts                  system prompts for the generator, tutor and solver
  schemas.ts                  zod schema for study sets + cleanup of malformed items
  match.ts                    forgiving answer matching (case, punctuation, small typos)
supabase/migrations/          database schema + row-level security
```

- Uploads go straight from the browser to Supabase Storage. This avoids server upload size limits. The server then reads the file back using the signed-in user's own permissions.
- Every table has row-level security, so each user can only read and write their own rows and their own `uploads/<user id>/` folder.
- The Claude API key is only used on the server.
