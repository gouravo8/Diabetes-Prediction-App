// Firebase SDK Imports (No change here, they are loaded in index.html)

// --- IMPORTANT: YOUR FIREBASE CONFIGURATION ---
// This configuration is directly embedded here to ensure it's always available,
// especially for deployment environments like Render where dynamic injection
// can be tricky with free tiers.
const firebaseConfig = {
    apiKey: "AIzaSyCcz13-1CVY06btvApVADmTuV4t_plBj44",
    authDomain: "diabetes-prediction-app-b722d.firebaseapp.com",
    projectId: "diabetes-prediction-app-b722d",
    storageBucket: "diabetes-prediction-app-b722d.firebasestorage.app",
    messagingSenderId: "557388270196",
    appId: "1:557388270196:web:69e3aef92fba2abac01f21",
    measurementId: "G-8WPLPNTYLD"
};

// Initialize Firebase (This part remains the same, assuming imports are in index.html)
// Note: We are no longer using __firebase_config from the environment for Render
// as it caused issues. The config is now directly above.
let app;
let auth;
let db;
let userId = 'loading...'; // Default loading state for user ID

// Function to initialize Firebase services safely
function initializeFirebaseServices() {
    try {
        // Only initialize if not already initialized
        if (!app) {
            app = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth.getAuth(app);
            db = firebase.firestore.getFirestore(app);
            console.log("Firebase services initialized.");
        }

        // UI Elements
        const userIdSpan = document.getElementById('user-id');
        const signInOutButton = document.getElementById('sign-in-out-button');
        const firebaseErrorDisplay = document.getElementById('firebase-error');
        const pastPredictionsList = document.getElementById('past-predictions-list');
        const noPredictionsMessage = document.getElementById('no-predictions-message');

        // --- Firebase Authentication ---
        firebase.auth.onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in.
                userId = user.uid;
                userIdSpan.textContent = userId;
                signInOutButton.textContent = 'Sign Out';
                firebaseErrorDisplay.classList.add('hidden'); // Hide error if user is signed in

                // Start listening for past predictions
                setupPastPredictionsListener(userId);
            } else {
                // User is signed out.
                userId = 'Not signed in';
                userIdSpan.textContent = userId;
                signInOutButton.textContent = 'Sign In / Register';
                pastPredictionsList.innerHTML = ''; // Clear past predictions
                noPredictionsMessage.classList.remove('hidden'); // Show no predictions message
                // Try to sign in anonymously if not already
                firebase.auth.signInAnonymously(auth).catch((error) => {
                    console.error("Error signing in anonymously:", error);
                    firebaseErrorDisplay.textContent = `Firebase Error: ${error.message}`;
                    firebaseErrorDisplay.classList.remove('hidden');
                });
            }
        });

        signInOutButton.addEventListener('click', () => {
            if (auth.currentUser) {
                // User is signed in, so sign them out
                firebase.auth.signOut(auth).catch((error) => {
                    console.error("Error signing out:", error);
                    firebaseErrorDisplay.textContent = `Firebase Error: ${error.message}`;
                    firebaseErrorDisplay.classList.remove('hidden');
                });
            } else {
                // User is signed out, so sign them in anonymously
                firebase.auth.signInAnonymously(auth).catch((error) => {
                    console.error("Error signing in anonymously:", error);
                    firebaseErrorDisplay.textContent = `Firebase Error: ${error.message}`;
                    firebaseErrorDisplay.classList.remove('hidden');
                });
            }
        });

        // --- Firestore Data Operations ---
        function setupPastPredictionsListener(currentUserId) {
            // Firestore security rules will ensure only the correct user can read/write their data.
            // Using a subcollection under the user's document for private data.
            const userPredictionsRef = firebase.firestore.collection(db, 'users', currentUserId, 'predictions');
            // IMPORTANT: Firebase orderBy can cause issues if not indexed.
            // For simplicity and to avoid indexing headaches on free tier,
            // we will fetch all and sort in memory if needed.
            const q = firebase.firestore.query(userPredictionsRef); // Removed orderBy

            firebase.firestore.onSnapshot(q, (snapshot) => {
                pastPredictionsList.innerHTML = ''; // Clear existing predictions
                let predictionsArray = [];
                snapshot.forEach((doc) => {
                    predictionsArray.push({ id: doc.id, ...doc.data() });
                });

                // Sort in memory by timestamp descending, as orderBy was removed from query
                predictionsArray.sort((a, b) => {
                    if (a.timestamp && b.timestamp) {
                        return b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime();
                    }
                    return 0; // Handle cases where timestamp might be missing
                });

                if (predictionsArray.length === 0) {
                    noPredictionsMessage.classList.remove('hidden');
                } else {
                    noPredictionsMessage.classList.add('hidden');
                    predictionsArray.forEach((predictionData) => {
                        const predictionItem = document.createElement('div');
                        predictionItem.className = 'bg-gray-50 p-3 rounded-md shadow-sm border border-gray-200';
                        const date = predictionData.timestamp ? new Date(predictionData.timestamp.toDate()).toLocaleString() : 'N/A';
                        predictionItem.innerHTML = `
                            <p class="font-semibold text-gray-800">${predictionData.predictionText}</p>
                            <p class="text-gray-600 text-sm">Probability: ${predictionData.probability}</p>
                            <p class="text-gray-500 text-xs">Type: ${predictionData.diseaseType}</p>
                            <p class="text-gray-500 text-xs">Date: ${date}</p>
                        `;
                        pastPredictionsList.appendChild(predictionItem);
                    });
                }
            }, (error) => {
                console.error("Error listening to past predictions:", error);
                firebaseErrorDisplay.textContent = `Firestore Error: ${error.message}`;
                firebaseErrorDisplay.classList.remove('hidden');
            });
        }

        async function savePredictionToFirestore(prediction) {
            if (!userId || userId === 'loading...' || userId === 'Not signed in') {
                console.warn("Cannot save prediction: User not authenticated.");
                return;
            }
            try {
                // Save to private collection for the authenticated user
                await firebase.firestore.addDoc(firebase.firestore.collection(db, 'users', userId, 'predictions'), {
                    ...prediction,
                    timestamp: firebase.firestore.serverTimestamp() // Use server timestamp
                });
                console.log("Prediction saved to Firestore successfully!");
            } catch (error) {
                console.error("Error saving prediction to Firestore:", error);
                firebaseErrorDisplay.textContent = `Firestore Save Error: ${error.message}`;
                firebaseErrorDisplay.classList.remove('hidden');
            }
        }

    } catch (error) {
        console.error("Error initializing Firebase:", error);
        document.getElementById('firebase-error').textContent = `Critical Firebase Initialization Error: ${error.message}. Please check console.`;
        document.getElementById('firebase-error').classList.remove('hidden');
    }
}

// Call the initialization function when the window loads
window.addEventListener('load', initializeFirebaseServices);


// --- Prediction Form Logic (Mostly same as before, with API URL change) ---
const diseaseSelect = document.getElementById('diseaseSelect');
const diabetesForm = document.getElementById('diabetesForm');
const heartDiseaseForm = document.getElementById('heartDiseaseForm');
const predictDiabetesBtn = document.getElementById('predictDiabetesBtn');
const predictHeartDiseaseBtn = document.getElementById('predictHeartDiseaseBtn');
const resultDiv = document.getElementById('result');
const predictionText = document.getElementById('predictionText');
const probabilityText = document.getElementById('probabilityText');

// IMPORTANT: Replace this with your actual Render backend service URL.
// This will be provided by Render after your backend is deployed.
const RENDER_BACKEND_URL = 'YOUR_RENDER_BACKEND_SERVICE_URL'; // THIS WILL BE REPLACED LATER

function toggleForms() {
    if (diseaseSelect.value === 'diabetes') {
        diabetesForm.classList.remove('hidden');
        heartDiseaseForm.classList.add('hidden');
    } else {
        diabetesForm.classList.add('hidden');
        heartDiseaseForm.classList.remove('hidden');
    }
    resultDiv.classList.add('hidden'); // Hide result when switching forms
}

diseaseSelect.addEventListener('change', toggleForms);
toggleForms(); // Initial call to set the correct form on load

predictDiabetesBtn.addEventListener('click', async () => {
    const data = {
        disease_type: 'diabetes',
        gender: document.getElementById('gender').value,
        age: document.getElementById('age').value,
        hypertension: document.getElementById('hypertension').value,
        heart_disease: document.getElementById('heart_disease').value,
        smoking_history: document.getElementById('smoking_history').value,
        bmi: document.getElementById('bmi').value,
        HbA1c_level: document.getElementById('HbA1c_level').value,
        blood_glucose_level: document.getElementById('blood_glucose_level').value
    };

    // Basic validation
    for (const key in data) {
        if (key !== 'disease_type' && (data[key] === '' || data[key] === null)) {
            // Using a simple message box instead of alert()
            showCustomMessage(`Please fill in the "${key.replace('_', ' ').replace('HbA1c', 'HbA1c')}" field.`, 'error');
            return;
        }
    }

    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/predict`, { // Use full URL here
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            predictionText.textContent = result.prediction_text;
            probabilityText.textContent = result.probability;
            resultDiv.classList.remove('hidden');

            // Save prediction to Firestore
            await savePredictionToFirestore({
                diseaseType: 'Diabetes',
                predictionText: result.prediction_text,
                probability: result.probability,
                inputData: data // Save the input data for reference
            });

        } else {
            predictionText.textContent = `Error: ${result.error || 'Unknown error'}`;
            probabilityText.textContent = '';
            resultDiv.classList.remove('hidden');
            console.error("Prediction API error:", result);
            showCustomMessage(`Error from API: ${result.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        predictionText.textContent = `Error: ${error.message}`;
        probabilityText.textContent = '';
        resultDiv.classList.remove('hidden');
        console.error("Network or API call error:", error);
        showCustomMessage(`Network Error: ${error.message}. Make sure the backend is running.`, 'error');
    }
});

predictHeartDiseaseBtn.addEventListener('click', async () => {
    const data = {
        disease_type: 'heart_disease',
        hd_age: document.getElementById('hd_age').value,
        hd_sex: document.getElementById('hd_sex').value,
        hd_cp: document.getElementById('hd_cp').value,
        hd_trestbps: document.getElementById('hd_trestbps').value,
        hd_chol: document.getElementById('hd_chol').value,
        hd_fbs: document.getElementById('hd_fbs').value,
        hd_restecg: document.getElementById('hd_restecg').value,
        hd_thalach: document.getElementById('hd_thalach').value,
        hd_exang: document.getElementById('hd_exang').value,
        hd_oldpeak: document.getElementById('hd_oldpeak').value,
        hd_slope: document.getElementById('hd_slope').value,
        hd_ca: document.getElementById('hd_ca').value,
        hd_thal: document.getElementById('hd_thal').value
    };

    // Basic validation
    for (const key in data) {
        if (key !== 'disease_type' && (data[key] === '' || data[key] === null)) {
            // Using a simple message box instead of alert()
            showCustomMessage(`Please fill in the "${key.replace('hd_', '').replace('_', ' ')}" field.`, 'error');
            return;
        }
    }

    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/predict`, { // Use full URL here
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            predictionText.textContent = result.prediction_text;
            probabilityText.textContent = result.probability;
            resultDiv.classList.remove('hidden');

            // Save prediction to Firestore
            await savePredictionToFirestore({
                diseaseType: 'Heart Disease',
                predictionText: result.prediction_text,
                probability: result.probability,
                inputData: data // Save the input data for reference
            });

        } else {
            predictionText.textContent = `Error: ${result.error || 'Unknown error'}`;
            probabilityText.textContent = '';
            resultDiv.classList.remove('hidden');
            console.error("Prediction API error:", result);
            showCustomMessage(`Error from API: ${result.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        predictionText.textContent = `Error: ${error.message}`;
        probabilityText.textContent = '';
        resultDiv.classList.remove('hidden');
        console.error("Network or API call error:", error);
        showCustomMessage(`Network Error: ${error.message}. Make sure the backend is running.`, 'error');
    }
});

// Custom message box function (replaces alert)
function showCustomMessage(message, type = 'info') {
    const messageBox = document.createElement('div');
    messageBox.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg text-white z-50 transition-all duration-300 transform ${type === 'error' ? 'bg-red-500' : 'bg-blue-500'} translate-x-full opacity-0`;
    messageBox.textContent = message;
    document.body.appendChild(messageBox);

    // Animate in
    setTimeout(() => {
        messageBox.classList.remove('translate-x-full', 'opacity-0');
        messageBox.classList.add('translate-x-0', 'opacity-100');
    }, 100);

    // Animate out and remove after 5 seconds
    setTimeout(() => {
        messageBox.classList.remove('translate-x-0', 'opacity-100');
        messageBox.classList.add('translate-x-full', 'opacity-0');
        messageBox.addEventListener('transitionend', () => messageBox.remove());
    }, 5000);
}
