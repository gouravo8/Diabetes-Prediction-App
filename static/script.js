document.getElementById('predictionForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent default form submission

    const resultDiv = document.getElementById('predictionResult');
    resultDiv.className = 'result'; // Reset classes
    resultDiv.innerHTML = 'Predicting...'; // Show loading message

    // Gather form data
    const formData = {
        gender: document.getElementById('gender').value,
        age: parseFloat(document.getElementById('age').value),
        hypertension: parseInt(document.getElementById('hypertension').value),
        heart_disease: parseInt(document.getElementById('heart_disease').value),
        smoking_history: document.getElementById('smoking_history').value,
        bmi: parseFloat(document.getElementById('bmi').value),
        HbA1c_level: parseFloat(document.getElementById('HbA1c_level').value),
        blood_glucose_level: parseInt(document.getElementById('blood_glucose_level').value)
    };

    try {
        const response = await fetch('/predict_diabetes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            let predictionText = `Prediction: <strong>${data.prediction}</strong><br>`;
            predictionText += `Probability of Diabetes: <strong>${(data.probability_of_diabetes * 100).toFixed(2)}%</strong>`;
            resultDiv.innerHTML = predictionText;

            // Apply styling based on prediction
            if (data.prediction === "Diabetes") {
                resultDiv.classList.add('positive');
            } else if (data.prediction === "No Diabetes") {
                resultDiv.classList.add('negative');
            } else {
                resultDiv.classList.add('warning'); // For any unexpected prediction
            }

        } else {
            resultDiv.innerHTML = `Error: ${data.error || 'Something went wrong.'}`;
            resultDiv.classList.add('warning');
        }
    } catch (error) {
        console.error('Error during prediction:', error);
        resultDiv.innerHTML = `An error occurred while connecting to the server. Please try again.`;
        resultDiv.classList.add('warning');
    }
});