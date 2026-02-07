
// Import Firebase functions from the CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDoc, doc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
// Import Google GenAI SDK from CDN for browser compatibility
import { GoogleGenAI } from "https://esm.run/@google/genai";

// ==========================================
// ⚠️ CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBXKgYdBV4h0kSC1hMgkqRNYjJAhsARcD4",
  authDomain: "nyaya-setu-50eb1.firebaseapp.com",
  projectId: "nyaya-setu-50eb1",
  storageBucket: "nyaya-setu-50eb1.firebasestorage.app",
  messagingSenderId: "428218878468",
  appId: "1:428218878468:web:1a54ff346fe068b1218351",
  measurementId: "G-YJQQGQC8Q0"
};

// Initialize Firebase
let db;
let storage;
let auth;

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    
    // Sign in anonymously to bypass "allow read/write if auth != null" rules
    signInAnonymously(auth).then(() => {
        console.log("Firebase: Signed in anonymously");
    }).catch((error) => {
        console.error("Firebase Auth Error:", error);
    });

    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization failed. Check your config keys.", error);
}

// ==========================================
// 🚀 APP INITIALIZATION
// ==========================================
function initApp() {
    // --- Theme Toggle Logic ---
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const icon = themeToggle ? themeToggle.querySelector('i') : null;

    // Check saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        if(icon) icon.className = 'ri-sun-line';
    }

    if (themeToggle) {
        themeToggle.onclick = () => {
            if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                if(icon) icon.className = 'ri-moon-line';
            } else {
                body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                if(icon) icon.className = 'ri-sun-line';
            }
        };
    }

    // --- Mobile Menu Logic ---
    const menuBtn = document.getElementById('menuBtn');
    const navLinks = document.getElementById('navLinks');
    
    if (menuBtn && navLinks) {
        menuBtn.onclick = () => {
            navLinks.classList.toggle('active');
            const icon = menuBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.className = 'ri-close-line';
            } else {
                icon.className = 'ri-menu-line';
            }
        };
    }

    // --- Rights Search Logic ---
    const rightsSearch = document.getElementById('rightsSearch');
    if (rightsSearch) {
        rightsSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.card');

            cards.forEach(card => {
                const title = card.querySelector('h3') ? card.querySelector('h3').textContent.toLowerCase() : '';
                const desc = card.querySelector('p') ? card.querySelector('p').textContent.toLowerCase() : '';
                const badge = card.querySelector('.card-badge') ? card.querySelector('.card-badge').textContent.toLowerCase() : '';

                if (title.includes(searchTerm) || desc.includes(searchTerm) || badge.includes(searchTerm)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // --- Dispute Form Logic ---
    const disputeForm = document.getElementById('disputeForm');
    if (disputeForm) {
        // Copy Button Logic
        const copyBtn = document.getElementById('copyIdBtn');
        if(copyBtn) {
            copyBtn.onclick = () => {
                const idText = document.getElementById('displayCaseId').innerText;
                navigator.clipboard.writeText(idText);
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="ri-check-line"></i> Copied';
                setTimeout(() => { copyBtn.innerHTML = originalText; }, 2000);
            };
        }

        disputeForm.onsubmit = async (e) => {
            e.preventDefault();
            
            if (!db || !storage) {
                alert("Firebase not configured properly! Check console.");
                return;
            }

            const submitBtn = disputeForm.querySelector('button');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';

            try {
                // Ensure auth is ready
                if (!auth.currentUser) {
                    await signInAnonymously(auth);
                }

                // Collect all form data
                const name = document.getElementById('name').value;
                const email = document.getElementById('email').value;
                const phone = document.getElementById('phone').value;
                const city = document.getElementById('city').value;
                
                const respondentName = document.getElementById('respondentName').value;
                const respondentContact = document.getElementById('respondentContact').value;
                
                const category = document.getElementById('category').value;
                const amount = Number(document.getElementById('amount').value) || 0;
                const date = document.getElementById('date').value;
                const desc = document.getElementById('description').value;

                const classification = classifyDispute(category, amount);
                const caseId = generateCaseID();

                // 1. Handle File Upload (Firebase Storage)
                let evidenceUrl = null;
                const fileInput = document.getElementById('evidenceFile');
                if (fileInput.files && fileInput.files.length > 0) {
                    submitBtn.textContent = 'Uploading Evidence...';
                    const file = fileInput.files[0];
                    // Create reference: evidence/CASE-ID/filename
                    const storageRef = ref(storage, `evidence/${caseId}/${file.name}`);
                    await uploadBytes(storageRef, file);
                    evidenceUrl = await getDownloadURL(storageRef);
                }

                // 2. Prepare Data for Firestore
                const caseData = {
                    caseId: caseId,
                    claimant: { name, email, phone, city },
                    respondent: { name: respondentName, contact: respondentContact },
                    incident: { category, amount, date, description: desc },
                    evidenceUrl: evidenceUrl, // URL from Storage
                    severity: classification.type,
                    recommendation: classification.recommendation,
                    status: classification.status,
                    createdAt: new Date().toISOString(),
                    uid: auth.currentUser ? auth.currentUser.uid : 'anonymous'
                };

                // 3. Save to Firestore
                submitBtn.textContent = 'Finalizing...';
                await addDoc(collection(db, "disputes"), caseData);
                
                // 4. Update UI to Show Success Screen
                document.getElementById('formWrapper').style.display = 'none';
                document.getElementById('displayCaseId').innerText = caseId;
                document.getElementById('successMessage').style.display = 'block';
                
            } catch (error) {
                console.error("Error submitting dispute: ", error);
                if (error.code === 'permission-denied') {
                    alert("Permission Denied: Please check your Firebase Firestore and Storage Security Rules in the Firebase Console.");
                } else {
                    alert("Error submitting dispute: " + error.message);
                }
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Dispute';
            }
        };
    }

    // --- Track Status Logic ---
    const trackBtn = document.getElementById('trackBtn');
    if (trackBtn) {
        trackBtn.onclick = async () => {
            const inputId = document.getElementById('caseIdInput').value.trim();
            if (!inputId) return;

            if (!db) {
                alert("Firebase not configured!");
                return;
            }

            trackBtn.disabled = true;
            trackBtn.textContent = 'Searching...';

            try {
                 // Ensure auth is ready
                if (!auth.currentUser) {
                    await signInAnonymously(auth);
                }

                // Query Firestore for the Case ID
                const q = query(collection(db, "disputes"), where("caseId", "==", inputId));
                const querySnapshot = await getDocs(q);

                const resultDiv = document.getElementById('statusResult');
                
                if (querySnapshot.empty) {
                    alert("Case ID not found. Please check and try again.");
                    resultDiv.style.display = 'none';
                } else {
                    const docData = querySnapshot.docs[0].data();
                    
                    document.getElementById('resId').textContent = docData.caseId;
                    
                    const category = docData.incident ? docData.incident.category : docData.category;
                    document.getElementById('resCategory').textContent = category ? category.toUpperCase() : 'N/A';
                    
                    document.getElementById('resDate').textContent = new Date(docData.createdAt).toLocaleDateString();
                    document.getElementById('resAnalysis').textContent = docData.recommendation;
                    
                    const statusSpan = document.getElementById('resStatus');
                    statusSpan.textContent = docData.status;
                    
                    // Color coding
                    statusSpan.className = 'status-badge'; 
                    if (docData.status === 'Escalated') statusSpan.classList.add('status-escalated');
                    else if (docData.status === 'Resolved') statusSpan.classList.add('status-resolved');
                    else statusSpan.classList.add('status-pending');

                    // Show/Hide Evidence Button
                    const evidenceContainer = document.getElementById('evidenceContainer');
                    const viewBtn = document.getElementById('viewEvidenceBtn');
                    
                    if (evidenceContainer && viewBtn) {
                        if (docData.evidenceUrl) {
                            evidenceContainer.style.display = 'block';
                            viewBtn.onclick = () => {
                                window.open(docData.evidenceUrl, '_blank');
                            };
                        } else {
                            evidenceContainer.style.display = 'none';
                        }
                    }

                    resultDiv.style.display = 'block';
                }
            } catch (error) {
                console.error("Error fetching status:", error);
                 if (error.code === 'permission-denied') {
                    alert("Permission Denied: Please check your Firebase Firestore Rules.");
                } else {
                    alert("Error fetching status.");
                }
            } finally {
                trackBtn.disabled = false;
                trackBtn.textContent = 'Track';
            }
        };
    }
}

// Check if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ==========================================
// 🤖 AI LEGAL ASSISTANT LOGIC (Gemini SDK)
// ==========================================
window.getAIResponse = async function(userPrompt) {
    const systemPrompt = `You are NyayaSahayak, a legal assistant for India. 
    1. Answer queries based on Indian Law (Constitution, BNS, etc.).
    2. Keep answers simple, summarized, and educational.
    3. STRICTLY NO ADVICE: Do not say "You should do X". Say "Under Section X, the law states...".
    4. If a crime is serious (murder, assault), strictly advise contacting police/lawyer immediately.
    5. Be polite and empathetic.`;

    try {
        // Initialize Gemini AI lazily to avoid top-level environment errors
        // WARNING: Storing API keys in client-side code is insecure. Prefer a server-side
        // proxy that holds the key and forwards requests to the Gemini API.
         const ai = new GoogleGenAI({ apiKey: "AIzaSyBrhsFJ51WxJwBQYIiF1jTMBpvwbXmkfIE" });
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: userPrompt,
            config: {
                systemInstruction: systemPrompt
            }
        });

        return response.text;

    } catch (error) {
        console.error("AI Error:", error);
        return "I apologize, but I'm unable to process your request right now. Please check your connection or try again later.";
    }
};

// ==========================================
// ⚖️ DISPUTE HELPER FUNCTIONS
// ==========================================

function classifyDispute(category, amount) {
    const seriousCategories = ['theft', 'assault', 'harassment', 'cyber'];
    const highValueThreshold = 500000; // 5 Lakhs

    if (seriousCategories.includes(category)) {
        return {
            type: 'Serious',
            recommendation: 'Escalated to Legal Authorities. Please visit nearest Police Station.',
            status: 'Escalated'
        };
    } else if (amount > highValueThreshold) {
        return {
            type: 'Moderate-High',
            recommendation: 'Civil Court Filing Recommended due to high value.',
            status: 'Pending Legal Review'
        };
    } else {
        return {
            type: 'Minor',
            recommendation: 'Eligible for Online Mediation (Lok Adalat/ADR).',
            status: 'Under Mediation'
        };
    }
}

function generateCaseID() {
    // Generate a unique-ish ID: NS-TIMESTAMP-RANDOM
    // Used timestamp to ensure better uniqueness than just random
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return 'NS-' + Date.now().toString().slice(-6) + randomPart;
}
