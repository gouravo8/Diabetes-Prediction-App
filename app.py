import os
import joblib
import json
from flask import Flask, request, jsonify, render_template
import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from functools import wraps
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# --- Configuration and Model Loading ---
# Load environment variables (optional for local testing, provided by the platform)
# Load models using joblib
try:
    diabetes_model = joblib.load('diabetes_model.joblib')
    heart_disease_model = joblib.load('heart_disease_model.joblib')
    print("Machine learning models loaded successfully.")
except FileNotFoundError as e:
    print(f"Error: One or more model files not found. Please ensure 'diabetes_model.joblib' and 'heart_disease_model.joblib' are in the same directory as app.py. Error: {e}")
    diabetes_model = None
    heart_disease_model = None

# Configure the Gemini API client
# Use an empty string for the API key; the environment will inject it automatically
GEMINI_API_KEY = ""
genai.configure(api_key=GEMINI_API_KEY)
generation_config = GenerationConfig(temperature=0.7, top_p=0.9, top_k=40)

# --- Routes ---

@app.route('/')
def home():
    """Renders the main HTML page."""
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    """
    Handles prediction requests for diabetes and heart disease.
    Requires a JSON payload with 'disease_type' and relevant features.
    """
    if not diabetes_model or not heart_disease_model:
        return jsonify({'error': 'Models are not loaded. Cannot perform prediction.'}), 500

    data = request.get_json(force=True)
    disease_type = data.get('disease_type')
    
    try:
        if disease_type == 'diabetes':
            # Extract features for diabetes prediction
            # The order must match the training data
            features = [
                data['gender'],
                data['age'],
                data['hypertension'],
                data['heart_disease'],
                data['smoking_history'],
                data['bmi'],
                data['HbA1c_level'],
                data['blood_glucose_level']
            ]
            
            # Placeholder for categorical encoding (if your model requires it)
            # Example:
            # gender_map = {'Female': 0, 'Male': 1, 'Other': 2}
            # smoking_map = {'never': 0, 'No Info': 1, ...}
            # features[0] = gender_map.get(features[0], 0)
            # features[4] = smoking_map.get(features[4], 1)
            
            # Convert gender and smoking history to numerical if the model requires it
            # This is a critical step, as the model expects numerical input.
            gender_mapping = {"Female": 0, "Male": 1, "Other": 2}
            smoking_mapping = {"never": 0, "No Info": 1, "current": 2, "ever": 3, "former": 4, "not current": 5}
            features[0] = gender_mapping.get(features[0], 0)
            features[4] = smoking_mapping.get(features[4], 1) # Default to 'No Info' if not found

            # Make the prediction
            prediction_proba = diabetes_model.predict_proba([features])[0]
            prediction_text = "Diabetes Risk: High" if diabetes_model.predict([features])[0] == 1 else "Diabetes Risk: Low"
            
            return jsonify({
                'prediction_text': prediction_text,
                'probability': f'Risk Probability: {prediction_proba[1]:.2%}'
            })

        elif disease_type == 'heart_disease':
            # Extract features for heart disease prediction
            # The order must match the training data
            features = [
                data['hd_age'], data['hd_sex'], data['hd_cp'], data['hd_trestbps'],
                data['hd_chol'], data['hd_fbs'], data['hd_restecg'], data['hd_thalach'],
                data['hd_exang'], data['hd_oldpeak'], data['hd_slope'], data['hd_ca'],
                data['hd_thal']
            ]

            # Make the prediction
            prediction_proba = heart_disease_model.predict_proba([features])[0]
            prediction_text = "Heart Disease Risk: High" if heart_disease_model.predict([features])[0] == 1 else "Heart Disease Risk: Low"
            
            return jsonify({
                'prediction_text': prediction_text,
                'probability': f'Risk Probability: {prediction_proba[1]:.2%}'
            })

        else:
            return jsonify({'error': 'Invalid disease_type provided.'}), 400

    except KeyError as e:
        return jsonify({'error': f'Missing data for feature: {e}. Please check your form input.'}), 400
    except Exception as e:
        return jsonify({'error': f'An error occurred during prediction: {str(e)}'}), 500

@app.route('/generate_insight', methods=['POST'])
def generate_insight():
    """
    Generates AI-powered health insights using the Gemini API.
    """
    data = request.get_json(force=True)
    prompt = data.get('prompt')

    if not prompt:
        return jsonify({'error': 'No prompt provided.'}), 400

    try:
        model = genai.GenerativeModel('gemini-2.5-flash-preview-05-20')
        response = model.generate_content(prompt, generation_config=generation_config)
        
        insight_text = response.text
        return jsonify({'insight': insight_text})

    except Exception as e:
        print(f"Error generating insight: {e}")
        return jsonify({'error': 'Failed to generate insight. Please try again.'}), 500

if __name__ == '__main__':
    # Using '0.0.0.0' makes the server accessible externally for deployment
    app.run(host='0.0.0.0', port=5000, debug=True)
