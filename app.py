import os
from flask import Flask, request, jsonify, render_template
import joblib
import numpy as np
import pandas as pd
from flask_cors import CORS # Keep CORS for local development or if still needed on Render

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app) # Enable CORS for all origins, adjust if needed for production

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
    # It's crucial to ensure these models are actually loaded.
    # For a production app, you might want to exit if models can't be loaded.

# --- Frontend Route for Main App ---
@app.route('/')
def home():
    """
    Renders the main page of the Health Risk Predictor App.
    """
    return render_template('index.html')

# --- Prediction API Endpoint (Unified for both diseases) ---
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
            if numerical_cols_to_scale: # Only scale if there are numerical columns to scale
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
                # Note: Assuming incoming data keys match expected column names after processing, e.g., 'hd_age' maps to 'age' in model's features
                # The frontend sends 'hd_age', 'hd_sex' etc., which will be processed to 'age', 'sex_1'
                if f"hd_{feature_name}" in data and feature_name in input_df.columns:
                    input_df[feature_name] = float(data[f"hd_{feature_name}"])
            
            # Handle categorical features for heart disease (e.g., sex, cp, fbs, restecg, exang, slope, ca, thal)
            hd_categorical_inputs = {
                'hd_sex': {0: 'sex_0', 1: 'sex_1'},
                'hd_cp': {0: 'cp_0', 1: 'cp_1', 2: 'cp_2', 3: 'cp_3'},
                'hd_fbs': {0: 'fbs_0', 1: 'fbs_1'},
                'hd_restecg': {0: 'restecg_0', 1: 'restecg_1', 2: 'restecg_2'},
                'hd_exang': {0: 'exang_0', 1: 'exang_1'},
                'hd_slope': {0: 'slope_0', 1: 'slope_1', 2: 'slope_2'},
                'hd_ca': {0: 'ca_0', 1: 'ca_1', 2: 'ca_2', 3: 'ca_3', 4: 'ca_4'},
                'hd_thal': {0: 'thal_0', 1: 'thal_1', 2: 'thal_2', 3: 'thal_3'}
            }

            for feature_name_with_prefix, value_map in hd_categorical_inputs.items():
                if feature_name_with_prefix in data and int(data[feature_name_with_prefix]) in value_map:
                    col_name_in_model = value_map[int(data[feature_name_with_prefix])]
                    if col_name_in_model in input_df.columns:
                        input_df[col_name_in_model] = 1

            # Ensure all columns are in the correct order for the model
            input_df = input_df[heart_feature_columns]

            # Scale numerical features for heart disease model
            heart_numerical_cols_to_scale = [col for col in hd_numerical_features if col.replace('hd_', '') in heart_feature_columns]
            if heart_numerical_cols_to_scale: # Only scale if there are numerical columns to scale
                # The scaler expects column names as they were during training ('age', 'trestbps', etc.)
                # not with the 'hd_' prefix.
                cols_for_scaler = [col.replace('hd_', '') for col in heart_numerical_cols_to_scale]
                input_df[cols_for_scaler] = heart_scaler.transform(input_df[cols_for_scaler])

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


if __name__ == '__main__':
    # Render will set the PORT environment variable.
    # Set default to 10000 based on Render logs for consistent behavior.
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port, debug=True)