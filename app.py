import os
from flask import Flask, render_template, request, jsonify
import joblib
import numpy as np
import pandas as pd

app = Flask(__name__)

# --- Define Paths to Model Artifacts ---
# Diabetes Model Artifacts
DIABETES_MODEL_PATH = 'model_artifacts/diabetes_rf_model_smote.joblib'
DIABETES_SCALER_PATH = 'model_artifacts/diabetes_scaler.joblib'
DIABETES_FEATURE_COLUMNS_PATH = 'model_artifacts/feature_columns.joblib'

# Heart Disease Model Artifacts
HEART_MODEL_PATH = 'model_artifacts/heart_disease_model.joblib'
HEART_SCALER_PATH = 'model_artifacts/heart_disease_scaler.joblib'
HEART_FEATURE_COLUMNS_PATH = 'model_artifacts/heart_disease_feature_columns.joblib'

# --- Load Models, Scalers, and Feature Columns ---
# Initialize all to None
diabetes_model = None
diabetes_scaler = None
diabetes_feature_columns = None

heart_model = None
heart_scaler = None
heart_feature_columns = None

# Load Diabetes Model
try:
    if os.path.exists(DIABETES_MODEL_PATH) and os.path.exists(DIABETES_SCALER_PATH) and os.path.exists(DIABETES_FEATURE_COLUMNS_PATH):
        diabetes_model = joblib.load(DIABETES_MODEL_PATH)
        diabetes_scaler = joblib.load(DIABETES_SCALER_PATH)
        diabetes_feature_columns = joblib.load(DIABETES_FEATURE_COLUMNS_PATH)
        print("Diabetes Model, Scaler, and Feature Columns loaded successfully.")
    else:
        print(f"Warning: Diabetes model artifacts not found. Expected at: {DIABETES_MODEL_PATH}, {DIABETES_SCALER_PATH}, {DIABETES_FEATURE_COLUMNS_PATH}")
except Exception as e:
    print(f"Error loading Diabetes model artifacts: {e}")

# Load Heart Disease Model
try:
    if os.path.exists(HEART_MODEL_PATH) and os.path.exists(HEART_SCALER_PATH) and os.path.exists(HEART_FEATURE_COLUMNS_PATH):
        heart_model = joblib.load(HEART_MODEL_PATH)
        heart_scaler = joblib.load(HEART_SCALER_PATH)
        heart_feature_columns = joblib.load(HEART_FEATURE_COLUMNS_PATH)
        print("Heart Disease Model, Scaler, and Feature Columns loaded successfully.")
    else:
        print(f"Warning: Heart Disease model artifacts not found. Expected at: {HEART_MODEL_PATH}, {HEART_SCALER_PATH}, {HEART_FEATURE_COLUMNS_PATH}")
except Exception as e:
    print(f"Error loading Heart Disease model artifacts: {e}")

# --- Home Route ---
@app.route('/')
def home():
    """
    Renders the main page of the Health Risk Predictor App.
    """
    return render_template('index.html')

# --- Unified Prediction Route ---
@app.route('/predict', methods=['POST']) # Changed route to /predict for generality
def predict():
    """
    Handles prediction requests for both Diabetes and Heart Disease.
    It takes user input, preprocesses it based on the selected disease,
    makes a prediction using the appropriate loaded model,
    and returns the result as a JSON response.
    """
    data = request.get_json(force=True)
    disease_type = data.get('disease_type') # Expecting 'diabetes' or 'heart_disease' from frontend

    if disease_type == 'diabetes':
        if diabetes_model is None or diabetes_scaler is None or diabetes_feature_columns is None:
            return jsonify({"error": "Diabetes model artifacts not loaded. Cannot make prediction."}), 500
        
        # Define expected features for Diabetes (must match model_artifacts/feature_columns.joblib)
        # These are typically in the order expected by the model.
        # Ensure that the feature_columns list loaded from joblib is used for consistency.
        current_model = diabetes_model
        current_scaler = diabetes_scaler
        expected_features = diabetes_feature_columns

        # Extracting relevant data for Diabetes
        input_data = {
            'gender': data.get('gender'),
            'age': float(data.get('age')),
            'hypertension': int(data.get('hypertension')),
            'heart_disease': int(data.get('heart_disease')),
            'smoking_history': data.get('smoking_history'),
            'bmi': float(data.get('bmi')),
            'HbA1c_level': float(data.get('HbA1c_level')),
            'blood_glucose_level': float(data.get('blood_glucose_level'))
        }

        # Create a DataFrame initialized with zeros for all expected features
        input_df = pd.DataFrame(0, index=[0], columns=expected_features)

        # Populate numerical features
        numerical_features = ['age', 'bmi', 'HbA1c_level', 'blood_glucose_level']
        for feature in numerical_features:
            if feature in input_data and feature in input_df.columns:
                input_df[feature] = input_data[feature]

        # Populate binary features
        binary_features = ['hypertension', 'heart_disease']
        for feature in binary_features:
            if feature in input_data and feature in input_df.columns:
                input_df[feature] = input_data[feature]

        # Populate categorical features using one-hot encoding (gender, smoking_history)
        if input_data.get('gender'):
            gender_col = f"gender_{input_data['gender']}"
            if gender_col in input_df.columns:
                input_df[gender_col] = 1

        if input_data.get('smoking_history'):
            smoking_col = f"smoking_history_{input_data['smoking_history']}"
            if smoking_col in input_df.columns:
                input_df[smoking_col] = 1
        
        # Ensure all columns are in the correct order for the model
        input_df = input_df[expected_features]

        # Scale numerical features for Diabetes
        # Identify numerical columns within the final expected_features to apply scaling
        diabetes_numerical_cols_to_scale = [col for col in ['age', 'bmi', 'HbA1c_level', 'blood_glucose_level'] if col in expected_features]
        input_df[diabetes_numerical_cols_to_scale] = current_scaler.transform(input_df[diabetes_numerical_cols_to_scale])

        # Make prediction
        prediction_proba = current_model.predict_proba(input_df)[:, 1][0]
        prediction_class = (prediction_proba >= 0.5).astype(int)

        prediction_text = "No Diabetes" if prediction_class == 0 else "Diabetes"
        
        return jsonify({
            "prediction_text": f"Prediction: {prediction_text}",
            "probability": f"Probability: {prediction_proba:.2%}"
        })

    elif disease_type == 'heart_disease':
        if heart_model is None or heart_scaler is None or heart_feature_columns is None:
            return jsonify({"error": "Heart Disease model artifacts not loaded. Cannot make prediction."}), 500
        
        current_model = heart_model
        current_scaler = heart_scaler
        expected_features = heart_feature_columns

        # Define expected features for Heart Disease (from your training script)
        # Age, Sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal
        # Note: 'sex', 'cp', 'fbs', 'restecg', 'exang', 'slope', 'ca', 'thal' will be one-hot encoded
        input_data = {
            'age': float(data.get('hd_age')),
            'sex': int(data.get('hd_sex')),
            'cp': int(data.get('hd_cp')),
            'trestbps': float(data.get('hd_trestbps')),
            'chol': float(data.get('hd_chol')),
            'fbs': int(data.get('hd_fbs')),
            'restecg': int(data.get('hd_restecg')),
            'thalach': float(data.get('hd_thalach')),
            'exang': int(data.get('hd_exang')),
            'oldpeak': float(data.get('hd_oldpeak')),
            'slope': int(data.get('hd_slope')),
            'ca': int(data.get('hd_ca')),
            'thal': int(data.get('hd_thal'))
        }

        # Create a DataFrame initialized with zeros for all expected features for Heart Disease
        input_df = pd.DataFrame(0, index=[0], columns=expected_features)

        # Populate numerical features for Heart Disease
        # These are features that are NOT one-hot encoded, and are scaled
        numerical_features_hd = ['age', 'trestbps', 'chol', 'thalach', 'oldpeak']
        for feature in numerical_features_hd:
            if feature in input_data and feature in input_df.columns:
                input_df[feature] = input_data[feature]
        
        # Populate categorical features using one-hot encoding for Heart Disease
        # Map values to their one-hot encoded column names
        categorical_features_hd = {
            'sex': {0: 'sex_0', 1: 'sex_1'},
            'cp': {0: 'cp_0', 1: 'cp_1', 2: 'cp_2', 3: 'cp_3'},
            'fbs': {0: 'fbs_0', 1: 'fbs_1'},
            'restecg': {0: 'restecg_0', 1: 'restecg_1', 2: 'restecg_2'},
            'exang': {0: 'exang_0', 1: 'exang_1'},
            'slope': {0: 'slope_0', 1: 'slope_1', 2: 'slope_2'},
            'ca': {0: 'ca_0', 1: 'ca_1', 2: 'ca_2', 3: 'ca_3', 4: 'ca_4'}, # ca can be 0-4
            'thal': {0: 'thal_0', 1: 'thal_1', 2: 'thal_2', 3: 'thal_3'} # thal can have specific values, check dataset
        }

        for feature_name, value_map in categorical_features_hd.items():
            input_value = input_data.get(feature_name)
            if input_value is not None and input_value in value_map:
                encoded_col_name = value_map[input_value]
                if encoded_col_name in input_df.columns:
                    input_df[encoded_col_name] = 1

        # Ensure all columns are in the correct order for the model
        input_df = input_df[expected_features]

        # Scale numerical features for Heart Disease
        heart_numerical_cols_to_scale = [col for col in numerical_features_hd if col in expected_features]
        input_df[heart_numerical_cols_to_scale] = current_scaler.transform(input_df[heart_numerical_cols_to_scale])

        # Make prediction
        prediction_proba = current_model.predict_proba(input_df)[:, 1][0]
        prediction_class = (prediction_proba >= 0.5).astype(int)

        prediction_text = "No Heart Disease" if prediction_class == 0 else "Heart Disease"
        
        return jsonify({
            "prediction_text": f"Prediction: {prediction_text}",
            "probability": f"Probability: {prediction_proba:.2%}"
        })

    else:
        return jsonify({"error": "Invalid disease type selected."}), 400

# --- Run the App (for Local Testing) ---
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

