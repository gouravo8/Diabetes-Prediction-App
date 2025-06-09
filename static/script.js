document.addEventListener('DOMContentLoaded', function() {
    const diseaseTypeSelect = document.getElementById('diseaseType');
    const diabetesFormSection = document.getElementById('diabetesFormSection');
    const heartDiseaseFormSection = document.getElementById('heartDiseaseFormSection');
    const predictionResultDiv = document.getElementById('predictionResult');

    // Get references to both prediction forms
    const diabetesPredictionForm = document.getElementById('diabetesPredictionForm');
    const heartDiseasePredictionForm = document.getElementById('heartDiseasePredictionForm');


    // Function to show/hide form sections based on selection
    function showSelectedForm() {
        const selectedDisease = diseaseTypeSelect.value;
        predictionResultDiv.classList.remove('show'); // Hide result when changing form

        if (selectedDisease === 'diabetes') {
            diabetesFormSection.classList.remove('hidden');
            heartDiseaseFormSection.classList.add('hidden');
            // Ensure the correct form's submit event listener is active if needed
            // (Currently, only diabetes form is fully functional)
        } else if (selectedDisease === 'heart_disease') {
            diabetesFormSection.classList.add('hidden');
            heartDiseaseFormSection.classList.remove('hidden');
            // Here you would typically populate the heart disease form fields dynamically
            // For now, it just shows the placeholder text
        } else {
            // No disease selected or invalid
            diabetesFormSection.classList.add('hidden');
            heartDiseaseFormSection.classList.add('hidden');
        }
    }

    // Initial display based on default selection
    showSelectedForm();

    // Event listener for disease type change
    diseaseTypeSelect.addEventListener('change', showSelectedForm);

    // Event listener for Diabetes Prediction Form submission
    diabetesPredictionForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent default form submission (page reload)

        // Clear previous results and hide if visible
        predictionResultDiv.innerHTML = '';
        predictionResultDiv.classList.remove('show');

        // Gather form data
        const formData = new FormData(diabetesPredictionForm); // Use diabetesPredictionForm here
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        // Convert certain values to numbers as needed by your model
        data.age = parseFloat(data.age);
        data.bmi = parseFloat(data.bmi);
        data.HbA1c_level = parseFloat(data.HbA1c_level);
        data.blood_glucose_level = parseFloat(data.blood_glucose_level);
        data.hypertension = parseInt(data.hypertension);
        data.heart_disease = parseInt(data.heart_disease);

        // Simple input validation (optional, but good practice)
        if (isNaN(data.age) || isNaN(data.bmi) || isNaN(data.HbA1c_level) || isNaN(data.blood_glucose_level)) {
            predictionResultDiv.innerHTML = '<p style="color: red;">Please enter valid numbers for Age, BMI, HbA1c Level, and Blood Glucose Level.</p>';
            predictionResultDiv.classList.add('show');
            return;
        }
        if (!data.gender || !data.smoking_history) {
             predictionResultDiv.innerHTML = '<p style="color: red;">Please select options for Gender and Smoking History.</p>';
             predictionResultDiv.classList.add('show');
             return;
        }

        // Send data to your Flask backend
        fetch('/predict_diabetes', { // This route is specific to diabetes prediction
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
            predictionResultDiv.innerHTML = `<p>${result.prediction_text}</p>`;
            predictionResultDiv.classList.add('show');
        })
        .catch(error => {
            console.error('Error during Diabetes prediction:', error);
            predictionResultDiv.innerHTML = `<p style="color: red;">An error occurred: ${error.message}. Please check your inputs.</p>`;
            predictionResultDiv.classList.add('show');
        });
    });

    // Event listener for Heart Disease Prediction Form submission (Currently just a placeholder)
    heartDiseasePredictionForm.addEventListener('submit', function(event) {
        event.preventDefault();
        predictionResultDiv.innerHTML = '<p>Heart Disease prediction functionality coming soon!</p>';
        predictionResultDiv.classList.add('show');
    });

});
