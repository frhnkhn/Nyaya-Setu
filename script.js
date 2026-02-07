
// Import Firebase functions from the CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDoc, doc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ==========================================
// ⚠️ CONFIGURATION (REPLACE WITH YOUR KEYS)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDaceQvQpUMMe_7RIZEJbdv3XixiHPctk0",
  authDomain: "nyaya-setu-2008d.firebaseapp.com",
  projectId: "nyaya-setu-2008d",
  storageBucket: "nyaya-setu-2008d.firebasestorage.app",
  messagingSenderId: "474293761029",
  appId: "1:474293761029:web:3110ff4fcb11c3631ed86c",
  measurementId: "G-WJYLDTDCQZ"
};

const GEMINI_API_KEY = "AIzaSyAdhGyFGC3LCbK-XWxso69fwfQliFYy1hY"; // Get from aistudio.google.com

// Initialize Firebase
let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization failed. Check your config keys.", error);
    // Graceful degradation for UI testing if firebase fails
}

// ==========================================
// 🌗 THEME TOGGLE LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
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
        themeToggle.addEventListener('click', () => {
            if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                if(icon) icon.className = 'ri-moon-line';
            } else {
                body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                if(icon) icon.className = 'ri-sun-line';
            }
        });
    }

    // ==========================================
    // 📱 UI UTILS (Mobile Menu)
    // ==========================================
    const menuBtn = document.getElementById('menuBtn');
    const navLinks = document.getElementById('navLinks');
    
    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = menuBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.className = 'ri-close-line';
            } else {
                icon.className = 'ri-menu-line';
            }
        });
    }
});

// ==========================================
// 🔍 RIGHTS SEARCH LOGIC
// ==========================================
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

// ==========================================
// 🤖 AI LEGAL ASSISTANT LOGIC (Gemini API)
// ==========================================
window.getAIResponse = async function(userPrompt) {
    if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
        return "⚠️ Error: API Key not configured. Please add your Gemini API Key in script.js.";
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    // System instruction to ensure ethical boundaries
    const systemPrompt = `You are NyayaSahayak, a legal assistant for India. 
    1. Answer queries based on Indian Law (Constitution, BNS, etc.).
    2. Keep answers simple, summarized, and educational.
    3. STRICTLY NO ADVICE: Do not say "You should do X". Say "Under Section X, the law states...".
    4. If a crime is serious (murder, assault), strictly advise contacting police/lawyer immediately.
    5. Be polite and empathetic.`;

    const payload = {
        contents: [{
            parts: [{ text: systemPrompt + "\n\nUser Question: " + userPrompt }]
        }]
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }
        
        return data.candidates[0].content.parts[0].text;

    } catch (error) {
        console.error("AI Error:", error);
        return "I apologize, but I'm unable to process your request right now. Please try again later.";
    }
};

// ==========================================
// ⚖️ DISPUTE RESOLUTION LOGIC
// ==========================================

// Helper: Calculate Case Severity
function classifyDispute(category, amount) {
    const seriousCategories = ['theft', 'assault', 'harassment'];
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

// Helper: Generate Case ID
function generateCaseID() {
    return 'NS-' + Math.floor(100000 + Math.random() * 900000);
}

// Handle Form Submission
const disputeForm = document.getElementById('disputeForm');
if (disputeForm) {
    disputeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!db) {
            alert("Firebase not configured! Check console.");
            return;
        }

        const submitBtn = disputeForm.querySelector('button');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        const name = document.getElementById('name').value;
        const category = document.getElementById('category').value;
        const desc = document.getElementById('description').value;
        const amount = Number(document.getElementById('amount').value) || 0;

        const classification = classifyDispute(category, amount);
        const caseId = generateCaseID();

        const caseData = {
            caseId: caseId,
            name: name,
            category: category,
            description: desc,
            amount: amount,
            severity: classification.type,
            recommendation: classification.recommendation,
            status: classification.status,
            createdAt: new Date().toISOString()
        };

        try {
            // Save to Firestore
            await addDoc(collection(db, "disputes"), caseData);
            
            alert(`Dispute Filed Successfully!\nCase ID: ${caseId}\nStatus: ${classification.status}`);
            disputeForm.reset();
            window.location.href = 'status.html'; // Redirect to status page
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("Error submitting dispute. See console.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Dispute';
        }
    });
}

// ==========================================
// 🔍 TRACK STATUS LOGIC
// ==========================================
const trackBtn = document.getElementById('trackBtn');
if (trackBtn) {
    trackBtn.addEventListener('click', async () => {
        const inputId = document.getElementById('caseIdInput').value.trim();
        if (!inputId) return;

        if (!db) {
            alert("Firebase not configured!");
            return;
        }

        trackBtn.disabled = true;
        trackBtn.textContent = 'Searching...';

        try {
            const q = query(collection(db, "disputes"), where("caseId", "==", inputId));
            const querySnapshot = await getDocs(q);

            const resultDiv = document.getElementById('statusResult');
            
            if (querySnapshot.empty) {
                alert("Case ID not found.");
                resultDiv.style.display = 'none';
            } else {
                const docData = querySnapshot.docs[0].data();
                
                document.getElementById('resId').textContent = docData.caseId;
                document.getElementById('resCategory').textContent = docData.category.toUpperCase();
                document.getElementById('resDate').textContent = new Date(docData.createdAt).toLocaleDateString();
                document.getElementById('resAnalysis').textContent = docData.recommendation;
                
                const statusSpan = document.getElementById('resStatus');
                statusSpan.textContent = docData.status;
                
                // Color coding
                statusSpan.className = 'status-badge'; // reset
                if (docData.status === 'Escalated') statusSpan.classList.add('status-escalated');
                else if (docData.status === 'Resolved') statusSpan.classList.add('status-resolved');
                else statusSpan.classList.add('status-pending');

                resultDiv.style.display = 'block';
            }
        } catch (error) {
            console.error("Error fetching status:", error);
            alert("Error fetching status.");
        } finally {
            trackBtn.disabled = false;
            trackBtn.textContent = 'Track';
        }
    });
}