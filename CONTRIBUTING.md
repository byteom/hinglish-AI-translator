🔧 Contribution Highlights
1. 🧠 Tone Selector (Formal / Informal Translation)
Added a dropdown toggle for users to choose translation tone.

Passed tone preference to the AI translation logic (extensible for backend/API).

✅ Enhances user personalization and tone sensitivity.

2. 💡 Grammar Explanation Mode
Introduced a new “Explain This” button.

Displays basic grammar structure (tense, subject, object) using simple logic.

Helps language learners understand grammar behind Hinglish sentences.

3. ⚙️ Offline Fallback Logic
Added a fallback mechanism when AI/LLM is unavailable.

Checks for common Hinglish phrases and provides static translations.

Ensures reliability even without network or API.

4. 🧼 Code-Mixed Hinglish Cleanup
Implemented utility to clean inputs like “school gaya tha” or “मैं school गया” by:

Removing extra symbols or mixing

Preparing input for better AI translation

Tackles a real-world linguistic issue in Hinglish use.

5. 🎨 UI/UX Enhancements
Improved popup.html with:

Proper layout

Responsive input/output areas

Clear user interaction for toggles and buttons

Fully usable in small Chrome extension popups.

