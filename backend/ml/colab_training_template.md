# Colab Training Template

1. Upload `training_dataset.csv` with columns:
- `lat`, `lon`, `season_code`, `anomaly_pct`, `current_mean_daily_mm`, `historical_mean_daily_mm`, `target_category`

2. In Colab:
```python
!pip install scikit-learn pandas joblib
!python backend/ml/train_onset_seasonal.py --input backend/ml/training_dataset.csv --output backend/models/seasonal_model.joblib
```

3. Download model artifact `seasonal_model.joblib` and place in:
- `backend/models/seasonal_model.joblib`
