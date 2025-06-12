document.addEventListener('DOMContentLoaded', function() {
    // --- UI Element References ---
    const diseaseTypeSelect = document.getElementById('diseaseType');
    const diabetesFormSection = document.getElementById('diabetesFormSection');
    const heartDiseaseFormSection = document.getElementById('heartDiseaseFormSection');
    const predictionResultDiv = document.getElementById('predictionResult');
    const diabetesPredictionForm = document.getElementById('diabetesPredictionForm');
    const userIdDisplay = document.getElementById('userIdDisplay');
    const signInButton = document.getElementById('signInButton');
    const authMessage = document.getElementById('authMessage');
    const pastPredictionsList = document.getElementById('pastPredictionsList');

    let heartDiseasePredictionForm = null;
    let currentUserId = null;
    let authReady = false; // Flag to indicate if Firebase Auth is ready

    // --- Firebase Initialization (from window object, exported by index.html) ---
    // Check if Firebase modules are available from the global window object
    if (!window.firebaseApp || !window.firebaseAuth || !window.firebaseDb) {
        console.error("Firebase SDK not loaded correctly. Check index.html imports.");
        userIdDisplay.textContent = 'Firebase Error';
        authMessage.textContent = 'Firebase modules failed to load.';
        authMessage.style.color = 'red';
        return; // Stop execution if Firebase isn't initialized
    }

    const app = window.firebaseApp;
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;
    const initialAuthToken = window.initialAuthToken;
    const appId = window.appId;

    const onAuthStateChanged = window.onAuthStateChanged;
    const signInAnonymously = window.signInAnonymously;
    const signInWithCustomToken = window.signInWithCustomToken;
    const collection = window.collection;
    const query = window.query;
    const where = window.where;
    const onSnapshot = window.onSnapshot;
    const addDoc = window.addDoc;
    const serverTimestamp = window.serverTimestamp;

    console.log("Firebase initialized successfully. Setting up auth listener.");

    // --- Firebase Authentication Setup ---
    onAuthStateChanged(auth, async (user) => {
        console.log("onAuthStateChanged triggered. User:", user);
        if (user) {
            currentUserId = user.uid;
            userIdDisplay.textContent = currentUserId;
            signInButton.style.display = 'none'; // Hide sign-in button after successful auth
            authMessage.textContent = 'Signed in successfully!';
            authMessage.style.color = 'green';
            authReady = true;
            console.log("Firebase Auth Ready. User ID:", currentUserId);
            fetchPastPredictions(currentUserId); // Fetch past predictions for this user
        } else {
            console.log("No user found. Attempting anonymous sign-in or showing button.");
            currentUserId = null;
            userIdDisplay.textContent = 'Not signed in';
            signInButton.style.display = 'block'; // Ensure sign-in button is visible

            // Automatically try to sign in anonymously if not already trying or authenticated
            // This is crucial for environments where no custom token is provided (like Render)
            if (!authReady) { // Only attempt this if auth hasn't been initialized yet
                authMessage.textContent = 'Signing in anonymously...';
                authMessage.style.color = 'gray';
                try {
                    await signInAnonymously(auth); // Attempt anonymous sign-in
                    // The onAuthStateChanged will trigger again with the anonymous user
                } catch (error) {
                    console.error("Error with anonymous sign-in:", error);
                    authMessage.textContent = `Auto sign-in failed: ${error.message}. Please click 'Sign In'.`;
                    authMessage.style.color = 'red';
                    authReady = true; // Still mark as ready, even with auto-sign-in error
                }
            } else {
                authMessage.textContent = 'Please sign in to save your predictions.';
                authMessage.style.color = 'orange';
            }
            pastPredictionsList.innerHTML = '<p>Sign in to view your past predictions.</p>';
            console.log("Firebase Auth Ready. User not signed in initially.");
            authReady = true; // Mark auth system as ready to prevent infinite loops of anonymous sign-in attempts
        }
    });

    signInButton.addEventListener('click', async () => {
        authMessage.textContent = 'Attempting sign in...';
        authMessage.style.color = 'gray';
        try {
            if (initialAuthToken && initialAuthToken !== 'null') { // Check for actual token string
                console.log("Attempting sign in with custom token.");
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                console.log("No custom token found, attempting anonymous sign in via button.");
                await signInAnonymously(auth);
            }
            // onAuthStateChanged listener will handle UI update if successful
        } catch (error) {
            console.error("Error during manual sign-in:", error);
            authMessage.textContent = `Sign in failed: ${error.message}`;
            authMessage.style.color = 'red';
        }
    });

    // --- Heart Disease Form Field Definitions ---
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
            <h3 class="section-title">Heart Disease Prediction</h3>
            <form id="heartDiseasePredictionForm">
                ${formInnerHtml}
                <button type="submit">Predict Heart Disease Risk</button>
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
        predictionResultDiv.innerHTML = '';

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

    // --- Unified Function to Handle Form Submissions and Save Data ---
    async function handlePredictionFormSubmit(event) {
        event.preventDefault();

        predictionResultDiv.innerHTML = 'Predicting...';
        predictionResultDiv.classList.add('show');

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

            // --- Save Prediction to Firestore ---
            if (auth.currentUser && currentUserId && authReady) { // Ensure auth is ready and user is logged in
                try {
                    const predictionRecord = {
                        userId: currentUserId,
                        diseaseType: diseaseType,
                        predictionText: result.prediction_text,
                        probability: result.probability,
                        inputData: data,
                        timestamp: serverTimestamp()
                    };

                    const collectionPath = `artifacts/${appId}/users/${currentUserId}/predictions`;
                    await addDoc(collection(db, collectionPath), predictionRecord);
                    console.log("Prediction saved to Firestore successfully!");
                    // authMessage.textContent = "Prediction saved!"; // Don't overwrite prediction result msg
                    // authMessage.style.color = 'green';
                } catch (saveError) {
                    console.error("Error saving prediction to Firestore:", saveError);
                    authMessage.textContent = "Error saving prediction to history.";
                    authMessage.style.color = 'red';
                }
            } else {
                console.warn("User not signed in or Auth not ready. Skipping Firestore save.");
                authMessage.textContent = "Sign in to save your predictions!";
                authMessage.style.color = 'orange';
            }

        } catch (error) {
            console.error(`Error during ${diseaseType} prediction:`, error);
            predictionResultDiv.innerHTML = `<p style="color: red;">An error occurred: ${error.message}. Please check your inputs.</p>`;
            predictionResultDiv.classList.add('show');
        }
    }

    // --- Fetch and Display Past Predictions from Firestore ---
    function fetchPastPredictions(userId) {
        if (!userId || !authReady) { // Ensure userId and auth are ready
            pastPredictionsList.innerHTML = '<p>Sign in to view your past predictions.</p>';
            return;
        }

        console.log("Fetching past predictions for user:", userId);
        pastPredictionsList.innerHTML = '<p>Loading past predictions...</p>';

        const userPredictionsRef = collection(db, `artifacts/${appId}/users/${userId}/predictions`);
        
        // Order by timestamp in descending order, limit to a reasonable number if desired
        const q = query(userPredictionsRef, where("userId", "==", userId)); // Ensure we only get current user's data

        // Use onSnapshot for real-time updates
        onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                pastPredictionsList.innerHTML = '<p>No past predictions found. Make a prediction to save it here!</p>';
                return;
            }

            // Collect all docs to sort before rendering
            const predictions = [];
            snapshot.forEach(doc => {
                predictions.push({ id: doc.id, ...doc.data() });
            });

            // Sort by timestamp in descending order (most recent first)
            predictions.sort((a, b) => {
                const timeA = a.timestamp ? a.timestamp.toMillis() : 0;
                const timeB = b.timestamp ? b.timestamp.toMillis() : 0;
                return timeB - timeA; // Descending
            });

            pastPredictionsList.innerHTML = ''; // Clear previous list

            predictions.forEach(data => {
                let timestampText = 'N/A';
                if (data.timestamp && data.timestamp.toDate) {
                    const date = data.timestamp.toDate();
                    timestampText = date.toLocaleString();
                }

                const predictionItem = document.createElement('div');
                predictionItem.classList.add('past-predictions-list-item');
                predictionItem.setAttribute('data-id', data.id); // Set data-id for easy lookup
                predictionItem.innerHTML = `
                    <p><strong>${data.diseaseType.replace('_', ' ').toUpperCase()} Prediction:</strong> ${data.predictionText}</p>
                    <p><strong>Probability:</strong> ${data.probability}</p>
                    <p class="date-time">On: ${timestampText}</p>
                `;
                pastPredictionsList.appendChild(predictionItem); // Append in sorted order
            });
            console.log("Past predictions fetched and displayed.");
        }, (error) => {
            console.error("Error fetching past predictions:", error);
            pastPredictionsList.innerHTML = '<p style="color: red;">Error loading past predictions.</p>';
        });
    }

    // --- Initial Setup ---
    showSelectedForm(); // Display initial form (Diabetes by default)

    // Event listeners
    diseaseTypeSelect.addEventListener('change', showSelectedForm);
    diabetesPredictionForm.addEventListener('submit', handlePredictionFormSubmit);

    // Initial sign-in logic is handled by onAuthStateChanged directly.
    // fetchPastPredictions will be called once auth is ready.
});
