// This code runs automatically once the whole web page has loaded
document.addEventListener('DOMContentLoaded', function() {
    // Finds your prediction form on the page
    const predictionForm = document.getElementById('predictionForm');
    // Finds the special box where the prediction result will be shown
    const predictionResultDiv = document.getElementById('predictionResult');

    // Sets up what happens when you click the "Predict Diabetes Risk" button
    predictionForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Stops the page from refreshing when you click the button

        // Clears any old prediction results and hides the result box
        predictionResultDiv.innerHTML = '';
        predictionResultDiv.classList.remove('show');

        // Gathers all the information you typed into the form
        const formData = new FormData(predictionForm);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        // Converts specific inputs (like age, BMI) from text to numbers, 
        // because your prediction model needs numbers.
        data.age = parseFloat(data.age);
        data.bmi = parseFloat(data.bmi);
        data.HbA1c_level = parseFloat(data.HbA1c_level);
        data.blood_glucose_level = parseFloat(data.blood_glucose_level);
        data.hypertension = parseInt(data.hypertension);
        data.heart_disease = parseInt(data.heart_disease);

        // A quick check to see if important number fields are actually numbers, 
        // and if gender/smoking history are selected.
        if (isNaN(data.age) || isNaN(data.bmi) || isNaN(data.HbA1c_level) || isNaN(data.blood_glucose_level)) {
            predictionResultDiv.innerHTML = '<p style="color: red;">Please enter valid numbers for Age, BMI, HbA1c Level, and Blood Glucose Level.</p>';
            predictionResultDiv.classList.add('show');
            return; // Stops here if validation fails
        }
        if (!data.gender || !data.smoking_history) {
             predictionResultDiv.innerHTML = '<p style="color: red;">Please select options for Gender and Smoking History.</p>';
             predictionResultDiv.classList.add('show');
             return;
        }

        // Sends your collected data to your Flask app on the server
        fetch('/predict_diabetes', { // This talks to the '/predict_diabetes' part of your app.py
            method: 'POST', // Sends the data as a POST request
            headers: {
                'Content-Type': 'application/json' // Tells the server the data is in JSON format
            },
            body: JSON.stringify(data) // Converts your form data into a JSON string
        })
        .then(response => {
            // Checks if the server responded correctly (status 200 OK)
            if (!response.ok) {
                // If there's an error from the server (like a 400 or 500 code)
                return response.json().then(errorData => {
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                });
            }
            // If the response is good, it converts the server's answer (which is JSON) into a JavaScript object
            return response.json();
        })
        .then(result => {
            // Once we get the result, this updates the prediction box on your page
            predictionResultDiv.innerHTML = `<p>${result.prediction_text}</p>`;
            predictionResultDiv.classList.add('show'); // Makes the prediction box smoothly appear
        })
        .catch(error => {
            // If anything goes wrong during the sending or receiving, this shows an error message
            console.error('Error during prediction:', error); // Logs the error for debugging
            predictionResultDiv.innerHTML = `<p style="color: red;">An error occurred: ${error.message}. Please check your inputs.</p>`;
            predictionResultDiv.classList.add('show'); // Makes the error message appear
        });
    });
});
