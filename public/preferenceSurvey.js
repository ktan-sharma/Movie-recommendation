import { db } from './firebase-config.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama',
  'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance',
  'Science Fiction', 'TV Movie', 'Thriller', 'War', 'Western'
];
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'zh', name: 'Chinese' },
];

function showPreferenceSurvey() {
  if (document.getElementById('preferenceSurveyModal')) return;
  const modal = document.createElement('div');
  modal.id = 'preferenceSurveyModal';
  modal.innerHTML = `
    <div class="survey-modal-bg"></div>
    <div class="survey-modal-content">
      <h2>Personalize Your Experience</h2>
      <form id="surveyForm">
        <label>Pick your favorite genres:</label>
        <div class="survey-genres">
          ${GENRES.map(g => `<label><input type="checkbox" name="genres" value="${g}"> ${g}</label>`).join('')}
        </div>
        <label>Preferred language:</label>
        <select name="language" required>
          <option value="">Select...</option>
          ${LANGUAGES.map(l => `<option value="${l.code}">${l.name}</option>`).join('')}
        </select>
        <div class="survey-actions">
          <button type="submit">Save Preferences</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  document.getElementById('surveyForm').onsubmit = async (e) => {
    e.preventDefault();
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    const genres = Array.from(document.querySelectorAll('input[name="genres"]:checked')).map(i => i.value);
    const language = document.querySelector('select[name="language"]').value;
    await setDoc(doc(db, 'users', user.uid), { preferences: { genres, language } }, { merge: true });
    document.body.removeChild(modal);
    document.body.style.overflow = '';
    window.dispatchEvent(new CustomEvent('preferencesSaved'));
  };
}

export async function maybeShowSurvey() {
  const auth = getAuth();
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const prefs = userDoc.exists() && userDoc.data().preferences;
    if (!prefs || !prefs.genres || !prefs.language) {
      showPreferenceSurvey();
    }
  });
}

document.addEventListener('DOMContentLoaded', maybeShowSurvey);
