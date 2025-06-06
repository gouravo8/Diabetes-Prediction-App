import os
from flask import Flask, render_template, request, jsonify
import joblib
import numpy as np
import pandas as pd

app = Flask(__name__)

# Define paths to model artifacts
# Ensure these paths are correct relative to your app.py in the Render environment
MODEL_PATH = 'model_artifacts/diabetes_rf_model_smote.joblib'
SCALER_PATH = 'model_artifacts/diabetes_scaler.joblib'
FEATURE_COLUMNS_PATH = 'model_artifacts/feature_columns.joblib' # Path for feature columns list

# Load the model, scaler, and feature columns
model = None
scaler = None
feature_columns = None

try:
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH) and os.path.exists(FEATURE_COLUMNS_PATH):
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        feature_columns = joblib.load(FEATURE_COLUMNS_PATH)
        print("Model, Scaler, and Feature Columns loaded successfully for API.")
    else:
        print(f"Error: One or more model artifact files not found at: {MODEL_PATH}, {SCALER_PATH}, {FEATURE_COLUMNS_PATH}")
        # Optionally, raise an exception or handle this more gracefully for production
except Exception as e:
    print(f"Error loading model artifacts: {e}")
    # Handle the error, maybe exit if critical or disable prediction until fixed

@app.route('/')
def home():
    """
    Renders the main page of the Diabetes Prediction App.
    """
    return render_template('index.html')

@app.route('/predict_diabetes', methods=['POST'])
def predict_diabetes():
    """
    Handles the prediction request from the web form.
    It takes user input, preprocesses it, makes a prediction using the loaded model,
    and returns the result as a JSON response.
    """
    if model is None or scaler is None or feature_columns is None:
        return jsonify({"error": "Model artifacts not loaded. Cannot make prediction."}), 500

    try:
        # Get data from the POST request (JSON format from JavaScript)
        data = request.get_json(force=True)

        # Prepare input data for the model
        # Create a DataFrame from the input data, ensuring all feature columns are present
        # Initialize with zeros for all feature columns
        input_df = pd.DataFrame(0, index=[0], columns=feature_columns)

        # Populate with received data
        # Handle numerical inputs
        numerical_features = ['age', 'bmi', 'HbA1c_level', 'blood_glucose_level']
        for feature in numerical_features:
            if feature in data:
                input_df[feature] = float(data[feature])

        # Handle binary inputs (hypertension, heart_disease)
        binary_features = ['hypertension', 'heart_disease']
        for feature in binary_features:
            if feature in data:
                input_df[feature] = int(data[feature])

        # Handle categorical inputs (gender, smoking_history) using one-hot encoding
        # Create column names for gender and smoking history categories based on training
        # Ensure 'Other' is handled if it exists in data but not in training features
        gender_map = {
            'Female': 'gender_Female',
            'Male': 'gender_Male',
            'Other': 'gender_Other' # Assuming 'gender_Other' exists as a feature if applicable
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
        # Reindex input_df to match the order of feature_columns
        input_df = input_df[feature_columns]

        # Scale the numerical features
        # Assuming only numerical columns are scaled. Identify them from feature_columns.
        numerical_cols_to_scale = [col for col in numerical_features if col in feature_columns]
        input_df[numerical_cols_to_scale] = scaler.transform(input_df[numerical_cols_to_scale])

        # Make prediction
        prediction_proba = model.predict_proba(input_df)[:, 1][0] # Probability of being diabetes
        prediction_class = (prediction_proba >= 0.5).astype(int) # Class 0 or 1

        prediction_text = "No Diabetes"
        if prediction_class == 1:
            prediction_text = "Diabetes"

        # Return prediction as JSON
        return jsonify({
            "prediction_text": f"Prediction: {prediction_text}",
            "probability": f"Probability of Diabetes: {prediction_proba:.2%}"
        })

    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({"error": f"An unexpected error occurred during prediction: {str(e)}."}), 400

if __name__ == '__main__':
    # When running locally, set host to '0.0.0.0' to be accessible over network
    # For Render, the PORT is set by the environment, gunicorn handles it.
    # So, when deploying to Render, gunicorn app:app is used, which does not run this if block.
    # This block is only for local testing.
    port = int(os.environ.get("PORT", 5000)) # Use PORT from environment or default to 5000
    app.run(host='0.0.0.0', port=port, debug=True)

