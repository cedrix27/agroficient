"""
Training script (Colab/local) for baseline seasonal category model.
Output: backend/models/seasonal_model.joblib

Usage:
  python backend/ml/train_onset_seasonal.py --input backend/ml/training_dataset.csv --output backend/models/seasonal_model.joblib
"""

import argparse
import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import OneHotEncoder


def build_pipeline():
    num_features = [
        "lat",
        "lon",
        "anomaly_pct",
        "current_mean_daily_mm",
        "historical_mean_daily_mm",
    ]
    cat_features = ["season_code"]

    pre = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("impute", SimpleImputer(strategy="median"))]), num_features),
            ("cat", Pipeline([("impute", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), cat_features),
        ]
    )

    clf = RandomForestClassifier(n_estimators=300, random_state=42, class_weight="balanced")

    return Pipeline([("pre", pre), ("clf", clf)])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    df = pd.read_csv(args.input)
    required = {
        "lat",
        "lon",
        "season_code",
        "anomaly_pct",
        "current_mean_daily_mm",
        "historical_mean_daily_mm",
        "target_category",
    }
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    X = df[["lat", "lon", "season_code", "anomaly_pct", "current_mean_daily_mm", "historical_mean_daily_mm"]]
    y = df["target_category"]

    pipe = build_pipeline()
    pipe.fit(X, y)

    joblib.dump(pipe, args.output)
    print(f"Saved model -> {args.output}")


if __name__ == "__main__":
    main()
