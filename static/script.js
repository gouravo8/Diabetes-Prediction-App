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

    let heartDiseasePredictionForm = null; // Will be initialized when form is generated
    let currentUserId = null; // Stores the current user's ID
    let authReady = false; // Flag to indicate if Firebase Auth is ready

    // --- Firebase Initialization (from window object, exported by index.html) ---
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
    const serverTimestamp = window.serverTimestamp; // Used for timestamping entries

    // --- Firebase Authentication Setup ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserId = user.uid;
            userIdDisplay.textContent = currentUserId;
            signInButton.style.display = 'none'; // Hide sign-in button
            authMessage.textContent = 'Signed in successfully!';
            authMessage.style.color = 'green';
            authReady = true;
            console.log("Firebase Auth Ready. User ID:", currentUserId);
            fetchPastPredictions(currentUserId); // Fetch past predictions for this user
        } else {
            currentUserId = null;
            userIdDisplay.textContent = 'Not signed in';
            signInButton.style.display = 'block'; // Show sign-in button
            authMessage.textContent = 'Please sign in to save your predictions.';
            authMessage.style.color = 'orange';
            authReady = true; // Auth system is ready, even if not signed in
            pastPredictionsList.innerHTML = '<p>Sign in to view your past predictions.</p>';
            console.log("Firebase Auth Ready. User not signed in.");
        }
    });

    signInButton.addEventListener('click', async () => {
        authMessage.textContent = 'Signing in...';
        try {
            if (initialAuthToken) {
                // Use custom token if provided by the Canvas environment
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                // Otherwise, sign in anonymously (no persistent account, but provides a UID)
                await signInAnonymously(auth);
            }
            // onAuthStateChanged listener will handle UI update
        } catch (error) {
            console.error("Error signing in:", error);
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
            if (auth.currentUser && currentUserId) {
                try {
                    // Create a record of the prediction and input data
                    const predictionRecord = {
                        userId: currentUserId,
                        diseaseType: diseaseType,
                        predictionText: result.prediction_text,
                        probability: result.probability,
                        inputData: data, // Save the raw input data
                        timestamp: serverTimestamp() // Firestore server timestamp
                    };

                    // Firestore path for private user data: /artifacts/{appId}/users/{userId}/predictions
                    const collectionPath = `artifacts/${appId}/users/${currentUserId}/predictions`;
                    await addDoc(collection(db, collectionPath), predictionRecord);
                    console.log("Prediction saved to Firestore successfully!");
                    authMessage.textContent = "Prediction saved!";
                    authMessage.style.color = 'green';
                } catch (saveError) {
                    console.error("Error saving prediction to Firestore:", saveError);
                    authMessage.textContent = "Error saving prediction.";
                    authMessage.style.color = 'red';
                }
            } else {
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
        if (!userId) {
            pastPredictionsList.innerHTML = '<p>Sign in to view your past predictions.</p>';
            return;
        }

        pastPredictionsList.innerHTML = '<p>Loading past predictions...</p>';

        // Firestore path for private user data: /artifacts/{appId}/users/{userId}/predictions
        const userPredictionsRef = collection(db, `artifacts/${appId}/users/${userId}/predictions`);
        
        // Order by timestamp in descending order
        const q = query(userPredictionsRef, where("userId", "==", userId)); // Ensure we only get current user's data

        onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                pastPredictionsList.innerHTML = '<p>No past predictions found. Make a prediction to save it here!</p>';
                return;
            }

            pastPredictionsList.innerHTML = ''; // Clear previous list

            snapshot.docChanges().forEach(change => {
                const data = change.doc.data();
                const predictionId = change.doc.id;
                
                let timestampText = 'N/A';
                if (data.timestamp && data.timestamp.toDate) { // Convert Firestore Timestamp to Date object
                    const date = data.timestamp.toDate();
                    timestampText = date.toLocaleString(); // Format date and time
                }

                const predictionItem = document.createElement('div');
                predictionItem.classList.add('past-predictions-list-item');
                predictionItem.innerHTML = `
                    <p><strong>${data.diseaseType.replace('_', ' ').toUpperCase()} Prediction:</strong> ${data.predictionText}</p>
                    <p><strong>Probability:</strong> ${data.probability}</p>
                    <p class="date-time">On: ${timestampText}</p>
                `;
                
                // Add the item based on change type (for real-time updates)
                if (change.type === "added") {
                    pastPredictionsList.prepend(predictionItem); // Add new items at the top
                } else if (change.type === "modified") {
                    // Find and replace the modified item
                    const existingItem = pastPredictionsList.querySelector(`[data-id="${predictionId}"]`);
                    if (existingItem) {
                        existingItem.replaceWith(predictionItem);
                    }
                } else if (change.type === "removed") {
                    // Remove the deleted item
                    const existingItem = pastPredictionsList.querySelector(`[data-id="${predictionId}"]`);
                    if (existingItem) {
                        existingItem.remove();
                    }
                }
                predictionItem.setAttribute('data-id', predictionId); // Set data-id for easy lookup
            });
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

    // Initial sign-in attempt (Firebase Auth state listener will handle UI)
    // The onAuthStateChanged listener at the top will trigger the signInAnonymously or signInWithCustomToken
    // when auth is ready (authReady becomes true).
    // The current setup signs in automatically via onAuthStateChanged or button click.
});
