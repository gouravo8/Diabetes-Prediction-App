import os
from flask import Flask, request, jsonify, render_template
import joblib
import numpy as np
import pandas as pd
from flask_cors import CORS
import requests # Import the requests library for making HTTP calls

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

# Define paths to model artifacts
DIABETES_MODEL_PATH = 'model_artifacts/diabetes_rf_model_smote.joblib'
DIABETES_SCALER_PATH = 'model_artifacts/diabetes_scaler.joblib'
DIABETES_FEATURE_COLUMNS_PATH = 'model_artifacts/feature_columns.joblib'

HEART_MODEL_PATH = 'model_artifacts/heart_disease_model.joblib'
HEART_SCALER_PATH = 'model_artifacts/heart_disease_scaler.joblib'
HEART_FEATURE_COLUMNS_PATH = 'model_artifacts/heart_disease_feature_columns.joblib'

# Load the models, scalers, and feature columns
diabetes_model = None
diabetes_scaler = None
diabetes_feature_columns = None

heart_model = None
heart_scaler = None
heart_feature_columns = None

try:
    if os.path.exists(DIABETES_MODEL_PATH) and os.path.exists(DIABETES_SCALER_PATH) and os.path.exists(DIABETES_FEATURE_COLUMNS_PATH):
        diabetes_model = joblib.load(DIABETES_MODEL_PATH)
        diabetes_scaler = joblib.load(DIABETES_SCALER_PATH)
        diabetes_feature_columns = joblib.load(DIABETES_FEATURE_COLUMNS_PATH)
        print("Diabetes Model, Scaler, and Feature Columns loaded successfully.")
    else:
        print(f"Warning: Diabetes model artifacts not found. Expected at: {DIABETES_MODEL_PATH}, {DIABETES_SCALER_PATH}, {DIABETES_FEATURE_COLUMNS_PATH}")

    if os.path.exists(HEART_MODEL_PATH) and os.path.exists(HEART_SCALER_PATH) and os.path.exists(HEART_FEATURE_COLUMNS_PATH):
        heart_model = joblib.load(HEART_MODEL_PATH)
        heart_scaler = joblib.load(HEART_SCALER_PATH)
        heart_feature_columns = joblib.load(HEART_FEATURE_COLUMNS_PATH)
        print("Heart Disease Model, Scaler, and Feature Columns loaded successfully.")
    else:
        print(f"Warning: Heart Disease model artifacts not found. Expected at: {HEART_MODEL_PATH}, {HEART_SCALER_PATH}, {HEART_FEATURE_COLUMNS_PATH}")

except Exception as e:
    print(f"Error loading model artifacts: {e}")


# --- Frontend Route for Main App ---
@app.route('/')
def home():
    """
    Renders the main page of the Health Risk Predictor App.
    """
    return render_template('index.html')

# --- Login Coming Soon Route ---
@app.route('/login_coming_soon')
def login_coming_soon():
    """
    Renders the login coming soon page.
    """
    return render_template('login_coming_soon.html')


# --- Prediction API Endpoint ---
@app.route('/predict', methods=['POST'])
def predict():
    """
    Handles the prediction request from the web form for either Diabetes or Heart Disease.
    It takes user input, preprocesses it, makes a prediction using the loaded model,
    and returns the result as a JSON response.
    """
    try:
        data = request.get_json(force=True)
        disease_type = data.get('disease_type')

        if disease_type == 'diabetes':
            if diabetes_model is None or diabetes_scaler is None or diabetes_feature_columns is None:
                return jsonify({"error": "Diabetes model artifacts not loaded. Cannot make prediction."}), 500

            # Prepare input data for the diabetes model
            input_df = pd.DataFrame(0, index=[0], columns=diabetes_feature_columns)

            # Populate with received data
            numerical_features = ['age', 'bmi', 'HbA1c_level', 'blood_glucose_level']
            for feature in numerical_features:
                if feature in data:
                    input_df[feature] = float(data[feature])

            binary_features = ['hypertension', 'heart_disease']
            for feature in binary_features:
                if feature in data:
                    input_df[feature] = int(data[feature])

            gender_map = {
                'Female': 'gender_Female',
                'Male': 'gender_Male',
                'Other': 'gender_Other'
            }
            smoking_history_map = {
                'never': 'smoking_history_never',
                'No Info': 'smoking_history_No Info',
                'current': 'smoking_history_current',
                'ever': 'smoking_history_ever',
                'former': 'smoking_history_former',
                'not current': 'smoking_history_not current'
            }

            if data.get('gender') and data['gender'] in gender_map and gender_map[data['gender']] in input_df.columns:
                input_df[gender_map[data['gender']]] = 1

            if data.get('smoking_history') and data['smoking_history'] in smoking_history_map and smoking_history_map[data['smoking_history']] in input_df.columns:
                input_df[smoking_history_map[data['smoking_history']]] = 1
            
            # Ensure the order of columns matches the training data used by the scaler and model
            input_df = input_df[diabetes_feature_columns]

            # Scale the numerical features
            numerical_cols_to_scale = [col for col in numerical_features if col in diabetes_feature_columns]
            if numerical_cols_to_scale:
                input_df[numerical_cols_to_scale] = diabetes_scaler.transform(input_df[numerical_cols_to_scale])

            prediction_proba = diabetes_model.predict_proba(input_df)[:, 1][0]
            prediction_class = (prediction_proba >= 0.5).astype(int)

            prediction_text = "No Diabetes"
            if prediction_class == 1:
                prediction_text = "Diabetes"

            return jsonify({
                "prediction_text": f"Prediction: {prediction_text}",
                "probability": f"Probability of Diabetes: {prediction_proba:.2%}"
            })

        elif disease_type == 'heart_disease':
            if heart_model is None or heart_scaler is None or heart_feature_columns is None:
                return jsonify({"error": "Heart Disease model artifacts not loaded. Cannot make prediction."}), 500

            # Prepare input data for the heart disease model
            input_df = pd.DataFrame(0, index=[0], columns=heart_feature_columns)

            # Populate with received data for heart disease
            hd_numerical_features = ['age', 'trestbps', 'chol', 'thalach', 'oldpeak']
            for feature_name in hd_numerical_features:
                if f"hd_{feature_name}" in data and feature_name in input_df.columns:
                    input_df[feature_name] = float(data[f"hd_{feature_name}"])
            
            # Handle categorical features for heart disease (e.g., sex, cp, fbs, restecg, exang, slope, ca, thal)
            hd_categorical_inputs = {
                'sex': {0: 'sex_0', 1: 'sex_1'},
                'cp': {0: 'cp_0', 1: 'cp_1', 2: 'cp_2', 3: 'cp_3'},
                'fbs': {0: 'fbs_0', 1: 'fbs_1'},
                'restecg': {0: 'restecg_0', 1: 'restecg_1', 2: 'restecg_2'},
                'exang': {0: 'exang_0', 1: 'exang_1'},
                'slope': {0: 'slope_0', 1: 'slope_1', 2: 'slope_2'},
                'ca': {0: 'ca_0', 1: 'ca_1', 2: 'ca_2', 3: 'ca_3', 4: 'ca_4'},
                'thal': {0: 'thal_0', 1: 'thal_1', 2: 'thal_2', 3: 'thal_3'}
            }

            for feature_name, value_map in hd_categorical_inputs.items():
                input_key_with_prefix = f"hd_{feature_name}"
                if input_key_with_prefix in data and int(data[input_key_with_prefix]) in value_map:
                    col_name = value_map[int(data[input_key_with_prefix])]
                    if col_name in input_df.columns:
                        input_df[col_name] = 1

            # Ensure all columns are in the correct order for the model
            input_df = input_df[heart_feature_columns]

            # Scale numerical features for heart disease model
            heart_numerical_cols_to_scale = [col for col in hd_numerical_features if col in heart_feature_columns]
            if heart_numerical_cols_to_scale:
                input_df[heart_numerical_cols_to_scale] = heart_scaler.transform(input_df[heart_numerical_cols_to_scale])

            prediction_proba = heart_model.predict_proba(input_df)[:, 1][0]
            prediction_class = (prediction_proba >= 0.5).astype(int)

            prediction_text = "No Heart Disease"
            if prediction_class == 1:
                prediction_text = "Heart Disease"

            return jsonify({
                "prediction_text": f"Prediction: {prediction_text}",
                "probability": f"Probability of Heart Disease: {prediction_proba:.2%}"
            })

        else:
            return jsonify({"error": "Unknown disease type."}), 400

    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({"error": f"An unexpected error occurred during prediction: {str(e)}."}), 400


# --- New: Gemini API Proxy Endpoint ---
@app.route('/generate_insight', methods=['POST'])
def generate_insight():
    """
    Proxies requests to the Gemini API to generate health insights.
    The Gemini API key is loaded from environment variables for security.
    """
    gemini_api_key = os.environ.get("GEMINI_API_KEY") # Get API key from environment variable

    if not gemini_api_key:
        print("GEMINI_API_KEY environment variable not set.")
        return jsonify({"error": "Server configuration error: Gemini API Key missing."}), 500

    try:
        data = request.get_json(force=True)
        user_prompt = data.get('prompt')

        if not user_prompt:
            return jsonify({"error": "No prompt provided for health insight."}), 400

        # Construct the payload for the Gemini API
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}]
                }
            ],
            # Optional: Add generationConfig if you want structured output or specific settings
            # "generationConfig": {
            #     "responseMimeType": "application/json",
            #     "responseSchema": { ... }
            # }
        }

        # Make the API call to Gemini
        gemini_api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_api_key}"
        
        response = requests.post(gemini_api_url, json=payload, headers={'Content-Type': 'application/json'})
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

        gemini_result = response.json()

        if gemini_result.get('candidates') and gemini_result['candidates'][0].get('content') and gemini_result['candidates'][0]['content'].get('parts'):
            generated_text = gemini_result['candidates'][0]['content']['parts'][0]['text']
            return jsonify({"insight": generated_text})
        else:
            print(f"Unexpected Gemini response structure: {gemini_result}")
            return jsonify({"error": "Failed to get insight from AI. Unexpected response format."}), 500

    except requests.exceptions.RequestException as e:
        print(f"Error making request to Gemini API: {e}")
        return jsonify({"error": f"Error contacting AI service: {str(e)}."}), 500
    except Exception as e:
        print(f"An unexpected error occurred in generate_insight: {e}")
        return jsonify({"error": f"An unexpected server error occurred: {str(e)}."}), 500


if __name__ == '__main__':
    # Render will set the PORT environment variable
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
