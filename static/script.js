document.addEventListener('DOMContentLoaded', function() {
    // --- UI Element References ---
    const diseaseTypeSelect = document.getElementById('diseaseType');
    const diabetesFormSection = document.getElementById('diabetesFormSection');
    const heartDiseaseFormSection = document.getElementById('heartDiseaseFormSection');
    const predictionResultDiv = document.getElementById('predictionResult');
    const diabetesPredictionForm = document.getElementById('diabetesPredictionForm');
    
    // Elements for Health Insights (Gemini API)
    const healthQuestionInput = document.getElementById('healthQuestion');
    const getInsightButton = document.getElementById('getInsightButton');
    const insightResultContainer = document.getElementById('insightResultContainer');

    // Elements for Prediction History (Firebase)
    const loginPromptDiv = document.getElementById('loginPrompt');
    const anonLoginBtn = document.getElementById('anonLoginBtn');
    const historyListDiv = document.getElementById('historyList');
    const noHistoryMessage = document.querySelector('.no-history-message');

    // Elements for Authentication Modal
    const loginNavLink = document.getElementById('loginNavLink');
    const logoutNavLink = document.getElementById('logoutNavLink');
    const authModal = document.getElementById('authModal');
    const closeAuthModalBtn = document.querySelector('.close-auth-modal');
    const showLoginTabBtn = document.getElementById('showLoginTab');
    const showSignupTabBtn = document.getElementById('showSignupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginEmailInput = document.getElementById('loginEmail');
    const loginPasswordInput = document.getElementById('loginPassword');
    const signupEmailInput = document.getElementById('signupEmail');
    const signupPasswordInput = document.getElementById('signupPassword');

    let heartDiseasePredictionForm = null; // This will hold the reference to the dynamically created form

    // --- Firebase Configuration (IMPORTANT: These are your confirmed values) ---
    const firebaseConfig = {
        apiKey: "AIzaSyCowxZFnmgcDkHNwwnahw4Tvat0IgAyQ-Y",
        authDomain: "diabetes-prediction-f0a3b.firebaseapp.com",
        projectId: "diabetes-prediction-f0a3b",
        storageBucket: "diabetes-prediction-f0a3b.firebasestorage.app",
        messagingSenderId: "717769556705",
        appId: "1:717769556705:web:990820cd33dd6feae92da0"
    };

    // Initialize Firebase
    let app, auth, db, userId;
    let isFirebaseReady = false; // Flag to indicate if Firebase is initialized and user state is checked

    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();

        // --- Firebase Auth State Listener ---
        auth.onAuthStateChanged(user => {
            if (user) {
                userId = user.uid;
                console.log("Firebase User ID:", userId);
                loginPromptDiv.classList.add('hidden'); // Hide login prompt
                historyListDiv.classList.remove('hidden'); // Show history list
                loginNavLink.classList.add('hidden'); // Hide login button in navbar
                logoutNavLink.classList.remove('hidden'); // Show logout button in navbar
                isFirebaseReady = true;
                fetchPredictionHistory(); // Fetch history for the logged-in user
                authModal.classList.remove('visible'); // Hide auth modal if user logs in
            } else {
                console.log("No Firebase user logged in.");
                userId = null;
                loginPromptDiv.classList.remove('hidden'); // Show login prompt
                historyListDiv.classList.add('hidden'); // Hide history list
                loginNavLink.classList.remove('hidden'); // Show login button in navbar
                logoutNavLink.classList.add('hidden'); // Hide logout button in navbar
                isFirebaseReady = false;
                historyListDiv.innerHTML = ''; // Clear history when logged out
                noHistoryMessage.classList.remove('hidden'); // Show no history message
                historyListDiv.appendChild(noHistoryMessage);
            }
        });
    } catch (error) {
        console.error("Firebase initialization error:", error);
        loginPromptDiv.innerHTML = `<p style="color: red;">Error initializing Firebase. History feature unavailable.</p>`;
        loginPromptDiv.classList.remove('hidden');
        historyListDiv.classList.add('hidden');
    }

    // --- Helper Functions for UI ---

    function showSpinner(element) {
        const spinner = element.querySelector('.loading-spinner');
        if (spinner) {
            spinner.style.display = 'block';
            element.classList.add('loading-state'); // Optional: add a class for styling
        }
    }

    function hideSpinner(element) {
        const spinner = element.querySelector('.loading-spinner');
        if (spinner) {
            spinner.style.display = 'none';
            element.classList.remove('loading-state');
        }
    }

    // Custom Message Box (replaces alert/confirm)
    function displayMessageBox(message, type = 'info') {
        const messageBox = document.createElement('div');
        messageBox.classList.add('message-box', type);
        messageBox.innerHTML = `<p>${message}</p><button class="close-message">OK</button>`;
        document.body.appendChild(messageBox);

        messageBox.querySelector('.close-message').addEventListener('click', () => {
            messageBox.remove();
        });

        if (type === 'info' || type === 'success') {
            setTimeout(() => {
                messageBox.remove();
            }, 5000);
        }
    }

    // Define Heart Disease fields and their properties for dynamic generation
    const heartDiseaseFields = [
        { id: 'hd_age', label: 'Age:', type: 'number', min: 0, max: 120, step: 1, required: true },
        { id: 'hd_sex', label: 'Sex:', type: 'select', options: [{value: '1', text: 'Male'}, {value: '0', text: 'Female'}], required: true },
        { id: 'hd_cp', label: 'Chest Pain Type:', type: 'select', options: [{value: '0', text: 'Typical Angina'}, {value: '1', text: 'Atypical Angina'}, {value: '2', text: 'Non-anginal Pain'}, {value: '3', text: 'Asymptomatic'}], required: true },
        { id: 'hd_trestbps', label: 'Resting Blood Pressure (mm Hg):', type: 'number', min: 80, max: 200, step: 1, required: true },
        { id: 'hd_chol', label: 'Serum Cholesterol (mg/dl):', type: 'number', min: 100, max: 600, step: 1, required: true },
        { id: 'hd_fbs', label: 'Fasting Blood Sugar (>120 mg/dl):', type: 'select', options: [{value: '0', text: 'No'}, {value: '1', text: 'Yes'}], required: true },
        { id: 'hd_restecg', label: 'Resting Electrocardiographic Results:', type: 'select', options: [{value: '0', text: 'Normal'}, {value: '1', text: 'ST-T Wave Abnormality'}, {value: '2', text: 'Left Ventricular Hypertrophy'}], required: true },
        { id: 'hd_thalach', label: 'Maximum Heart Rate Achieved:', type: 'number', min: 70, max: 220, step: 1, required: true },
        { id: 'hd_exang', label: 'Exercise Induced Angina:', type: 'select', options: [{value: '0', text: 'No'}, {value: '1', text: 'Yes'}], required: true },
        { id: 'hd_oldpeak', label: 'ST Depression Induced by Exercise:', type: 'number', min: 0, max: 7, step: 0.1, required: true },
        { id: 'hd_slope', label: 'Slope of the Peak Exercise ST Segment:', type: 'select', options: [{value: '0', text: 'Upsloping'}, {value: '1', text: 'Flat'}, {value: '2', text: 'Downsloping'}], required: true },
        { id: 'hd_ca', label: 'Number of Major Vessels (0-3):', type: 'select', options: [{value: '0', text: '0'}, {value: '1', text: '1'}, {value: '2', text: '2'}, {value: '3', text: '3'}, {value: '4', text: '4 (Unknown/Error)'}], required: true },
        { id: 'hd_thal', label: 'Thalassemia:', type: 'select', options: [{value: '0', text: 'Unknown'}, {value: '1', text: 'Normal'}, {value: '2', text: 'Fixed Defect'}, {value: '3', text: 'Reversable Defect'}], required: true }
    ];

    // Function to dynamically generate Heart Disease form fields
    function generateHeartDiseaseForm() {
        const formInnerHtml = heartDiseaseFields.map(field => {
            let inputElement;
            if (field.type === 'select') {
                const optionsHtml = field.options.map(option =>
                    `<option value="${option.value}">${option.text}</option>`
                ).join('');
                inputElement = `<select id="${field.id}" name="${field.id}" ${field.required ? 'required' : ''}>
                                    <option value="">Select ${field.label.replace(':', '')}</option>
                                    ${optionsHtml}
                                </select>`;
            } else {
                inputElement = `<input type="${field.type}" id="${field.id}" name="${field.id}"
                                   ${field.min !== undefined ? `min="${field.min}"` : ''}
                                   ${field.max !== undefined ? `max="${field.max}"` : ''}
                                   ${field.step !== undefined ? `step="${field.step}"` : ''}
                                   ${field.required ? 'required' : ''}>`;
            }
            return `
                <div class="form-group">
                    <label for="${field.id}">${field.label}</label>
                    ${inputElement}
                </div>
            `;
        }).join('');

        heartDiseaseFormSection.innerHTML = `
            <h3 class="card-title">Heart Disease Prediction</h3>
            <form id="heartDiseasePredictionForm">
                ${formInnerHtml}
                <button type="submit" class="submit-btn">Predict Heart Disease Risk</button>
            </form>
        `;
        heartDiseasePredictionForm = document.getElementById('heartDiseasePredictionForm');
        if (heartDiseasePredictionForm) {
            heartDiseasePredictionForm.addEventListener('submit', handlePredictionFormSubmit);
        }
    }

    // Function to show/hide form sections based on selection
    function showSelectedForm() {
        const selectedDisease = diseaseTypeSelect.value;
        predictionResultDiv.classList.remove('show');
        predictionResultDiv.classList.add('hidden'); // Ensure it's truly hidden
        predictionResultDiv.innerHTML = '';
        insightResultContainer.innerHTML = ''; // Clear previous insights
        insightResultContainer.classList.remove('show');
        
        // Re-add the initial insight input card if it was removed
        const insightsSection = document.getElementById('insights-section');
        if (!document.querySelector('.insight-input-card')) {
            const insightInputHtml = `
                <div class="form-section card-layout insight-input-card">
                    <h3 class="card-title">Ask a Question</h3>
                    <div class="form-group">
                        <label for="healthQuestion">Your Health Query:</label>
                        <textarea id="healthQuestion" placeholder="E.g., 'What are common symptoms of high blood sugar?' or 'Give me a healthy dinner recipe for heart health.'" rows="6"></textarea>
                    </div>
                    <button id="getInsightButton" class="submit-btn">Get Insight</button>
                </div>
            `;
            insightsSection.insertAdjacentHTML('afterbegin', insightInputHtml);
            // Re-attach event listener
            document.getElementById('getInsightButton').addEventListener('click', handleGetInsight);
        }


        if (selectedDisease === 'diabetes') {
            diabetesFormSection.classList.remove('hidden');
            heartDiseaseFormSection.classList.add('hidden');
        } else if (selectedDisease === 'heart_disease') {
            diabetesFormSection.classList.add('hidden');
            heartDiseaseFormSection.classList.remove('hidden');
            if (!heartDiseasePredictionForm || heartDiseasePredictionForm.innerHTML.trim() === '') {
                generateHeartDiseaseForm();
            }
        } else {
            diabetesFormSection.classList.add('hidden');
            heartDiseaseFormSection.classList.add('hidden');
        }
    }

    // --- Unified Function to Handle Form Submissions (Prediction) ---
    async function handlePredictionFormSubmit(event) {
        event.preventDefault();

        predictionResultDiv.classList.remove('hidden'); // Show result container
        predictionResultDiv.innerHTML = '<p>Predicting...</p>';
        showSpinner(predictionResultDiv);

        const form = event.target;
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        const diseaseType = diseaseTypeSelect.value;
        data['disease_type'] = diseaseType;

        // Convert specific values to numbers based on disease type and expected features
        if (diseaseType === 'diabetes') {
            data.age = parseFloat(data.age);
            data.bmi = parseFloat(data.bmi);
            data.HbA1c_level = parseFloat(data.HbA1c_level);
            data.blood_glucose_level = parseFloat(data.blood_glucose_level);
            data.hypertension = parseInt(data.hypertension);
            // Note: Use the correct ID for the heart_disease input in diabetes form
            data.heart_disease = parseInt(document.getElementById('heart_disease_input').value); 
        } else if (diseaseType === 'heart_disease') {
            data.hd_age = parseFloat(data.hd_age);
            data.hd_sex = parseInt(data.hd_sex);
            data.hd_cp = parseInt(data.hd_cp);
            data.hd_trestbps = parseFloat(data.hd_trestbps);
            data.hd_chol = parseFloat(data.hd_chol);
            data.hd_fbs = parseInt(data.hd_fbs);
            data.hd_restecg = parseInt(data.hd_restecg);
            data.hd_thalach = parseFloat(data.hd_thalach);
            data.hd_exang = parseInt(data.hd_exang);
            data.hd_oldpeak = parseFloat(data.hd_oldpeak);
            data.hd_slope = parseInt(data.hd_slope);
            data.hd_ca = parseInt(data.hd_ca);
            data.hd_thal = parseInt(data.hd_thal);
        }

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();
            predictionResultDiv.innerHTML = `<p>${result.prediction_text} <br> ${result.probability}</p>`;
            predictionResultDiv.classList.add('show');

            // Save prediction to Firebase if logged in
            if (isFirebaseReady && userId) {
                savePredictionHistory(diseaseType, data, result.prediction_text, result.probability);
            }

        } catch (error) {
            console.error(`Error during ${diseaseType} prediction:`, error);
            predictionResultDiv.innerHTML = `<p style="color: red;">An error occurred: ${error.message}. Please check your inputs.</p>`;
            predictionResultDiv.classList.add('show');
        } finally {
            hideSpinner(predictionResultDiv);
        }
    }

    // --- Gemini API Integration for Health Insights (via backend proxy) ---
    async function handleGetInsight() {
        const prompt = healthQuestionInput.value.trim();
        if (!prompt) {
            insightResultContainer.innerHTML = ''; // Clear previous insights
            insightResultContainer.classList.remove('hidden');
            insightResultContainer.innerHTML = '<div class="insight-card"><p style="color: orange;">Please enter a question to get health insights.</p></div>';
            return;
        }

        insightResultContainer.innerHTML = ''; // Clear previous insights
        insightResultContainer.classList.remove('hidden');
        insightResultContainer.innerHTML = `
            <div class="insight-card" id="currentInsightCard">
                <div class="loading-spinner" style="display: block;"></div>
                <p>Generating insight...</p>
            </div>
        `;
        const currentInsightCard = document.getElementById('currentInsightCard');
        showSpinner(currentInsightCard);


        try {
            const response = await fetch('/generate_insight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();
            if (result.insight) {
                const iconClass = "fas fa-brain"; // General AI insight icon
                currentInsightCard.innerHTML = `
                    <i class="${iconClass} insight-icon"></i>
                    <h4>AI Insight</h4>
                    <p>${result.insight}</p>
                `;
                currentInsightCard.classList.add('show');
            } else {
                currentInsightCard.innerHTML = '<p style="color: red;">Could not get a valid insight from AI. Please try again.</p>';
            }
        } catch (error) {
            console.error("Error calling backend for Gemini API:", error);
            currentInsightCard.innerHTML = `<p style="color: red;">Error fetching insight: ${error.message}.</p>`;
        } finally {
            hideSpinner(currentInsightCard);
            currentInsightCard.classList.add('show');
        }
    }

    // --- Firebase History Functions ---

    // Function to save prediction history
    async function savePredictionHistory(diseaseType, inputs, predictionText, probability) {
        if (!isFirebaseReady || !userId) {
            console.warn("Firebase not ready or user not logged in. Cannot save history.");
            return;
        }

        try {
            const appUniqueId = "health-predictor-app"; // Hardcoded unique ID for this app's data
            const userPredictionsRef = db.collection('artifacts').doc(appUniqueId).collection('users').doc(userId).collection('predictions');

            await userPredictionsRef.add({
                diseaseType: diseaseType,
                inputs: inputs,
                prediction: predictionText,
                probability: probability,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("Prediction saved to Firestore!");
            fetchPredictionHistory(); // Refresh history after saving
        } catch (error) {
            console.error("Error saving prediction to Firestore:", error);
            displayMessageBox("Error saving prediction history: " + error.message, 'error');
        }
    }

    // Function to fetch and display prediction history
    async function fetchPredictionHistory() {
        if (!isFirebaseReady || !userId) {
            console.warn("Firebase not ready or user not logged in. Cannot fetch history.");
            return;
        }

        historyListDiv.innerHTML = '<div class="loading-spinner" style="display: block; grid-column: 1 / -1;"></div>'; // Spinner spans all columns
        noHistoryMessage.classList.add('hidden');

        try {
            const appUniqueId = "health-predictor-app"; // Hardcoded unique ID for this app's data
            const userPredictionsRef = db.collection('artifacts').doc(appUniqueId).collection('users').doc(userId).collection('predictions');
            
            const snapshot = await userPredictionsRef.orderBy('timestamp', 'desc').get();
            
            historyListDiv.innerHTML = ''; // Clear previous history
            if (snapshot.empty) {
                noHistoryMessage.classList.remove('hidden');
                historyListDiv.appendChild(noHistoryMessage); // Append to historyListDiv
            } else {
                noHistoryMessage.classList.add('hidden');
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const timestamp = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : 'N/A';
                    
                    const inputsHtml = Object.entries(data.inputs).map(([key, value]) => {
                        // Exclude disease_type from detailed inputs display
                        if (key === 'disease_type') return '';
                        return `<p><strong>${key.replace('hd_', '').replace(/([A-Z])/g, ' $1').trim()}:</strong> ${value}</p>`;
                    }).join('');

                    const probabilityValue = parseFloat(data.probability.replace('Probability of ', '').replace('%', '')) / 100;
                    const confidencePercentage = (probabilityValue * 100).toFixed(0);

                    const diseaseIcon = data.diseaseType === 'diabetes' ? 'fas fa-syringe' : 'fas fa-heartbeat'; // Icons for diseases

                    const historyCard = `
                        <details class="history-card" data-aos="fade-up" data-aos-delay="50">
                            <summary>
                                <div class="summary-content">
                                    <i class="${diseaseIcon} history-icon"></i>
                                    <span>${data.diseaseType.toUpperCase()} Prediction</span>
                                    <span class="history-date">${timestamp}</span>
                                </div>
                            </summary>
                            <div class="history-card-content">
                                <p><strong>Result:</strong> ${data.prediction}</p>
                                <p><strong>Probability:</strong> ${data.probability}</p>
                                <div class="confidence-bar-container">
                                    <div class="confidence-bar" style="width: ${confidencePercentage}%;">
                                        ${confidencePercentage}%
                                    </div>
                                </div>
                                <p><strong>Inputs:</strong></p>
                                <div class="input-details">
                                    ${inputsHtml}
                                </div>
                            </div>
                        </details>
                    `;
                    historyListDiv.innerHTML += historyCard;
                });
            }
        } catch (error) {
            console.error("Error fetching prediction history:", error);
            historyListDiv.innerHTML = `<p style="color: red; grid-column: 1 / -1;">Error loading history: ${error.message}</p>`;
            displayMessageBox("Error fetching prediction history: " + error.message, 'error');
        } finally {
            hideSpinner(historyListDiv);
        }
    }

    // --- Firebase Authentication Functions ---

    // Sign Up with Email and Password
    async function handleSignup(event) {
        event.preventDefault();
        const email = signupEmailInput.value;
        const password = signupPasswordInput.value;

        try {
            await auth.createUserWithEmailAndPassword(email, password);
            displayMessageBox("Account created successfully! You are now logged in.", 'success');
            signupForm.reset(); // Clear form
            authModal.classList.remove('visible'); // Close modal
        } catch (error) {
            console.error("Error signing up:", error);
            displayMessageBox("Sign Up Error: " + error.message, 'error');
        }
    }

    // Login with Email and Password
    async function handleLogin(event) {
        event.preventDefault();
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;

        try {
            await auth.signInWithEmailAndPassword(email, password);
            displayMessageBox("Logged in successfully!", 'success');
            loginForm.reset(); // Clear form
            authModal.classList.remove('visible'); // Close modal
        } catch (error) {
            console.error("Error logging in:", error);
            displayMessageBox("Login Error: " + error.message, 'error');
        }
    }

    // Logout
    async function handleLogout(event) {
        event.preventDefault(); // Prevent default link behavior
        try {
            await auth.signOut();
            displayMessageBox("Logged out successfully!", 'info');
            // UI will be updated by onAuthStateChanged listener
        } catch (error) {
            console.error("Error logging out:", error);
            displayMessageBox("Logout Error: " + error.message, 'error');
        }
    }

    // --- Event Listeners ---

    // Navbar toggle for mobile
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.nav-links');
    hamburgerMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Close mobile menu when a link is clicked
    navLinks.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
            }
        });
    });

    // Show Auth Modal when Login button is clicked
    loginNavLink.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default link behavior
        authModal.classList.add('visible');
        showLoginTabBtn.click(); // Default to login tab
    });

    // Close Auth Modal
    closeAuthModalBtn.addEventListener('click', () => {
        authModal.classList.remove('visible');
    });

    // Switch Auth Tabs
    showLoginTabBtn.addEventListener('click', () => {
        showLoginTabBtn.classList.add('active');
        showSignupTabBtn.classList.remove('active');
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    });

    showSignupTabBtn.addEventListener('click', () => {
        showSignupTabBtn.classList.add('active');
        showLoginTabBtn.classList.remove('active');
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });

    // Attach Auth Form Submit Listeners
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);

    // Attach Logout Listener
    logoutNavLink.addEventListener('click', handleLogout);

    // Anonymous Login for Firebase (Still available as an option)
    anonLoginBtn.addEventListener('click', async () => {
        try {
            await auth.signInAnonymously();
            console.log("Signed in anonymously");
            displayMessageBox("Signed in anonymously! Your history will be saved.", 'info');
        } catch (error) {
            console.error("Error signing in anonymously:", error);
            displayMessageBox("Error signing in anonymously: " + error.message, 'error');
        }
    });

    // --- Initial Setup ---
    showSelectedForm(); // Display initial form (Diabetes by default)

    // Event listeners for prediction forms
    diseaseTypeSelect.addEventListener('change', showSelectedForm);
    diabetesPredictionForm.addEventListener('submit', handlePredictionFormSubmit);
    // Re-attach getInsightButton listener if it exists (it's dynamically added)
    const currentGetInsightButton = document.getElementById('getInsightButton');
    if (currentGetInsightButton) {
        currentGetInsightButton.addEventListener('click', handleGetInsight);
    }

    // AOS Initialization
    AOS.init({
        duration: 1000, // values from 0 to 3000, with step 50ms
        once: true,     // whether animation should happen only once - while scrolling down
    });

    // Hero Section Animated Text (Typewriter effect)
    const heroHeading = document.getElementById('hero-heading');
    const heroSubheading = document.getElementById('hero-subheading');

    const typeWriterEffect = (element, text, delay = 50) => {
        let i = 0;
        element.innerHTML = ''; // Clear content
        element.style.opacity = 1; // Make visible
        const interval = setInterval(() => {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
            } else {
                clearInterval(interval);
            }
        }, delay);
    };

    const originalHeadingText = heroHeading.textContent;
    const originalSubheadingText = heroSubheading.textContent;

    // Clear and re-animate on load
    heroHeading.textContent = '';
    heroSubheading.textContent = '';

    setTimeout(() => {
        typeWriterEffect(heroHeading, originalHeadingText, 70);
    }, 500); // Start heading after 0.5s

    setTimeout(() => {
        typeWriterEffect(heroSubheading, originalSubheadingText, 40);
    }, 2000); // Start subheading after 2s
});


// Ensure hero section animations run on load
document.addEventListener('DOMContentLoaded', () => {
  const heroHeading = document.getElementById('hero-heading');
  const heroSubheading = document.getElementById('hero-subheading');

  const typeWriterEffect = (element, text, delay = 50) => {
    let i = 0;
    element.innerHTML = '';
    element.style.opacity = 1;
    const interval = setInterval(() => {
      if (i < text.length) {
        element.innerHTML += text.charAt(i);
        i++;
      } else {
        clearInterval(interval);
      }
    }, delay);
  };

  const originalHeadingText = heroHeading.textContent;
  const originalSubheadingText = heroSubheading.textContent;

  heroHeading.textContent = '';
  heroSubheading.textContent = '';

  setTimeout(() => {
    typeWriterEffect(heroHeading, originalHeadingText, 70);
  }, 500);

  setTimeout(() => {
    typeWriterEffect(heroSubheading, originalSubheadingText, 40);
  }, 2000);
});
