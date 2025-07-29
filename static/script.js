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
    const insightResultDiv = document.getElementById('insightResult');

    // Elements for Prediction History (Firebase)
    const loginPromptDiv = document.getElementById('loginPrompt');
    const anonLoginBtn = document.getElementById('anonLoginBtn');
    const historyListDiv = document.getElementById('historyList');
    const noHistoryMessage = document.querySelector('.no-history-message');

    let heartDiseasePredictionForm = null; // This will hold the reference to the dynamically created form

    // --- Firebase Configuration (IMPORTANT: Replace with your actual Firebase config) ---
    // You need to get your Firebase project's config from your Firebase console.
    // Go to Project settings -> Your apps -> Web app -> Firebase SDK snippet -> Config
    const firebaseConfig = {
        apiKey: "YOUR_FIREBASE_API_KEY", // Replace with your actual API Key
        authDomain: "YOUR_AUTH_DOMAIN", // Replace with your actual Auth Domain
        projectId: "YOUR_PROJECT_ID", // Replace with your actual Project ID
        storageBucket: "YOUR_STORAGE_BUCKET", // Replace with your actual Storage Bucket
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Replace with your actual Sender ID
        appId: "YOUR_APP_ID" // Replace with your actual App ID
    };

    // Initialize Firebase
    let app, auth, db, userId;
    let isFirebaseReady = false;

    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();

        // Listen for auth state changes
        auth.onAuthStateChanged(user => {
            if (user) {
                userId = user.uid;
                console.log("Firebase User ID:", userId);
                loginPromptDiv.classList.add('hidden');
                historyListDiv.classList.remove('hidden');
                isFirebaseReady = true;
                fetchPredictionHistory(); // Fetch history once logged in
            } else {
                console.log("No Firebase user logged in.");
                userId = null;
                loginPromptDiv.classList.remove('hidden');
                historyListDiv.classList.add('hidden');
                isFirebaseReady = false;
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
        insightResultDiv.classList.remove('show');
        insightResultDiv.classList.add('hidden'); // Ensure it's truly hidden
        insightResultDiv.innerHTML = '';

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
            data.heart_disease = parseInt(data.heart_disease);
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
    getInsightButton.addEventListener('click', async () => {
        const prompt = healthQuestionInput.value.trim();
        if (!prompt) {
            insightResultDiv.classList.remove('hidden');
            insightResultDiv.innerHTML = '<p style="color: orange;">Please enter a question to get health insights.</p>';
            insightResultDiv.classList.add('show');
            return;
        }

        insightResultDiv.classList.remove('hidden');
        insightResultDiv.innerHTML = '<p>Generating insight...</p>';
        showSpinner(insightResultDiv);

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
                insightResultDiv.innerHTML = `<p>${result.insight}</p>`;
            } else {
                insightResultDiv.innerHTML = '<p style="color: red;">Could not get a valid insight from AI. Please try again.</p>';
            }
        } catch (error) {
            console.error("Error calling backend for Gemini API:", error);
            insightResultDiv.innerHTML = `<p style="color: red;">Error fetching insight: ${error.message}.</p>`;
        } finally {
            hideSpinner(insightResultDiv);
            insightResultDiv.classList.add('show');
        }
    });

    // --- Firebase History Functions ---

    // Function to save prediction history
    async function savePredictionHistory(diseaseType, inputs, predictionText, probability) {
        if (!isFirebaseReady || !userId) {
            console.warn("Firebase not ready or user not logged in. Cannot save history.");
            return;
        }

        try {
            // Use a generic app ID for the collection path for user deployment
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
        }
    }

    // Function to fetch and display prediction history
    async function fetchPredictionHistory() {
        if (!isFirebaseReady || !userId) {
            console.warn("Firebase not ready or user not logged in. Cannot fetch history.");
            return;
        }

        historyListDiv.innerHTML = '<div class="loading-spinner" style="display: block;"></div>';
        noHistoryMessage.classList.add('hidden');

        try {
            const appUniqueId = "health-predictor-app"; // Hardcoded unique ID for this app's data
            const userPredictionsRef = db.collection('artifacts').doc(appUniqueId).collection('users').doc(userId).collection('predictions');
            
            // Fetch documents, ordered by timestamp descending
            const snapshot = await userPredictionsRef.orderBy('timestamp', 'desc').get();
            
            historyListDiv.innerHTML = ''; // Clear previous history
            if (snapshot.empty) {
                noHistoryMessage.classList.remove('hidden');
            } else {
                noHistoryMessage.classList.add('hidden');
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const timestamp = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : 'N/A';
                    
                    const inputsHtml = Object.entries(data.inputs).map(([key, value]) => {
                        return `<p><strong>${key.replace('hd_', '').replace(/([A-Z])/g, ' $1').trim()}:</strong> ${value}</p>`;
                    }).join('');

                    const historyCard = `
                        <details class="history-card" data-aos="fade-up" data-aos-delay="50">
                            <summary>
                                <span>${data.diseaseType.toUpperCase()} Prediction - ${timestamp}</span>
                            </summary>
                            <div class="history-card-content">
                                <p><strong>Result:</strong> ${data.prediction}</p>
                                <p><strong>Probability:</strong> ${data.probability}</p>
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
            historyListDiv.innerHTML = `<p style="color: red;">Error loading history: ${error.message}</p>`;
        } finally {
            hideSpinner(historyListDiv);
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

    // Anonymous Login for Firebase
    anonLoginBtn.addEventListener('click', async () => {
        try {
            await auth.signInAnonymously();
            console.log("Signed in anonymously");
        } catch (error) {
            console.error("Error signing in anonymously:", error);
            alert("Error signing in: " + error.message); // Using alert for critical Firebase error
        }
    });

    // --- Initial Setup ---
    showSelectedForm(); // Display initial form (Diabetes by default)

    // Event listeners for prediction forms
    diseaseTypeSelect.addEventListener('change', showSelectedForm);
    diabetesPredictionForm.addEventListener('submit', handlePredictionFormSubmit);

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
