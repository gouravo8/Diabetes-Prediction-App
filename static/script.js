document.addEventListener('DOMContentLoaded', function() {
    const diseaseTypeSelect = document.getElementById('diseaseType');
    const diabetesFormSection = document.getElementById('diabetesFormSection');
    const heartDiseaseFormSection = document.getElementById('heartDiseaseFormSection');
    const predictionResultDiv = document.getElementById('predictionResult');

    const diabetesPredictionForm = document.getElementById('diabetesPredictionForm');
    let heartDiseasePredictionForm = null; // Will be initialized when form is generated

    // Define Heart Disease fields and their properties for dynamic generation
    // These fields must match the features expected by your heart disease model
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
        { id: 'hd_ca', label: 'Number of Major Vessels (0-3):', type: 'select', options: [{value: '0', text: '0'}, {value: '1', text: '1'}, {value: '2', text: '2'}, {value: '3', text: '3'}, {value: '4', text: '4 (Unknown/Error)'}], required: true }, // ca can be 0-4 based on dataset
        { id: 'hd_thal', label: 'Thalassemia:', type: 'select', options: [{value: '0', text: 'Unknown'}, {value: '1', text: 'Normal'}, {value: '2', text: 'Fixed Defect'}, {value: '3', text: 'Reversable Defect'}], required: true } // thal values adjusted for dataset
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
        // Re-assign the form reference after generating HTML
        heartDiseasePredictionForm = document.getElementById('heartDiseasePredictionForm');
        // Add event listener to the newly created form
        if (heartDiseasePredictionForm) { // Ensure form exists before adding listener
            heartDiseasePredictionForm.addEventListener('submit', handlePredictionFormSubmit);
        }
    }

    // Function to show/hide form sections based on selection
    function showSelectedForm() {
        const selectedDisease = diseaseTypeSelect.value;
        predictionResultDiv.classList.remove('show'); // Hide result when changing form
        predictionResultDiv.innerHTML = ''; // Clear previous results

        if (selectedDisease === 'diabetes') {
            diabetesFormSection.classList.remove('hidden');
            heartDiseaseFormSection.classList.add('hidden');
        } else if (selectedDisease === 'heart_disease') {
            diabetesFormSection.classList.add('hidden');
            heartDiseaseFormSection.classList.remove('hidden');
            // Generate heart disease form dynamically if not already generated or if empty
            // We check for heartDiseasePredictionForm and if its innerHTML is largely empty
            // to avoid regenerating it unnecessarily if it's already there
            if (!heartDiseasePredictionForm || heartDiseasePredictionForm.innerHTML.trim() === '') {
                generateHeartDiseaseForm();
            }
        } else {
            // No disease selected or invalid
            diabetesFormSection.classList.add('hidden');
            heartDiseaseFormSection.classList.add('hidden');
        }
    }

    // Unified function to handle form submissions
    function handlePredictionFormSubmit(event) {
        event.preventDefault(); // Prevent default form submission (page reload)

        predictionResultDiv.innerHTML = 'Predicting...'; // Show loading message
        predictionResultDiv.classList.add('show');

        const form = event.target; // Get the form that triggered the event
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        let apiUrl = '/predict'; // Unified prediction endpoint
        let diseaseType = diseaseTypeSelect.value; // Get selected disease type

        // Append disease type to the data
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
            // Convert heart disease specific values
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

        // Send data to your Flask backend
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(result => {
            predictionResultDiv.innerHTML = `<p>${result.prediction_text} <br> ${result.probability}</p>`;
            predictionResultDiv.classList.add('show');
        })
        .catch(error => {
            console.error(`Error during ${diseaseType} prediction:`, error);
            predictionResultDiv.innerHTML = `<p style="color: red;">An error occurred: ${error.message}. Please check your inputs.</p>`;
            predictionResultDiv.classList.add('show');
        });
    }

    // Initial display based on default selection
    showSelectedForm();

    // Event listener for disease type change
    diseaseTypeSelect.addEventListener('change', showSelectedForm);

    // Event listener for Diabetes Prediction Form submission (still points to unified handler)
    diabetesPredictionForm.addEventListener('submit', handlePredictionFormSubmit);

    // Note: heartDiseasePredictionForm listener is attached dynamically in generateHeartDiseaseForm
});
