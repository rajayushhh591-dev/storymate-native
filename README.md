# StoryMate Native Android App + AI Backend

This package reuses the existing Flask/Gemini backend and adds a native Android chat UI.
APK builds happen online with GitHub Actions; Android Studio is not needed.

## Important architecture
- `android/` is the native Android app.
- `backend/` is your existing Flask/Gemini backend, adapted for cloud hosting.
- The Gemini API key stays on the backend. Never place it in Android code or commit `.env`.
- The APK needs a public HTTPS backend URL. `http://127.0.0.1:5000` only works on the same device and is not usable after installation.

## A. Put this project on GitHub
1. Create a new repository at https://github.com/new, e.g. `storymate-native`.
2. Upload the contents of this ZIP (the files inside the `storymate_native_apk` folder) to the repository root.
3. Do not upload any `.env` file or API key.

## B. Deploy the backend
This package includes `backend/` with `requirements.txt`, `app.py`, and `render.yaml`.
1. Create an account on a Python web hosting service that supports Flask/Gunicorn and connect the GitHub repository.
2. Set the service's Root Directory to `backend`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn app:app`
5. Add environment variables in the hosting dashboard:
   - `GEMINI_API_KEY` = your secret Gemini API key
   - `GEMINI_MODEL` = an exact model ID currently available to your API key
6. Deploy and copy the public HTTPS service URL, e.g. `https://your-service.example.com`.
7. Test the backend URL by opening `/` in a browser; it should show the StoryMate web page. AI chat calls use `/api/chat`.

Free hosting may sleep when idle, so the first request can take a while. Gemini 503 errors are upstream model capacity errors and can still happen; the app will show the returned error.

## C. Set the backend URL in GitHub
1. In your GitHub repository, open Settings → Secrets and variables → Actions → Variables.
2. Add a repository variable named `API_BASE_URL`.
3. Its value is the backend HTTPS URL without a trailing slash, e.g. `https://your-service.example.com`.

## D. Build the APK online
1. Open the repository's Actions tab.
2. Choose `Build StoryMate APK`.
3. Tap `Run workflow` if it is not already running. You can also push any commit to `main` to trigger it.
4. Wait for the workflow to finish with a green check.
5. Open the completed workflow run, scroll to Artifacts, and download `storymate-debug-apk`.
6. Extract the downloaded artifact ZIP; inside is `app-debug.apk`. Tap it to install. Android may ask you to allow installs from your browser/files app.

## E. If the APK says backend URL is missing
Check that the `API_BASE_URL` repository variable is set, then run the workflow again.

## API key safety
- Never commit `.env`, API keys, or service credentials.
- Never embed the Gemini API key in the Android APK. APKs can be inspected by other people.
- A debug APK is for testing. A public release should use a stable backend and a release signing key.
